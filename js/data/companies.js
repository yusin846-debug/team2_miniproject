// js/data/companies.js
// 회사 마스터 데이터. write(선택 칩) · result(제안 생성) · archive(배지) 3개 화면이 공통으로 참조한다.
// 백엔드(GET /companies)가 붙기 전까지 사용하는 로컬 시드.

// 텍스트 마크 대신 벡터 로고를 쓰는 회사용 아이콘(뱃지 배경색 위에 흰색으로 얹힌다).
const CLOUD_LOGO_SVG = `<svg viewBox="0 0 64 64" width="68%" height="68%" fill="#fff" xmlns="http://www.w3.org/2000/svg"><path d="M46 42H18c-6.6 0-12-5.4-12-12s5.4-12 12-12c.9 0 1.8.1 2.6.3C23.4 13.4 28.3 10 34 10c7.2 0 13.1 5.4 13.9 12.4.4 0 .7-.1 1.1-.1 6.1 0 11 4.9 11 11S52.1 42 46 42z"/></svg>`;

export const COMPANIES = {
  '토스':       { color: '#3182F6', textColor: '#fff',    mark: 'toss', mission: "'금융의 모든 순간을 쉽고 간편하게'라는 미션", tone: '사용자의 금융 생활을 더 쉽게 만드는 서비스' },
  '네이버':     { color: '#03C75A', textColor: '#fff',    mark: 'N',    mission: "'사용자를 먼저 생각한다'는 철학",        tone: '더 많은 사람을 연결하는 서비스' },
  '카카오':     { color: '#FFE300', textColor: '#191600', mark: 'kakao',mission: "'사람과 사람을 잇는다'는 가치",          tone: '일상에 즐거움을 주는 서비스' },
  '배달의민족': { color: '#2AC1BC', textColor: '#fff',    mark: '배민', mission: "'문화를 만든다'는 자부심",              tone: '일상에 재미를 더하는 서비스' },
  '당근':       { color: '#FF6F0F', textColor: '#fff',    mark: '당근', mission: "'이웃과 연결된다'는 미션",              tone: '따뜻한 동네 생활을 돕는 서비스' },
  '쿠팡':       { color: '#E51A1A', textColor: '#fff',    mark: 'C',    mission: "'고객 감동'이라는 원칙",                tone: '고객의 생활을 편리하게 만드는 서비스' },
  '세일즈포스': { color: '#00A1E0', textColor: '#fff',    logo: CLOUD_LOGO_SVG, mission: "'고객 성공(Customer Success)'이라는 철학", tone: '고객 관계를 혁신하는 클라우드 서비스' },
};

// "자주 찾는 회사" 노출 순서
export const COMPANY_ORDER = ['토스', '네이버', '카카오', '배달의민족', '당근', '쿠팡', '세일즈포스'];

// 회사 배지(아이콘) 스타일 계산
export function badgeStyle(name, size = 32) {
  const c = COMPANIES[name] || { color: '#8B9098', textColor: '#fff', mark: (name || '?')[0] };
  const base = `width:${size}px;height:${size}px;border-radius:9px;background:${c.color};`
    + `display:inline-flex;align-items:center;justify-content:center;flex:none;`;

  if (c.logo) {
    return { css: base, mark: c.logo };
  }

  const mark = c.mark || (name || '?')[0];
  const small = mark.length > 2;
  return {
    css: base + `color:${c.textColor};`
       + `font-weight:800;font-size:${small ? Math.round(size * 0.34) : Math.round(size * 0.46)}px;letter-spacing:-.02em`,
    mark,
  };
}

// 본문에서 "원본(이전 지원) 회사"를 감지하는 detectOrigin() 은 js/lib/matcher.js 가 소유한다
// (팀원 C AI 분석 담당 — company 카테고리 매칭과 같은 곳에서 관리).
