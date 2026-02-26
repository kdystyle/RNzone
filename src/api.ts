// ============================
// 프론트엔드 API 클라이언트
// - 백엔드 프록시 서버(3001)와 통신
// - 종목 검색, 데이터 조회
// ============================

const API_BASE = '/api';

/** 종목 검색 결과 타입 */
export interface StockSearchResult {
    code: string;
    name: string;
    sector: string;
    tier: 'large' | 'mid';
}

/** 스캐너 결과 아이템 */
export interface ScannerResult extends StockSearchResult {
    status: 'entry' | 'watch';
    gap: number;
    currentPrice: number;
}

/** API에서 반환하는 종목 데이터 */
export interface StockApiResponse {
    code: string;
    name: string;
    sector: string;
    tier: string;
    marketCap: number;
    candles: {
        time: string;
        open: number;
        high: number;
        low: number;
        close: number;
        tradingValue: number;
    }[];
    currentPrice: number | null;
    change?: number;
    changeRate?: number;
    tradingValue?: number;
    source: 'naver' | 'mock' | 'mock-fallback';
    error?: string;
}

/** 서버 상태 */
export interface ServerStatus {
    status: string;
    mode: 'live' | 'mock';
    source: string;
    stockCount: number;
}

/**
 * 종목 검색 (이름/코드/업종으로)
 */
export async function searchStocks(query: string): Promise<StockSearchResult[]> {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('종목 검색 실패');
    return res.json();
}

/**
 * 종목 상세 데이터 조회 (캔들 + 현재가 + 시총)
 */
export async function fetchStockData(code: string): Promise<StockApiResponse> {
    const res = await fetch(`${API_BASE}/stock/${code}`);
    if (!res.ok) throw new Error('종목 데이터 조회 실패');
    return res.json();
}

/**
 * 서버 상태 확인
 */
export async function checkServerStatus(): Promise<ServerStatus> {
    const res = await fetch(`${API_BASE}/status`);
    if (!res.ok) throw new Error('서버 연결 실패');
    return res.json();
}

/**
 * RN 존 스캐너 실행
 */
export async function fetchScanner(): Promise<ScannerResult[]> {
    const res = await fetch(`${API_BASE}/scanner`);
    if (!res.ok) throw new Error('스캔 실패');
    const data = await res.json();
    return data.results;
}
