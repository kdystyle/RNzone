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
 */
async function getAccessToken() {
    // 토큰이 아직 유효하면 재사용
    if (accessToken && Date.now() < tokenExpiry) {
        return accessToken;
    }

    const { appKey, appSecret, baseUrl } = getConfig();

    try {
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
 * 주식 현재가 조회
 * 반환: { price, marketCap, sector, name, volume, tradingValue }
 */
export async function getCurrentPrice(stockCode) {
    const { baseUrl } = getConfig();
    const headers = await makeHeaders('FHKST01010100');

    const url = new URL(`${baseUrl}/uapi/domestic-stock/v1/quotations/inquire-price`);
    url.searchParams.set('FID_COND_MRKT_DIV_CODE', 'J'); // 주식
    url.searchParams.set('FID_INPUT_ISCD', stockCode);

    const res = await fetch(url.toString(), { headers });
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
    const { baseUrl } = getConfig();
    const headers = await makeHeaders('FHKST03010100');

    const url = new URL(`${baseUrl}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`);
    url.searchParams.set('FID_COND_MRKT_DIV_CODE', 'J');
    url.searchParams.set('FID_INPUT_ISCD', stockCode);
    url.searchParams.set('FID_INPUT_DATE_1', startDate);  // YYYYMMDD
    url.searchParams.set('FID_INPUT_DATE_2', endDate);    // YYYYMMDD
    url.searchParams.set('FID_PERIOD_DIV_CODE', 'D');     // 일봉
    url.searchParams.set('FID_ORG_ADJ_PRC', '0');         // 수정주가 미사용

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) throw new Error(`일봉 조회 실패: ${res.status}`);

    const { output2 } = await res.json();

    if (!output2 || !Array.isArray(output2)) return [];

    // KIS는 최신 날짜가 먼저 오므로 reverse
    return output2
        .filter((d) => d.stck_bsop_date) // 빈 데이터 제거
        .map((d) => ({
            time: `${d.stck_bsop_date.slice(0, 4)}-${d.stck_bsop_date.slice(4, 6)}-${d.stck_bsop_date.slice(6, 8)}`,
            open: Number(d.stck_oprc),
            high: Number(d.stck_hgpr),
            low: Number(d.stck_lwpr),
            close: Number(d.stck_clpr),
            tradingValue: Math.round(Number(d.acml_tr_pbmn) / 100000000), // 억 단위
        }))
        .reverse(); // 오래된 날짜가 먼저 오도록
}

/**
 * 종목 기본 정보 조회 (업종 포함)
 */
export async function getStockInfo(stockCode) {
    const { baseUrl } = getConfig();
    const headers = await makeHeaders('CTPF1002R');

    const url = new URL(`${baseUrl}/uapi/domestic-stock/v1/quotations/search-stock-info`);
    url.searchParams.set('PRDT_TYPE_CD', '300'); // 주식
    url.searchParams.set('PDNO', stockCode);

    const res = await fetch(url.toString(), { headers });
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
    const { baseUrl } = getConfig();
    const headers = await makeHeaders('FHKST01013100');

    const url = new URL(`${baseUrl}/uapi/domestic-stock/v1/quotations/volume-rank`);
    url.searchParams.set('FID_COND_MRKT_DIV_CODE', 'J'); // 주식
    url.searchParams.set('FID_COND_SCR_DIV_CODE', '20131');
    url.searchParams.set('FID_INPUT_ISCD', '0000'); // 전체
    url.searchParams.set('FID_DIV_CLS_CODE', '0'); // 전체
    url.searchParams.set('FID_BLNG_CLS_CODE', '0'); // 전체
    url.searchParams.set('FID_TRGT_CLS_CODE', '0'); // 전체
    url.searchParams.set('FID_TRGT_EXLS_CLS_CODE', '0'); // 전체
    url.searchParams.set('FID_INPUT_PRICE_1', ''); // 가격 하한
    url.searchParams.set('FID_INPUT_PRICE_2', ''); // 가격 상한
    url.searchParams.set('FID_VOL_CNT', ''); // 거래량 조건
    url.searchParams.set('FID_INPUT_DATE_1', '');

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) throw new Error(`주도주 조회 실패: ${res.status}`);

    const { output } = await res.json();
    if (!output || !Array.isArray(output)) return [];

    // 거래대금(hts_tr_pbmn) 상위순으로 반환됨
    return output.slice(0, 50).map(d => ({
        code: d.mksc_shrn_iscd,
        name: d.hts_kor_isnm,
        tradingValue: Math.round(Number(d.hts_tr_pbmn) / 100), // 억 단위 근사
    }));
}

/**
 * 다종목 현재가 일괄 조회 (최대 50개)
 * TR: FHKST01010400
 */
export async function getMultiPrices(stockCodes) {
    const { baseUrl } = getConfig();
    const headers = await makeHeaders('FHKST01010400');

    const url = new URL(`${baseUrl}/uapi/domestic-stock/v1/quotations/interesting-items`);
    // 종목코드들을 | 로 연결 (최대 50개)
    url.searchParams.set('FID_INPUT_ISCD_1', stockCodes.join('|'));

    const res = await fetch(url.toString(), { headers });
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

