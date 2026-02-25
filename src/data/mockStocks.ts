// ============================
// 목 데이터: 5개 대형주 시뮬레이션
// 해설서 사례 반영
// - SK하이닉스: 20만 터치 → 15만 조정
// - 삼성전자: 7.5만 터치 → 5만 반등
// ============================

import type { Stock } from '../types';

/** 날짜를 하루씩 증가시키며 생성하는 헬퍼 */
function dateRange(start: string, count: number): string[] {
    const dates: string[] = [];
    const d = new Date(start);
    for (let i = 0; i < count; i++) {
        // 주말 건너뛰기
        while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
        dates.push(d.toISOString().slice(0, 10));
        d.setDate(d.getDate() + 1);
    }
    return dates;
}

/**
 * 리얼리스틱한 캔들 데이터 생성기
 * 특정 시나리오(상승→조정→반등)를 시뮬레이션
 */
function generateCandles(
    startDate: string,
    startPrice: number,
    scenario: number[], // 각 일의 변동률(%)
    baseTradingValue: number // 기본 거래대금(억)
) {
    const dates = dateRange(startDate, scenario.length);
    let price = startPrice;

    return dates.map((time, i) => {
        const change = scenario[i] / 100;
        const open = price;
        const close = Math.round(price * (1 + change));
        const high = Math.round(Math.max(open, close) * (1 + Math.random() * 0.015));
        const low = Math.round(Math.min(open, close) * (1 - Math.random() * 0.015));
        // 변동이 클수록 거래대금 증가
        const tradingValue = Math.round(
            baseTradingValue * (1 + Math.abs(change) * 10) * (0.8 + Math.random() * 0.4)
        );
        price = close;

        return { time, open, high, low, close, tradingValue };
    });
}

// ── SK하이닉스: 20만 터치 → 15만 조정 패턴 ──
const hynixScenario = [
    1.5, 2.0, 1.8, 1.2, 0.8, 1.5, 2.2, 1.0, -0.5, 1.8,
    2.5, 1.5, 0.5, 1.0, 1.8, 2.0, 0.8, -1.0, -2.5, -1.5,
    -2.0, -1.8, -0.5, 0.8, -1.5, -2.5, -1.8, -1.0, -2.0, -1.5,
    -0.8, 0.5, -0.5, -1.0, -1.5, 0.8, 1.2, -0.3, 0.5, 1.0,
];

// ── 삼성전자: 7.5만 터치 → 5만 반등 패턴 ──
const samsungScenario = [
    0.8, 1.2, 0.5, 1.5, 1.0, 0.8, 1.5, 0.3, -0.8, 1.0,
    1.5, 0.8, -1.0, -2.0, -1.5, -2.5, -1.8, -1.0, -2.0, -1.5,
    -1.0, -0.5, -1.5, -2.0, -1.0, -0.5, 0.5, -1.0, -1.5, -0.8,
    -0.5, 1.0, 1.5, 0.8, 1.2, 2.0, 1.5, 0.8, 1.0, 2.5,
];

// ── 현대차: 30만 지지 → 반등 패턴 ──
const hyundaiScenario = [
    0.5, 1.0, 1.5, 0.8, -0.5, 1.0, 1.8, 0.5, -1.0, 0.8,
    -0.5, -1.5, -1.0, -0.8, 0.5, 1.0, -1.5, -2.0, -1.0, -0.5,
    0.5, 1.0, -0.5, -1.0, 0.8, 1.5, 0.5, -0.3, 0.8, 1.0,
    0.5, -0.5, 1.0, 1.5, 0.8, 0.5, 1.2, 1.0, 0.3, 0.8,
];

// ── NAVER: 30만 부근 횡보 패턴 ──
const naverScenario = [
    0.5, -0.5, 1.0, -0.3, 0.8, -0.5, 1.2, -0.8, 0.5, -0.3,
    1.0, -0.5, 0.8, 1.5, -1.0, 0.5, -0.8, 1.0, -0.5, 0.8,
    -0.3, 1.0, -0.5, 0.5, 1.2, -0.8, 0.3, -0.5, 1.0, -0.3,
    0.8, 1.5, -1.0, 0.5, -0.3, 0.8, 1.0, -0.5, 0.3, 1.0,
];

// ── 카카오: 5만 부근 저점 탐색 패턴 ──
const kakaoScenario = [
    -0.5, -1.0, 0.8, -1.5, -0.8, 0.5, -1.0, -0.5, 1.0, -0.8,
    -1.5, -1.0, 0.5, -0.5, -1.0, 0.8, 1.5, -0.5, -1.0, 0.5,
    1.0, -0.3, 0.8, 1.5, 0.5, -0.5, 1.0, 1.8, 0.5, 1.2,
    -0.3, 0.8, 1.5, 0.5, -0.3, 1.0, 0.8, 1.5, 0.5, 2.0,
];

export const MOCK_STOCKS: Stock[] = [
    {
        code: '000660',
        name: 'SK하이닉스',
        marketCap: 120,
        sector: '반도체',
        candles: generateCandles('2025-10-01', 165000, hynixScenario, 3500),
    },
    {
        code: '005930',
        name: '삼성전자',
        marketCap: 350,
        sector: '전자',
        candles: generateCandles('2025-10-01', 62000, samsungScenario, 5000),
    },
    {
        code: '005380',
        name: '현대차',
        marketCap: 45,
        sector: '자동차',
        candles: generateCandles('2025-10-01', 285000, hyundaiScenario, 2000),
    },
    {
        code: '035420',
        name: 'NAVER',
        marketCap: 42,
        sector: 'IT서비스',
        candles: generateCandles('2025-10-01', 280000, naverScenario, 1800),
    },
    {
        code: '035720',
        name: '카카오',
        marketCap: 18,
        sector: 'IT서비스',
        candles: generateCandles('2025-10-01', 55000, kakaoScenario, 1600),
    },
];
