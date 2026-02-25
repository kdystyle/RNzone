
import { useState, useEffect } from 'react';
import { fetchScanner, type ScannerResult } from '../api';

interface Props {
    onSelect: (code: string) => void;
    selectedCode: string;
}

export default function Scanner({ onSelect, selectedCode }: Props) {
    const [results, setResults] = useState<ScannerResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const runScan = async () => {
        setLoading(true);
        try {
            const data = await fetchScanner();
            // 갭 차이가 적은 순으로 정렬
            setResults(data.sort((a, b) => a.gap - b.gap));
            setLastUpdated(new Date());
        } catch (error) {
            console.error('스캔 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        runScan();
        // 5분마다 자동 갱신
        const interval = setInterval(runScan, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const entryZone = results.filter(r => r.status === 'entry');
    const watchZone = results.filter(r => r.status === 'watch');

    return (
        <div className="scanner-section glass-card">
            <div className="scanner-header">
                <div className="scanner-title-wrap">
                    <h3 className="section-title">🚀 내일의 주도주 스캐너</h3>
                    <p className="scanner-subtitle">기법 조건에 부합하는 종목 자동 검출</p>
                </div>
                <button
                    className={`refresh-btn ${loading ? 'loading' : ''}`}
                    onClick={runScan}
                    disabled={loading}
                >
                    {loading ? '⏳' : '🔄'} {lastUpdated?.toLocaleTimeString()}
                </button>
            </div>

            <div className="scanner-grid">
                {/* 매수 구역 (Entry) */}
                <div className="scanner-column">
                    <div className="column-label entry">🟢 1차 매수 적기 (Entry)</div>
                    <div className="scanner-list">
                        {entryZone.length > 0 ? entryZone.map(stock => (
                            <button
                                key={stock.code}
                                className={`scanner-item ${stock.code === selectedCode ? 'active' : ''}`}
                                onClick={() => onSelect(stock.code)}
                            >
                                <div className="item-main">
                                    <span className="item-name">{stock.name}</span>
                                    <span className="item-price">{stock.currentPrice.toLocaleString()}원</span>
                                </div>
                                <div className="item-footer">
                                    <span className="item-gap">RN 하단 +{stock.gap.toFixed(1)}%</span>
                                    <span className="item-sector">{stock.sector}</span>
                                </div>
                            </button>
                        )) : (
                            <div className="empty-msg">조건에 맞는 종목이 없습니다</div>
                        )}
                    </div>
                </div>

                {/* 감시 구역 (Watch) */}
                <div className="scanner-column">
                    <div className="column-label watch">🟡 상단 돌파 감시 (Watch)</div>
                    <div className="scanner-list">
                        {watchZone.length > 0 ? watchZone.map(stock => (
                            <button
                                key={stock.code}
                                className={`scanner-item ${stock.code === selectedCode ? 'active' : ''}`}
                                onClick={() => onSelect(stock.code)}
                            >
                                <div className="item-main">
                                    <span className="item-name">{stock.name}</span>
                                    <span className="item-price">{stock.currentPrice.toLocaleString()}원</span>
                                </div>
                                <div className="item-footer">
                                    <span className="item-gap">RN 상단 -{stock.gap.toFixed(1)}%</span>
                                    <span className="item-sector">{stock.sector}</span>
                                </div>
                            </button>
                        )) : (
                            <div className="empty-msg">조건에 맞는 종목이 없습니다</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
