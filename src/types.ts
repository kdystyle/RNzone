// ============================
// RN존 매매법 — 전체 타입 정의
// ============================

/** 캔들 데이터 (OHLC + 거래대금) */
export interface CandleData {
  time: string;       // 'YYYY-MM-DD'
  open: number;
  high: number;
  low: number;
  close: number;
  tradingValue: number; // 거래대금 (억 원 단위)
}

/** 종목 정보 */
export interface Stock {
  code: string;        // 종목 코드
  name: string;        // 종목명
  marketCap: number;   // 시가총액 (조 원 단위)
  sector: string;      // 업종
  candles: CandleData[];
}

/** RN 라인 (라운드 넘버 가격선) */
export interface RNLine {
  price: number;       // RN 가격
  label: string;       // 표시 라벨 (예: '10만', '15만')
  tickSize: number;    // 해당 구간 호가 단위
  distancePercent: number; // 현재가 대비 거리(%)
}

/** 매매 상태 열거형 */
export type TradePhase =
  | 'WATCHING'      // 감시 중 (종목 선별 단계)
  | 'SIGNAL'        // 상단 RN 터치/근접 신호 감지
  | 'ENTRY_ZONE'    // 하단 RN 매수 구간 진입
  | 'FIRST_BUY'     // 1차 매수 완료
  | 'SECOND_BUY'    // 2차 매수 완료
  | 'TAKE_PROFIT'   // 수익 실현 구간
  | 'TIME_CUT';     // 3개월 타임컷

/** 매매 상태 전체 */
export interface TradeState {
  phase: TradePhase;
  upperRN: RNLine | null;       // 추적 중인 상단 RN
  lowerRN: RNLine | null;       // 추적 중인 하단 RN
  upperTouched: boolean;        // 상단 RN 터치 여부
  firstEntryPrice: number | null;  // 1차 매수가 (하단 RN +4% 이내)
  secondEntryPrice: number | null; // 2차 매수가 (1차가 -20%)
  avgPrice: number | null;         // 평단가 (1:2 가중평균)
  targetLow: number | null;       // 목표 수익 하한 (평단가 +7%)
  targetHigh: number | null;      // 목표 수익 상한 (평단가 +20%)
  timeCutDate: string | null;     // 3개월 타임컷 만료일
}

/** 종목 필터 결과 */
export interface FilterResult {
  marketCapOk: boolean;    // 시총 10조+ 통과
  tradingValueOk: boolean; // 거래대금 1,500억+ 통과
  upperTouchOk: boolean;   // 상단 RN 터치/근접 통과
  allPassed: boolean;      // 3가지 모두 통과
  marketCapTier: 'large' | 'mid' | 'small'; // 체급 분류
}
