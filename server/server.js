// ============================
// 백엔드 프록시 서버
// - KIS API를 중계하여 CORS 문제 해결
// - API 키가 없으면 목 데이터로 자동 전환
// ============================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { isConfigured, getCurrentPrice, getDailyCandles, getMarketLeaders, getMultiPrices } from './kis.js';
import { searchStocks, STOCK_LIST } from './stockList.js';


dotenv.config();

const app = express();
const PORT = 3001;

// 프론트엔드(http://localhost:5173 등)에서의 요청 허용
app.use(cors());
app.use(express.json());

// ── API 키 설정 여부 확인 ──
const kisReady = isConfigured();
console.log(kisReady
    ? '✅ KIS API 키 설정 완료 — 실시간 데이터 모드'
    : '⚠️ KIS API 키 미설정 — 목 데이터 모드 (.env 파일을 설정해주세요)'
);

// ── 종목 검색 ──
// GET /api/search?q=삼성
app.get('/api/search', (req, res) => {
    const q = req.query.q || '';
    const results = searchStocks(q);
    res.json(results);
});

// ── 종목 전체 리스트 ──
// GET /api/stocks
app.get('/api/stocks', (_req, res) => {
    res.json(STOCK_LIST);
});

// ── 종목 상세 데이터 (현재가 + 일봉) ──
// GET /api/stock/:code
app.get('/api/stock/:code', async (req, res) => {
    const { code } = req.params;

    // 종목 리스트에서 기본 정보 찾기
    const stockInfo = STOCK_LIST.find((s) => s.code === code);
    if (!stockInfo) {
        return res.status(404).json({ error: '종목을 찾을 수 없습니다' });
    }

    // KIS API 키가 없으면 목 데이터 반환
    if (!kisReady) {
        return res.json({
            ...stockInfo,
            marketCap: stockInfo.tier === 'large' ? 50 : 5,
            candles: generateMockCandles(code),
            currentPrice: null,
            source: 'mock',
        });
    }

    try {
        console.log(`[SERVER] ${code} 데이터 조회 시작...`);

        // 실시간 데이터 조회 (각각 로그 추가)
        console.log(`[SERVER] ${code} 현재가 조회 중...`);
        const priceData = await getCurrentPrice(code);
        console.log(`[SERVER] ${code} 현재가 조회 완료: ${priceData.price}`);

        console.log(`[SERVER] ${code} 일봉 데이터 조회 중...`);
        const candles = await getDailyCandles(code, getDateStr(-120), getDateStr(0));
        console.log(`[SERVER] ${code} 일봉 데이터 조회 완료: ${candles.length}개`);

        res.json({
            ...stockInfo,
            marketCap: priceData.marketCap,
            candles,
            currentPrice: priceData.price,
            change: priceData.change,
            changeRate: priceData.changeRate,
            tradingValue: priceData.tradingValue,
            source: 'kis',
        });
    } catch (err) {
        console.error(`[ERROR] ${code} 데이터 조회 실패:`, err.message);
        // API 실패 시 목 데이터 fallback
        res.json({
            ...stockInfo,
            marketCap: stockInfo.tier === 'large' ? 50 : 5,
            candles: generateMockCandles(code),
            currentPrice: null,
            source: 'mock-fallback',
            error: err.message,
        });
    }
});

// ── 서버 상태 확인 ──
app.get('/api/status', (_req, res) => {
    res.json({
        status: 'ok',
        kisConfigured: kisReady,
        mode: kisReady ? 'live' : 'mock',
        stockCount: STOCK_LIST.length,
    });
});

// ── 유틸: 날짜 문자열 (YYYYMMDD) ──
function getDateStr(daysOffset) {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString().slice(0, 10).replace(/-/g, '');
}

function generateMockCandles(code) {
    // 종목 코드를 시드로 사용하여 결정적 데이터 생성
    const seed = parseInt(code, 10);
    const basePrice = ((seed % 50) + 5) * 10000; // 5만~55만 사이
    const candles = [];
    let price = basePrice;

    for (let i = 40; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        // 주말 건너뛰기
        if (d.getDay() === 0 || d.getDay() === 6) continue;

        const change = (Math.sin(seed + i * 0.3) * 2 + (Math.random() - 0.5)) / 100;
        const open = price;
        const close = Math.round(price * (1 + change));
        const high = Math.round(Math.max(open, close) * (1 + Math.random() * 0.01));
        const low = Math.round(Math.min(open, close) * (1 - Math.random() * 0.01));
        const tradingValue = Math.round(1000 + Math.random() * 5000);
        price = close;

        candles.push({
            time: d.toISOString().slice(0, 10),
            open, high, low, close, tradingValue,
        });
    }

    return candles;
}


// ── 종목 스캐너 (고도화 버전) ──
// 실시간 거래대금 상위 종목(주도주)을 가져와서 RN 존 여부 판별
app.get('/api/scanner', async (req, res) => {
    if (!kisReady) {
        return res.json({
            results: STOCK_LIST.slice(0, 5).map(s => ({ ...s, status: 'entry', gap: 1.2, currentPrice: 50000 })),
            mode: 'mock'
        });
    }

    try {
        console.log('[SCANNER] 실시간 주도주 스캔 시작...');

        // 1. 거래대금 상위 주도주 50개 추출
        const leaders = await getMarketLeaders();
        if (leaders.length === 0) {
            return res.json({ results: [], mode: 'live', message: '주도주 데이터를 찾을 수 없습니다' });
        }

        // 2. 주도주들의 현재가 일괄 조회 (최대 50개)
        const itemCodes = leaders.map(l => l.code);
        const prices = await getMultiPrices(itemCodes);

        // 3. RN 기법 필터링
        const results = [];
        const rnPrices = [1000, 5000, 10000, 50000, 100000, 500000, 1000000];

        for (const priceItem of prices) {
            const currentPrice = priceItem.price;
            const upper = rnPrices.find(p => p >= currentPrice);
            const lower = [...rnPrices].reverse().find(p => p < currentPrice);

            let matched = false;
            let status = '';
            let gap = 0;

            if (upper) {
                const watchGap = ((upper - currentPrice) / upper) * 100;
                if (watchGap <= 4) {
                    status = 'watch';
                    gap = watchGap;
                    matched = true;
                }
            }
            if (!matched && lower) {
                const entryGap = ((currentPrice - lower) / lower) * 100;
                if (entryGap <= 4) {
                    status = 'entry';
                    gap = entryGap;
                    matched = true;
                }
            }

            if (matched) {
                // 기존 종목 리스트에서 업종 정보 등 매칭
                const meta = STOCK_LIST.find(s => s.code === priceItem.code) || { sector: '기타' };
                results.push({
                    code: priceItem.code,
                    name: priceItem.name,
                    sector: meta.sector,
                    status,
                    gap,
                    currentPrice
                });
            }
        }

        console.log(`[SCANNER] 주도주 ${leaders.length}개 중 ${results.length}개 RN 존 발견`);
        res.json({ results: results.sort((a, b) => a.gap - b.gap), mode: 'live' });
    } catch (err) {
        console.error('[SCANNER] 고도화 스캔 에러:', err.message);
        res.status(500).json({ error: '주도주 스캔 중 오류 발생' });
    }
});


// ── 서버 실행 (Vercel 환경이 아닐 때만) ──
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`\n🚀 RN존 백엔드 서버 시작: http://localhost:${PORT}`);
        console.log(`   - 종목 검색: GET /api/search?q=삼성`);
        console.log(`   - 종목 데이터: GET /api/stock/005930`);
        console.log(`   - 서버 상태: GET /api/status\n`);
    });
}

export default app;
