// ============================
// 종목 검색기 컴포넌트
// - 검색창 + 자동완성 드롭다운
// - 선택된 종목 탭으로 표시
// ============================

import { useState, useEffect, useRef } from 'react';
import { searchStocks, type StockSearchResult } from '../api';

interface Props {
    selectedCode: string;
    onSelect: (code: string) => void;
    recentStocks: { code: string; name: string; sector: string }[];
    isLoading: boolean;
}

export default function StockSelector({ selectedCode, onSelect, recentStocks, isLoading }: Props) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<StockSearchResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // 검색어가 바뀌면 API 호출
    useEffect(() => {
        if (query.length === 0) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const data = await searchStocks(query);
                setResults(data);
                setIsOpen(true);
            } catch {
                setResults([]);
            }
        }, 200); // 200ms 디바운스

        return () => clearTimeout(timer);
    }, [query]);

    // 외부 클릭 시 드롭다운 닫기
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    function handleSelect(code: string) {
        onSelect(code);
        setQuery('');
        setIsOpen(false);
    }

    return (
        <div className="stock-search-area">
            {/* 검색창 */}
            <div className="search-container" ref={containerRef}>
                <div className="search-input-wrap">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="종목명 또는 코드 검색 (예: 삼성, 005930)"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => query.length > 0 && setIsOpen(true)}
                    />
                    {isLoading && <span className="search-loading">⏳</span>}
                </div>

                {/* 자동완성 드롭다운 */}
                {isOpen && results.length > 0 && (
                    <div className="search-dropdown">
                        {results.map((stock) => (
                            <button
                                key={stock.code}
                                className="search-result-item"
                                onClick={() => handleSelect(stock.code)}
                            >
                                <span className="result-name">{stock.name}</span>
                                <span className="result-meta">
                                    {stock.code} · {stock.sector}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* 최근 선택한 종목 탭 */}
            {recentStocks.length > 0 && (
                <div className="stock-selector">
                    {recentStocks.map((stock) => (
                        <button
                            key={stock.code}
                            className={`stock-tab ${stock.code === selectedCode ? 'active' : ''}`}
                            onClick={() => onSelect(stock.code)}
                        >
                            <span className="stock-tab-name">{stock.name}</span>
                            <span className="stock-tab-sector">{stock.sector}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
