// ============================
// RN존 5계명 패널 (해설서 6장)
// 토글 접기/펼치기 지원
// ============================

import { useState } from 'react';

/** 해설서 6장의 5계명 데이터 */
const RULES = [
    {
        title: '테마 중복 금지',
        desc: '동일 테마 내에서는 아무리 좋아 보여도 2종목 이상 매수하지 마십시오.',
    },
    {
        title: '신용 및 몰빵 금지',
        desc: '주식에 영원한 상승은 없습니다. 분산 투자가 심리적 필승법입니다.',
    },
    {
        title: '예약 매매의 습관화',
        desc: '가격은 이미 정해져 있습니다. 차트를 보지 말고 미리 그물을 치십시오.',
    },
    {
        title: '수익을 주는 종목이 진짜 우량주',
        desc: '이름값만 높은 대형주에 집착하지 마십시오. 나에게 수익을 주는 가격대에 온 종목이 진정한 우량주입니다.',
    },
    {
        title: '소액 검증 우선',
        desc: '큰돈을 넣기 전, 소액으로 충분한 데이터를 쌓아 기법에 대한 확신을 먼저 가지십시오.',
    },
];

export default function RulesPanel() {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="glass-card rules-panel" onClick={() => setIsOpen(!isOpen)}>
            <button className="rules-toggle">
                <span className="card-title" style={{ margin: 0 }}>
                    📜 평생 수익을 지키는 RN존 5계명
                </span>
                <span className={`rules-toggle-icon ${isOpen ? 'open' : ''}`}>
                    ▼
                </span>
            </button>

            {isOpen && (
                <div className="rules-list" onClick={(e) => e.stopPropagation()}>
                    {RULES.map((rule, i) => (
                        <div key={i} className="rule-item">
                            <span className="rule-number">{i + 1}</span>
                            <div>
                                <strong>{rule.title}</strong>
                                <br />
                                <span style={{ fontSize: '0.75rem' }}>{rule.desc}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
