// ============================
// RN 라인 맵 패널
// - 현재가 대비 모든 RN 라인의 거리(%) 표시
// - 상단/하단 구분, 호가 단위 표시
// ============================

import type { RNLine } from '../types';

interface Props {
    allRNLines: RNLine[];
    upperRN: RNLine | null;
    lowerRN: RNLine | null;
    currentPrice: number;
}

/** 가격을 짧은 포맷으로 표시 */
function shortPrice(price: number): string {
    if (price >= 1000000) return `${(price / 10000).toLocaleString()}만`;
    if (price >= 10000) return `${(price / 10000).toFixed(1)}만`;
    return price.toLocaleString();
}

export default function RNLinePanel({ allRNLines, upperRN, lowerRN, currentPrice }: Props) {
    // 현재가 ±60% 범위만 표시
    const visibleLines = allRNLines.filter(
        (l) => Math.abs(l.distancePercent) <= 60
    );

    // 상단(멀리) → 현재가 → 하단(멀리) 순서로 정렬
    const sorted = [...visibleLines].sort((a, b) => b.price - a.price);

    return (
        <div className="glass-card">
            <div className="card-title">🗺️ RN 라인 맵</div>
            <div className="rn-line-list">
                {sorted.map((line) => {
                    const isUpper = upperRN && line.price === upperRN.price;
                    const isLower = lowerRN && line.price === lowerRN.price;
                    const isAbove = line.price > currentPrice;

                    return (
                        <div
                            key={line.price}
                            className={`rn-line-item ${isAbove ? 'above' : 'below'} ${isUpper || isLower ? 'current' : ''
                                }`}
                        >
                            <div>
                                <span className="rn-price">{shortPrice(line.price)}</span>
                                <span className="rn-label" style={{ marginLeft: '8px' }}>
                                    {isUpper ? '▲ 상단' : isLower ? '▼ 하단' : ''}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    호가 {line.tickSize}원
                                </span>
                                <span
                                    className={`rn-distance ${line.distancePercent >= 0 ? 'positive' : 'negative'
                                        }`}
                                >
                                    {line.distancePercent >= 0 ? '+' : ''}
                                    {line.distancePercent.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
