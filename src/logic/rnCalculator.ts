// ============================
// RN 라인 계산 엔진
// - 호가 단위 테이블 (한국 시장)
// - RN 라인 생성 / 상하단 탐색
// - 상단 터치·매수 구간 판정
// ============================

import type { RNLine } from '../types';

// ── 호가 단위 테이블 (한국 거래소 규정) ──────────────
// threshold: 이 가격 이상부터 해당 tickSize 적용
const TICK_TABLE = [
    { threshold: 500000, tickSize: 1000 },
    { threshold: 200000, tickSize: 500 },
    { threshold: 100000, tickSize: 100 },
    { threshold: 50000, tickSize: 100 },
    { threshold: 20000, tickSize: 50 },
    { threshold: 10000, tickSize: 50 },
    { threshold: 5000, tickSize: 10 },
    { threshold: 2000, tickSize: 5 },
    { threshold: 1000, tickSize: 1 },
];

/** 특정 가격의 호가 단위를 반환 */
export function getTickSize(price: number): number {
    for (const row of TICK_TABLE) {
        if (price >= row.threshold) return row.tickSize;
    }
    return 1;
}

// ── 주요 RN 라인 목록 ──────────────────────────
// 해설서에 나오는 핵심 라운드 넘버들: 끝자리 00 또는 자릿수 변경점
// 실전 주가 범위(1,000원 ~ 200만원)를 커버
const RN_PRICES = [
    1000, 1500, 2000, 3000, 5000, 7500,
    10000, 15000, 20000, 30000, 50000, 75000,
    100000, 150000, 200000, 300000, 500000, 750000,
    1000000, 1500000, 2000000,
];

/** 가격을 사람이 읽기 좋은 라벨로 변환 (예: 100000 → '10만') */
function formatLabel(price: number): string {
    if (price >= 10000) {
        const man = price / 10000;
        return man >= 100 ? `${man / 100}백만` : `${man}만`;
    }
    return `${price.toLocaleString()}`;
}

/** 전체 RN 라인 목록 생성 (현재가 대비 거리% 포함) */
export function generateRNLines(currentPrice: number): RNLine[] {
    return RN_PRICES.map((price) => ({
        price,
        label: formatLabel(price),
        tickSize: getTickSize(price),
        distancePercent: ((price - currentPrice) / currentPrice) * 100,
    }));
}

/** 현재가 기준 상단/하단 인접 RN을 찾아 반환 */
export function findAdjacentRNLines(currentPrice: number): {
    upper: RNLine | null;
    lower: RNLine | null;
} {
    const lines = generateRNLines(currentPrice);

    // 상단: 현재가 이상인 라인 중 가장 가까운 것
    const upper = lines.find((l) => l.price >= currentPrice) ?? null;

    // 하단: 현재가 아래인 라인 중 가장 가까운 것
    const lowerCandidates = lines.filter((l) => l.price < currentPrice);
    const lower = lowerCandidates.length > 0
        ? lowerCandidates[lowerCandidates.length - 1]
        : null;

    return { upper, lower };
}

// ── 매매 판정 유틸 ──────────────────────────────

/** 상단 RN 4% 이내 근접 여부 (해설서 조건3: 선행 신호) */
export function isNearUpperRN(currentPrice: number, upperRN: number): boolean {
    const gap = ((upperRN - currentPrice) / upperRN) * 100;
    return gap >= 0 && gap <= 4;
}

/** 하단 RN +4% 이내 매수 구간 여부 (해설서 4장: 1차 매수) */
export function isInEntryZone(currentPrice: number, lowerRN: number): boolean {
    const premium = ((currentPrice - lowerRN) / lowerRN) * 100;
    return premium >= 0 && premium <= 4;
}

/** 2차 매수가 계산: 1차 매수가 대비 -20% (해설서 4장: 비중의 마법) */
export function calcSecondEntry(firstEntryPrice: number): number {
    return Math.round(firstEntryPrice * 0.8);
}

/** 평단가 계산: 1:2 비중 법칙 (1차 1배 + 2차 2배) */
export function calcWeightedAvg(
    firstPrice: number,
    secondPrice: number
): number {
    // 1차: 1주 비중, 2차: 2주 비중 → 가중평균
    return Math.round((firstPrice * 1 + secondPrice * 2) / 3);
}

/** 목표 수익가 계산: 7% ~ 20% (해설서 4장: 목표 수익 실현) */
export function calcTargetRange(avgPrice: number): {
    low: number;
    high: number;
} {
    return {
        low: Math.round(avgPrice * 1.07),
        high: Math.round(avgPrice * 1.20),
    };
}

/** 3개월 타임컷 날짜 계산 (해설서 4장: 시간 손절) */
export function calcTimeCutDate(entryDateStr: string): string {
    const d = new Date(entryDateStr);
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().slice(0, 10);
}
