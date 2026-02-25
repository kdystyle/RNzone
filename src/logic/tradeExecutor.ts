// ============================
// 매매 실행기 (Trade Executor)
// - 현재가 기반으로 매매 상태를 자동 결정
// - 1차/2차 매수가, 평단가, 목표가, 타임컷 계산
// ============================

import type { CandleData, TradeState } from '../types';
import {
    findAdjacentRNLines,
    isNearUpperRN,
    isInEntryZone,
    calcSecondEntry,
    calcWeightedAvg,
    calcTargetRange,
    calcTimeCutDate,
} from './rnCalculator';

/**
 * 캔들 데이터를 분석하여 현재 매매 상태를 결정
 *
 * 왜 이렇게 짰나?
 * → 해설서의 매매 프로세스를 '상태 머신'으로 모델링.
 *   과거 캔들을 순회하며 상단 터치 → 하단 진입 순서를 추적해
 *   현재 어떤 매매 단계인지 자동 판별.
 */
export function evaluateTradeState(candles: CandleData[]): TradeState {
    if (candles.length === 0) {
        return createEmptyState();
    }

    const latest = candles[candles.length - 1];
    const currentPrice = latest.close;
    const { upper, lower } = findAdjacentRNLines(currentPrice);

    // 상단 RN 터치 여부: 과거 캔들 중 고가가 상단 RN 4% 이내에 닿은 적이 있는지
    let upperTouched = false;
    if (upper) {
        upperTouched = candles.some((c) => isNearUpperRN(c.high, upper.price));
    }

    // 1차 매수가: 하단 RN 가격 (하단 RN 존 내에서 매수)
    const firstEntryPrice = lower ? lower.price : null;

    // 2차 매수가: 1차 대비 -20%
    const secondEntryPrice = firstEntryPrice
        ? calcSecondEntry(firstEntryPrice)
        : null;

    // 평단가: 1:2 비중 법칙
    const avgPrice =
        firstEntryPrice && secondEntryPrice
            ? calcWeightedAvg(firstEntryPrice, secondEntryPrice)
            : firstEntryPrice;

    // 목표 수익가: 7% ~ 20%
    const targets = avgPrice ? calcTargetRange(avgPrice) : null;

    // 3개월 타임컷
    const timeCutDate = calcTimeCutDate(latest.time);

    // 매매 단계 판정
    let phase = determinePhase(
        currentPrice,
        upperTouched,
        lower?.price ?? null,
        firstEntryPrice,
        secondEntryPrice,
        targets
    );

    return {
        phase,
        upperRN: upper,
        lowerRN: lower,
        upperTouched,
        firstEntryPrice,
        secondEntryPrice,
        avgPrice: avgPrice ?? null,
        targetLow: targets?.low ?? null,
        targetHigh: targets?.high ?? null,
        timeCutDate,
    };
}

/** 현재 상황에 따라 매매 단계를 판단 */
function determinePhase(
    currentPrice: number,
    upperTouched: boolean,
    lowerRNPrice: number | null,
    _firstEntry: number | null,
    secondEntry: number | null,
    targets: { low: number; high: number } | null
): TradeState['phase'] {
    // 목표 수익 구간 도달
    if (targets && currentPrice >= targets.low) {
        return 'TAKE_PROFIT';
    }

    // 2차 매수 구간 (1차가 대비 -20% 이하)
    if (secondEntry && currentPrice <= secondEntry) {
        return 'SECOND_BUY';
    }

    // 하단 RN 매수 구간
    if (lowerRNPrice && isInEntryZone(currentPrice, lowerRNPrice)) {
        if (upperTouched) {
            return 'ENTRY_ZONE';
        }
    }

    // 상단 터치 신호 감지
    if (upperTouched) {
        return 'SIGNAL';
    }

    return 'WATCHING';
}

/** 빈 매매 상태 생성 */
function createEmptyState(): TradeState {
    return {
        phase: 'WATCHING',
        upperRN: null,
        lowerRN: null,
        upperTouched: false,
        firstEntryPrice: null,
        secondEntryPrice: null,
        avgPrice: null,
        targetLow: null,
        targetHigh: null,
        timeCutDate: null,
    };
}
