// ============================
// 한국 주요 종목 마스터 리스트
// KIS API에는 종목 검색 기능이 없으므로
// 로컬 리스트에서 검색 후 → API로 데이터 조회
// ============================

/** 주요 종목 리스트 (코드, 이름, 업종, 시가총액 구간) */
export const STOCK_LIST = [
    // ── 반도체 ──
    { code: '005930', name: '삼성전자', sector: '반도체', tier: 'large' },
    { code: '000660', name: 'SK하이닉스', sector: '반도체', tier: 'large' },
    { code: '042700', name: '한미반도체', sector: '반도체', tier: 'mid' },
    { code: '403870', name: 'HPSP', sector: '반도체', tier: 'mid' },
    { code: '036930', name: '주성엔지니어링', sector: '반도체', tier: 'mid' },
    { code: '460860', name: '피엠티', sector: '반도체', tier: 'mid' },

    // ── 자동차 ──
    { code: '005380', name: '현대차', sector: '자동차', tier: 'large' },
    { code: '000270', name: '기아', sector: '자동차', tier: 'large' },
    { code: '012330', name: '현대모비스', sector: '자동차부품', tier: 'large' },
    { code: '018880', name: '한온시스템', sector: '자동차부품', tier: 'mid' },

    // ── IT/플랫폼 ──
    { code: '035420', name: 'NAVER', sector: 'IT서비스', tier: 'large' },
    { code: '035720', name: '카카오', sector: 'IT서비스', tier: 'large' },
    { code: '263750', name: '펄어비스', sector: '게임', tier: 'mid' },
    { code: '251270', name: '넷마블', sector: '게임', tier: 'mid' },
    { code: '259960', name: '크래프톤', sector: '게임', tier: 'large' },
    { code: '041510', name: 'SM', sector: '엔터', tier: 'mid' },
    { code: '352820', name: '하이브', sector: '엔터', tier: 'mid' },
    { code: '122870', name: 'YG PLUS', sector: '엔터', tier: 'mid' },

    // ── 금융 ──
    { code: '055550', name: '신한지주', sector: '금융', tier: 'large' },
    { code: '105560', name: 'KB금융', sector: '금융', tier: 'large' },
    { code: '086790', name: '하나금융지주', sector: '금융', tier: 'large' },
    { code: '316140', name: '우리금융지주', sector: '금융', tier: 'large' },
    { code: '138930', name: 'BNK금융지주', sector: '금융', tier: 'mid' },

    // ── 바이오/제약 ──
    { code: '207940', name: '삼성바이오로직스', sector: '바이오', tier: 'large' },
    { code: '068270', name: '셀트리온', sector: '바이오', tier: 'large' },
    { code: '326030', name: 'SK바이오팜', sector: '바이오', tier: 'mid' },
    { code: '145020', name: '휴젤', sector: '바이오', tier: 'mid' },
    { code: '196170', name: '알테오젠', sector: '바이오', tier: 'mid' },
    { code: '006280', name: '녹십자', sector: '제약', tier: 'mid' },

    // ── 에너지/화학 ──
    { code: '096770', name: 'SK이노베이션', sector: '에너지', tier: 'large' },
    { code: '051910', name: 'LG화학', sector: '화학', tier: 'large' },
    { code: '006400', name: '삼성SDI', sector: '2차전지', tier: 'large' },
    { code: '373220', name: 'LG에너지솔루션', sector: '2차전지', tier: 'large' },
    { code: '247540', name: '에코프로비엠', sector: '2차전지', tier: 'mid' },
    { code: '086520', name: '에코프로', sector: '2차전지', tier: 'mid' },
    { code: '003670', name: '포스코퓨처엠', sector: '2차전지', tier: 'mid' },

    // ── 철강/소재 ──
    { code: '005490', name: 'POSCO홀딩스', sector: '철강', tier: 'large' },
    { code: '010130', name: '고려아연', sector: '비철금속', tier: 'large' },

    // ── 건설/조선 ──
    { code: '009540', name: '한국조선해양', sector: '조선', tier: 'large' },
    { code: '329180', name: 'HD현대중공업', sector: '조선', tier: 'large' },
    { code: '042660', name: '한화오션', sector: '조선', tier: 'large' },
    { code: '000720', name: '현대건설', sector: '건설', tier: 'mid' },

    // ── 통신 ──
    { code: '017670', name: 'SK텔레콤', sector: '통신', tier: 'large' },
    { code: '030200', name: 'KT', sector: '통신', tier: 'large' },
    { code: '032640', name: 'LG유플러스', sector: '통신', tier: 'mid' },

    // ── 유통/소비 ──
    { code: '004170', name: '신세계', sector: '유통', tier: 'mid' },
    { code: '139480', name: '이마트', sector: '유통', tier: 'mid' },
    { code: '069960', name: '현대백화점', sector: '유통', tier: 'mid' },
    { code: '097950', name: 'CJ제일제당', sector: '식품', tier: 'mid' },
    { code: '051600', name: '한전KPS', sector: '전력', tier: 'mid' },

    // ── 전기/전자 ──
    { code: '066570', name: 'LG전자', sector: '전자', tier: 'large' },
    { code: '009150', name: '삼성전기', sector: '전자부품', tier: 'large' },
    { code: '010950', name: 'S-Oil', sector: '정유', tier: 'mid' },

    // ── 방산/항공 ──
    { code: '012450', name: '한화에어로스페이스', sector: '방산', tier: 'large' },
    { code: '047810', name: '한국항공우주', sector: '방산', tier: 'large' },
    { code: '000880', name: '한화', sector: '방산', tier: 'mid' },
    { code: '272210', name: '한화시스템', sector: '방산', tier: 'mid' },

    // ── 기타 대형 ──
    { code: '034730', name: 'SK', sector: '지주', tier: 'large' },
    { code: '003550', name: 'LG', sector: '지주', tier: 'large' },
    { code: '028260', name: '삼성물산', sector: '지주', tier: 'large' },
    { code: '018260', name: '삼성에스디에스', sector: 'IT서비스', tier: 'large' },
    { code: '030000', name: '제일기획', sector: '광고', tier: 'mid' },

    // ── AI/로봇 ──
    { code: '443060', name: '레인보우로보틱스', sector: '로봇', tier: 'mid' },
    { code: '454910', name: '두산로보틱스', sector: '로봇', tier: 'mid' },
];

/**
 * 종목 검색 (이름 또는 코드 부분 일치)
 * 왜 로컬인가? → KIS에 검색 API가 없으므로 로컬 리스트에서 필터링
 */
export function searchStocks(query) {
    if (!query || query.trim().length === 0) return STOCK_LIST.slice(0, 20);

    const q = query.trim().toLowerCase();
    return STOCK_LIST.filter(
        (s) =>
            s.name.toLowerCase().includes(q) ||
            s.code.includes(q) ||
            s.sector.toLowerCase().includes(q)
    ).slice(0, 20);
}
