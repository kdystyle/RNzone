// ============================
// KIS (한국투자증권) Open API 클라이언트
// - OAuth 토큰 자동 발급/갱신
// - 종목 현재가, 일봉 캔들, 기본 정보 조회
// ============================

const BASE_URL_REAL = 'https://openapi.koreainvestment.com:9443';
const BASE_URL_MOCK = 'https://openapivts.koreainvestment.com:29443';

let accessToken = '';
let tokenExpiry = 0;

/** 환경변수에서 설정 읽기 */
function getConfig() {
    const appKey = process.env.KIS_APP_KEY || '';
    const appSecret = process.env.KIS_APP_SECRET || '';
    const isMock = process.env.KIS_IS_MOCK === 'true';
    const baseUrl = isMock ? BASE_URL_MOCK : BASE_URL_REAL;
    return { appKey, appSecret, baseUrl, isMock };
}

/** API 키가 설정되어 있는지 확인 */
export function isConfigured() {
    const { appKey, appSecret } = getConfig();
    return appKey.length > 10 && appSecret.length > 10;
}

/**
 * OAuth 접근 토큰 발급
 * 왜 서버에서 하는가? → 브라우저에서 직접 하면 CORS 차단 +
 *   App Secret이 노출되므로 반드시 백엔드에서 처리
 * @param {boolean} forceRefresh - 강제 재발급 여부
 */
async function getAccessToken(forceRefresh = false) {
    // 토큰이 아직 유효하면 재사용 (강제 갱신이 아닐 때만)
    if (!forceRefresh && accessToken && Date.now() < tokenExpiry) {
        return accessToken;
    }

    const { appKey, appSecret, baseUrl } = getConfig();

    try {
        console.log(`[KIS] 토큰 발급 요청 중...${forceRefresh ? ' (강제 재발급)' : ''}`);
        const res = await fetch(`${baseUrl}/oauth2/tokenP`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({
                grant_type: 'client_credentials',
                appkey: appKey,
                appsecret: appSecret,
            }),
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`KIS 토큰 발급 실패: ${res.status} ${text}`);
        }

        const data = await res.json();
        accessToken = data.access_token;
        // 토큰 유효기간: 보통 24시간, 여유를 두고 23시간으로 설정
        tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
        console.log('[KIS] 토큰 발급 완료');
        return accessToken;
    } catch (error) {
        console.error('[KIS] 토큰 발급 과정 중 에러 발생:', error.message);
        throw error;
    }
}


/** KIS API 공통 요청 헤더 생성 */
async function makeHeaders(trId) {
    const token = await getAccessToken();
    const { appKey, appSecret } = getConfig();

    return {
        'Content-Type': 'application/json; charset=utf-8',
        authorization: `Bearer ${token}`,
        appkey: appKey,
        appsecret: appSecret,
        tr_id: trId,
        custtype: 'P', // 개인
    };
}

/**
 * 401 인증 에러 발생 시 토큰을 재발급받고 재시도하는 공통 래퍼
 */
async function requestWithRetry(url, trId, searchParams = {}) {
    const { baseUrl } = getConfig();
    const fullUrl = new URL(url.startsWith('http') ? url : `${baseUrl}${url}`);

    Object.entries(searchParams).forEach(([key, val]) => {
        if (val !== undefined && val !== null) fullUrl.searchParams.set(key, val);
    });

    const callApi = async () => {
        const headers = await makeHeaders(trId);
        return fetch(fullUrl.toString(), { headers });
    };

    let res = await callApi();

    // 401 Unauthorized 발생 시 토큰 강제 갱신 후 1회 재시도
    if (res.status === 401) {
        console.warn(`[KIS] 401 Unauthorized 발생. 토큰 재발급 후 재시도 합니다. (${trId})`);
        await getAccessToken(true); // 강제 갱신
        res = await callApi();
    }

    return res;
}

/**
 * 주식 현재가 조회
 * 반환: { price, marketCap, sector, name, volume, tradingValue }
 */
export async function getCurrentPrice(stockCode) {
    const res = await requestWithRetry(
        '/uapi/domestic-stock/v1/quotations/inquire-price',
        'FHKST01010100',
        {
            FID_COND_MRKT_DIV_CODE: 'J',
            FID_INPUT_ISCD: stockCode
        }
    );

    if (!res.ok) {
        const errorText = await res.text();
        console.error(`[KIS] 현재가 조회 실패: ${res.status}`, errorText);
        throw new Error(`현재가 조회 실패: ${res.status}`);
    }

    const resJson = await res.json();
    console.log(`[KIS] ${stockCode} 조회 결과:`, resJson.rt_cd === '0' ? '성공' : '실패(' + resJson.msg1 + ')');
    const { output } = resJson;

    return {
        price: Number(output.stck_prpr),          // 현재가
        change: Number(output.prdy_vrss),          // 전일 대비
        changeRate: Number(output.prdy_ctrt),      // 전일 대비율(%)
        volume: Number(output.acml_vol),           // 누적 거래량
        tradingValue: Math.round(Number(output.acml_tr_pbmn) / 100000000), // 거래대금(억)
        marketCap: Math.round(Number(output.hts_avls) / 10000), // 시총(조 원 단위 변환)
        high52w: Number(output.stck_dryy_hgpr),    // 52주 최고
        low52w: Number(output.stck_dryy_lwpr),     // 52주 최저
        per: Number(output.per),
        pbr: Number(output.pbr),
    };
}

/**
 * 일봉 캔들 데이터 조회 (최대 100개)
 * 반환: CandleData[] (프론트엔드 타입과 호환)
 */
export async function getDailyCandles(stockCode, startDate, endDate) {
    const res = await requestWithRetry(
        '/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice',
        'FHKST03010100',
        {
            FID_COND_MRKT_DIV_CODE: 'J',
            FID_INPUT_ISCD: stockCode,
            FID_INPUT_DATE_1: startDate,
            FID_INPUT_DATE_2: endDate,
            FID_PERIOD_DIV_CODE: 'D',
            FID_ORG_ADJ_PRC: '0'
        }
    );

    if (!res.ok) throw new Error(`일봉 조회 실패: ${res.status}`);

    const { output2 } = await res.json();
    if (!output2 || !Array.isArray(output2)) return [];

    return output2
        .filter((d) => d.stck_bsop_date)
        .map((d) => ({
            time: `${d.stck_bsop_date.slice(0, 4)}-${d.stck_bsop_date.slice(4, 6)}-${d.stck_bsop_date.slice(6, 8)}`,
            open: Number(d.stck_oprc),
            high: Number(d.stck_hgpr),
            low: Number(d.stck_lwpr),
            close: Number(d.stck_clpr),
            tradingValue: Math.round(Number(d.acml_tr_pbmn) / 100000000),
        }))
        .reverse();
}

/**
 * 종목 기본 정보 조회 (업종 포함)
 */
export async function getStockInfo(stockCode) {
    const res = await requestWithRetry(
        '/uapi/domestic-stock/v1/quotations/search-stock-info',
        'CTPF1002R',
        {
            PRDT_TYPE_CD: '300',
            PDNO: stockCode
        }
    );

    if (!res.ok) throw new Error(`종목 정보 조회 실패: ${res.status}`);

    const { output } = await res.json();
    return {
        code: stockCode,
        name: output.prdt_abrv_name || '',
        sector: output.std_idst_clsf_cd_name || '',
        listingDate: output.scts_mket_lstg_dt || '',
    };
}

/**
 * 당일 거래대금 상위 종목 조회 (주도주 추출)
 * TR: FHKST01013100
 */
export async function getMarketLeaders() {
    const res = await requestWithRetry(
        '/uapi/domestic-stock/v1/quotations/volume-rank',
        'FHKST01013100',
        {
            FID_COND_MRKT_DIV_CODE: 'J',
            FID_COND_SCR_DIV_CODE: '20131',
            FID_INPUT_ISCD: '0000',
            FID_DIV_CLS_CODE: '0',
            FID_BLNG_CLS_CODE: '0',
            FID_TRGT_CLS_CODE: '0',
            FID_TRGT_EXLS_CLS_CODE: '0',
            FID_INPUT_PRICE_1: '',
            FID_INPUT_PRICE_2: '',
            FID_VOL_CNT: '',
            FID_INPUT_DATE_1: ''
        }
    );

    if (!res.ok) throw new Error(`주도주 조회 실패: ${res.status}`);

    const { output } = await res.json();
    if (!output || !Array.isArray(output)) return [];

    return output.slice(0, 50).map(d => ({
        code: d.mksc_shrn_iscd,
        name: d.hts_kor_isnm,
        tradingValue: Math.round(Number(d.hts_tr_pbmn) / 100),
    }));
}

/**
 * 다종목 현재가 일괄 조회 (최대 50개)
 * TR: FHKST01010400
 */
export async function getMultiPrices(stockCodes) {
    const res = await requestWithRetry(
        '/uapi/domestic-stock/v1/quotations/interesting-items',
        'FHKST01010400',
        {
            FID_INPUT_ISCD_1: stockCodes.join('|')
        }
    );

    if (!res.ok) throw new Error(`다종목 조회 실패: ${res.status}`);

    const { output } = await res.json();
    if (!output || !Array.isArray(output)) return [];

    return output.map(d => ({
        code: d.mksc_shrn_iscd,
        name: d.hts_kor_isnm,
        price: Number(d.stck_prpr),
        change: Number(d.prdy_vrss),
        changeRate: Number(d.prdy_ctrt),
    }));
}


