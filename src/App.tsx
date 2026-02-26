// ============================
// 메인 앱 오케스트레이터
// - 종목 검색 → API 데이터 조회
// - 차트 + 대시보드 + RN맵 + 규칙 패널 레이아웃
// - API 키 없으면 목 데이터로 자동 전환
// ============================

import { useState, useMemo, useEffect, useCallback } from 'react';
import './styles/index.css';

import { fetchStockData, checkServerStatus, type StockApiResponse } from './api';
import { generateRNLines, findAdjacentRNLines } from './logic/rnCalculator';
import { evaluateTradeState } from './logic/tradeExecutor';
import { evaluateStock } from './logic/stockFilter';
import type { Stock } from './types';

import StockSelector from './components/StockSelector';
import TradingChart from './components/TradingChart';
import Dashboard from './components/Dashboard';
import RNLinePanel from './components/RNLinePanel';
import RulesPanel from './components/RulesPanel';
import Scanner from './components/Scanner';


export default function App() {
    // 서버 상태
    const [serverMode, setServerMode] = useState<'checking' | 'live' | 'mock' | 'offline'>('checking');

    // 선택된 종목 코드
    const [selectedCode, setSelectedCode] = useState('005930'); // 기본: 삼성전자

    // API에서 가져온 종목 데이터
    const [stockData, setStockData] = useState<StockApiResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 최근 조회한 종목들 (탭으로 표시)
    const [recentStocks, setRecentStocks] = useState<{ code: string; name: string; sector: string }[]>([]);

    // ── 서버 상태 확인 (마운트 시 1회) ──
    useEffect(() => {
        checkServerStatus()
            .then((status) => setServerMode(status.mode === 'live' ? 'live' : 'mock'))
            .catch(() => setServerMode('offline'));
    }, []);

    // ── 종목 데이터 로드 ──
    const loadStockData = useCallback(async (code: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await fetchStockData(code);
            setStockData(data);

            // 최근 목록에 추가 (중복 제거, 최대 5개)
            setRecentStocks((prev) => {
                const filtered = prev.filter((s) => s.code !== code);
                return [{ code, name: data.name, sector: data.sector }, ...filtered].slice(0, 5);
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : '데이터 로드 실패');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 선택된 종목이 바뀌면 데이터 로드
    useEffect(() => {
        if (serverMode !== 'offline') {
            loadStockData(selectedCode);
        }
    }, [selectedCode, serverMode, loadStockData]);

    // ── 파생 데이터 계산 ──
    const stock: Stock | null = useMemo(() => {
        if (!stockData) return null;
        return {
            code: stockData.code,
            name: stockData.name,
            marketCap: stockData.marketCap,
            sector: stockData.sector,
            candles: stockData.candles,
        };
    }, [stockData]);

    const currentPrice = useMemo(
        () => stock && stock.candles.length > 0
            ? stock.candles[stock.candles.length - 1].close
            : 0,
        [stock]
    );

    const allRNLines = useMemo(() => generateRNLines(currentPrice), [currentPrice]);
    const { upper, lower } = useMemo(() => findAdjacentRNLines(currentPrice), [currentPrice]);

    const tradeState = useMemo(
        () => stock ? evaluateTradeState(stock.candles) : null,
        [stock]
    );

    const filterResult = useMemo(
        () => stock ? evaluateStock(stock) : null,
        [stock]
    );

    // ── 서버 오프라인 ──
    if (serverMode === 'offline') {
        return (
            <div className="app">
                <div className="glass-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
                    <h2 style={{ color: 'var(--accent-red)', marginBottom: '16px' }}>
                        ⚠️ 백엔드 서버에 연결할 수 없습니다
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                        아래 명령어로 백엔드 서버를 먼저 시작해주세요:
                    </p>
                    <code className="server-cmd">node server/server.js</code>
                    <p style={{ color: 'var(--text-muted)', marginTop: '16px', fontSize: '0.85rem' }}>
                        서버 시작 후 이 페이지를 새로고침하세요
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="app">
            {/* 헤더 */}
            <header className="app-header">
                <div>
                    <h1 className="app-title">RN존 매매법</h1>
                    <p className="app-subtitle">
                        복잡한 지표 없이 가격으로 승부하는 라운드 넘버 트레이딩 시스템
                    </p>
                </div>
                <div className="server-status">
                    <span className={`status-dot ${serverMode}`} />
                    <span className="status-text">
                        {serverMode === 'live' ? '네이버 실시간' :
                            serverMode === 'mock' ? '목 데이터' : '확인 중...'}
                    </span>
                </div>
            </header>

            {/* 스캐너 섹션 추가 */}
            <Scanner onSelect={setSelectedCode} selectedCode={selectedCode} />

            {/* 종목 검색기 */}

            <StockSelector
                selectedCode={selectedCode}
                onSelect={setSelectedCode}
                recentStocks={recentStocks}
                isLoading={isLoading}
            />

            {/* 에러 표시 */}
            {error && (
                <div className="error-banner">
                    ⚠️ {error}
                    <button onClick={() => loadStockData(selectedCode)} className="retry-btn">
                        다시 시도
                    </button>
                </div>
            )}

            {/* 로딩 중 */}
            {isLoading && !stockData && (
                <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>📊 종목 데이터 로딩 중...</p>
                </div>
            )}

            {/* 메인 콘텐츠 */}
            {stock && tradeState && filterResult && (
                <div className="main-grid" style={{ marginTop: '24px' }}>
                    {/* 왼쪽: 차트 + 대시보드 */}
                    <div className="left-panel">
                        <TradingChart
                            candles={stock.candles}
                            upperRN={upper}
                            lowerRN={lower}
                            allRNLines={allRNLines}
                        />
                        <Dashboard
                            tradeState={tradeState}
                            filterResult={filterResult}
                            currentPrice={currentPrice}
                            stockName={stock.name}
                        />
                    </div>

                    {/* 오른쪽: RN 라인 맵 + 5계명 */}
                    <div className="right-panel">
                        <RNLinePanel
                            allRNLines={allRNLines}
                            upperRN={upper}
                            lowerRN={lower}
                            currentPrice={currentPrice}
                        />
                        <RulesPanel />
                    </div>
                </div>
            )}
        </div>
    );
}
