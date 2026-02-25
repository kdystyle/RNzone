// ============================
// 매매 상태 대시보드 컴포넌트
// - 해설서 4장의 매매 프로세스를 7개 카드로 시각화
// - 종목 선별 체크리스트 (해설서 3장)
// ============================

import type { TradeState, FilterResult, TradePhase } from '../types';

interface Props {
    tradeState: TradeState;
    filterResult: FilterResult;
    currentPrice: number;
    stockName: string;
}

/** 가격 포맷 */
function formatPrice(price: number | null): string {
    if (price === null) return '—';
    return price.toLocaleString('ko-KR') + '원';
}

/** 매매 단계 한국어 라벨 */
const PHASE_LABELS: Record<TradePhase, string> = {
    WATCHING: '감시 중',
    SIGNAL: '🔔 상단 터치 감지',
    ENTRY_ZONE: '🎯 매수 구간 진입',
    FIRST_BUY: '✅ 1차 매수 완료',
    SECOND_BUY: '✅ 2차 매수 완료',
    TAKE_PROFIT: '💰 수익 실현 구간',
    TIME_CUT: '⏰ 타임컷 경고',
};

export default function Dashboard({ tradeState, filterResult, currentPrice, stockName }: Props) {
    const { phase, upperRN, lowerRN, firstEntryPrice, secondEntryPrice, avgPrice, targetLow, targetHigh, timeCutDate } = tradeState;

    return (
        <div className="glass-card">
            <div className="card-title">📊 매매 대시보드 — {stockName}</div>

            {/* 매매 단계 표시 */}
            <div style={{ marginBottom: '16px' }}>
                <span className={`phase-badge phase-${phase}`}>
                    {PHASE_LABELS[phase]}
                </span>
            </div>

            {/* 7개 핵심 카드 */}
            <div className="dashboard-grid">
                {/* 현재가 */}
                <div className="dash-card">
                    <div className="dash-card-label">현재가</div>
                    <div className="dash-card-value cyan">{formatPrice(currentPrice)}</div>
                </div>

                {/* 상단 RN */}
                <div className="dash-card">
                    <div className="dash-card-label">상단 RN (저항)</div>
                    <div className="dash-card-value gold">
                        {upperRN ? `${formatPrice(upperRN.price)}` : '—'}
                    </div>
                </div>

                {/* 하단 RN */}
                <div className="dash-card">
                    <div className="dash-card-label">하단 RN (지지)</div>
                    <div className="dash-card-value cyan">
                        {lowerRN ? `${formatPrice(lowerRN.price)}` : '—'}
                    </div>
                </div>

                {/* 1차 매수가 */}
                <div className="dash-card">
                    <div className="dash-card-label">1차 매수가</div>
                    <div className="dash-card-value green">{formatPrice(firstEntryPrice)}</div>
                </div>

                {/* 2차 매수가 (-20%) */}
                <div className="dash-card">
                    <div className="dash-card-label">2차 매수가 (-20%)</div>
                    <div className="dash-card-value blue">{formatPrice(secondEntryPrice)}</div>
                </div>

                {/* 평단가 (1:2 법칙) */}
                <div className="dash-card">
                    <div className="dash-card-label">평단가 (1:2 법칙)</div>
                    <div className="dash-card-value magenta">{formatPrice(avgPrice)}</div>
                </div>

                {/* 목표 수익 구간 */}
                <div className="dash-card full-width">
                    <div className="dash-card-label">목표 수익 (7%~20%)</div>
                    <div className="dash-card-value green">
                        {targetLow && targetHigh
                            ? `${formatPrice(targetLow)} ~ ${formatPrice(targetHigh)}`
                            : '—'}
                    </div>
                </div>

                {/* 타임컷 */}
                <div className="dash-card full-width">
                    <div className="dash-card-label">⏰ 3개월 타임컷 만료일</div>
                    <div className="dash-card-value red">{timeCutDate ?? '—'}</div>
                </div>
            </div>

            {/* 종목 선별 체크리스트 */}
            <div style={{ marginTop: '20px' }}>
                <div className="card-title">✅ 종목 선별 체크리스트</div>
                <div className="filter-checklist">
                    <div className="filter-item">
                        <div className={`filter-icon ${filterResult.marketCapOk ? 'pass' : 'fail'}`}>
                            {filterResult.marketCapOk ? '✓' : '✕'}
                        </div>
                        <span className="filter-text">체급 (시가총액)</span>
                        <span className="filter-value">
                            {filterResult.marketCapTier === 'large' ? '10조+ 대형주' :
                                filterResult.marketCapTier === 'mid' ? '중형주' : '소형주'}
                        </span>
                    </div>
                    <div className="filter-item">
                        <div className={`filter-icon ${filterResult.tradingValueOk ? 'pass' : 'fail'}`}>
                            {filterResult.tradingValueOk ? '✓' : '✕'}
                        </div>
                        <span className="filter-text">거래대금 1,500억+</span>
                        <span className="filter-value">
                            {filterResult.tradingValueOk ? '주도주 확인' : '미달'}
                        </span>
                    </div>
                    <div className="filter-item">
                        <div className={`filter-icon ${filterResult.upperTouchOk ? 'pass' : 'fail'}`}>
                            {filterResult.upperTouchOk ? '✓' : '✕'}
                        </div>
                        <span className="filter-text">상단 RN 터치/근접</span>
                        <span className="filter-value">
                            {filterResult.upperTouchOk ? '선행 신호 감지' : '미감지'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
