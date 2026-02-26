/**
 * Naver Finance (네이버 증권) API 클라이언트
 * - KIS API의 복잡한 토큰 인증을 대체
 * - 공용 엔드포인트에서 주식 시세 및 차트 데이터 조회
 */

// ── 데이터 처리 유틸리티 ──

/** 전일 대비값/율 추출 */
function parseChange(str) {
    if (!str) return { change: 0, changeRate: 0 };
    // "1,200 +1.23 %" 같은 문자열에서 부호와 숫자만 추출하는 용도(필요시)
    return { change: 0, changeRate: 0 };
}

/** 
 * 종목 현재가 및 기본 정보 조회 
 * https://api.stock.naver.com/stock/{code}/basic
 */
export async function getCurrentPrice(stockCode) {
    try {
        const res = await fetch(`https://api.stock.naver.com/stock/${stockCode}/basic`);
        if (!res.ok) throw new Error(`Naver API error: ${res.status}`);

        const data = await res.json();

        // Naver response field mapping
        return {
            price: Number(data.closePrice.replace(/,/g, '')),
            change: Number(data.compareToPreviousClosePrice.replace(/,/g, '')),
            changeRate: Number(data.fluctuationsRatio),
            volume: Number(data.accumulatedTradingVolume.replace(/,/g, '')),
            tradingValue: Math.round(Number(data.accumulatedTradingValue.replace(/,/g, '')) / 100000000), // 억 원 단위
            marketCap: Math.round(Number(data.marketCap.replace(/,/g, '')) / 10000), // 조 원 단위로 변환 (기존 KIS 기준에 맞춰 조정)
            high52w: Number(data.high52WeeksPrice.replace(/,/g, '')),
            low52w: Number(data.low52WeeksPrice.replace(/,/g, '')),
            per: Number(data.per) || 0,
            pbr: Number(data.pbr) || 0,
            name: data.stockName,
            sector: data.industryName || '기타'
        };
    } catch (error) {
        console.error(`[NAVER] ${stockCode} 현재가 조회 실패:`, error.message);
        throw error;
    }
}

/**
 * 일봉 데이터 조회 (XML -> JSON 간이 파싱)
 * https://fchart.stock.naver.com/sise.nhn?symbol={code}&timeframe=day&count={count}&requestType=0
 */
export async function getDailyCandles(stockCode, count = 100) {
    try {
        const url = `https://fchart.stock.naver.com/sise.nhn?symbol=${stockCode}&timeframe=day&count=${count}&requestType=0`;
        const res = await fetch(url);
        const xmlText = await res.text();

        // <item data="20240226|80000|81000|79500|80500|1234567" /> 형태 파싱
        const items = xmlText.match(/<item data="([^"]+)"/g) || [];

        return items.map(item => {
            const dataStr = item.match(/"([^"]+)"/)[1];
            const [date, open, high, low, close, volume] = dataStr.split('|');

            return {
                time: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
                open: Number(open),
                high: Number(high),
                low: Number(low),
                close: Number(close),
                volume: Number(volume),
                // 거래대금 추정 (종가 * 거래량 / 1억)
                tradingValue: Math.round((Number(close) * Number(volume)) / 100000000)
            };
        });
    } catch (error) {
        console.error(`[NAVER] ${stockCode} 일봉 조회 실패:`, error.message);
        return [];
    }
}

/**
 * 다종목 현재가 조회
 * https://api.stock.naver.com/stock/exchange/KOSPI/marketValue?page=1&pageSize=50
 * 대신, 단일 조회 반복으로 구현 (CORS/인증 우회 안전성 때문)
 */
export async function getMultiPrices(stockCodes) {
    // 동시 요청 시 API 차단 위험이 있으므로 순차 또는 소규모 병렬 처리
    const results = [];
    for (const code of stockCodes) {
        try {
            const data = await getCurrentPrice(code);
            results.push({
                code,
                name: data.name,
                price: data.price,
                change: data.change,
                changeRate: data.changeRate
            });
        } catch (e) {
            console.warn(`[NAVER] ${code} 일괄 조회 중 건너뜀`);
        }
    }
    return results;
}

/**
 * 실시간 거래대금 상위 종목 (주도주)
 * https://api.stock.naver.com/ranking/stock/marketCap/KOSPI?page=1&pageSize=20
 * 실제로는 '거래대금 상위' 엔드포인트 필요.
 */
export async function getMarketLeaders() {
    try {
        // 네이버 금융 거래대금 상위 (코스피 + 코스닥 통합은 크롤링이 필요할 수 있으나, 일단 코스피 중심 조회)
        // 실제 운영 시에는 더 정확한 랭킹 API 사용 권장
        const res = await fetch(`https://api.stock.naver.com/ranking/stock/tradingValue/KOSPI?page=1&pageSize=30`);
        const kospi = await res.json();

        const res2 = await fetch(`https://api.stock.naver.com/ranking/stock/tradingValue/KOSDAQ?page=1&pageSize=30`);
        const kosdaq = await res2.json();

        const combined = [...(kospi.stocks || []), ...(kosdaq.stocks || [])];

        return combined
            .sort((a, b) => Number(b.accumulatedTradingValue.replace(/,/g, '')) - Number(a.accumulatedTradingValue.replace(/,/g, '')))
            .slice(0, 50)
            .map(s => ({
                code: s.reutersCode.split('.')[0], // '005930.KS' -> '005930'
                name: s.stockName,
                tradingValue: Math.round(Number(s.accumulatedTradingValue.replace(/,/g, '')) / 100) // KIS 포맷과 유사하게 조정
            }));
    } catch (error) {
        console.error('[NAVER] 주도주 조회 실패:', error.message);
        return [];
    }
}
