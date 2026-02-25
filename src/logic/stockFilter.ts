// ============================
// 종목 선별 필터 (해설서 3장: 3대 필수 조건)
// 1. 시가총액 10조+ (대형주)
// 2. 거래대금 1,500억+ (주도주)
// 3. 상단 RN 터치/근접 (선행 신호)
// ============================

import type { Stock, FilterResult } from '../types';
import { findAdjacentRNLines, isNearUpperRN } from './rnCalculator';

/**
 * 종목이 RN존 매매법의 3대 필수 조건을 통과하는지 체크
 *
 * 왜 3단계로 나누는가?
 * → 해설서는 "그물을 칠 길목"을 단계적으로 좁혀나가는 방식.
 *   체급(시총) → 돈의 화살표(거래대금) → 선행 신호(상단 터치)
 *   순서로 필터링해야 가장 안전한 종목만 남는다.
 */
export function evaluateStock(stock: Stock): FilterResult {
    // ── 조건 1: 시가총액 체급 분류 ──
    const marketCapTier: FilterResult['marketCapTier'] =
        stock.marketCap >= 10
            ? 'large'     // 10조 이상: 초대형주 (최우선)
            : stock.marketCap >= 0.3
                ? 'mid'     // 3,000억 ~ 10조: 중형주 (거래대금 엄격 적용)
                : 'small';  // 3,000억 미만: 부적격

    const marketCapOk = marketCapTier !== 'small';

    // ── 조건 2: 최근 거래대금 1,500억+ 확인 ──
    // 최근 5일 중 하루라도 1,500억 초과하면 '주도주 화살표' 인정
    const recentCandles = stock.candles.slice(-5);
    const tradingValueOk = recentCandles.some((c) => c.tradingValue >= 1500);

    // ── 조건 3: 상단 RN 터치/근접 ──
    const latestPrice = stock.candles.length > 0
        ? stock.candles[stock.candles.length - 1].close
        : 0;
    const { upper } = findAdjacentRNLines(latestPrice);

    // 최근 캔들 중 고가가 상단 RN 4% 이내에 닿은 적이 있는지
    const upperTouchOk = upper
        ? stock.candles.slice(-20).some((c) => isNearUpperRN(c.high, upper.price))
        : false;

    return {
        marketCapOk,
        tradingValueOk,
        upperTouchOk,
        allPassed: marketCapOk && tradingValueOk && upperTouchOk,
        marketCapTier,
    };
}
