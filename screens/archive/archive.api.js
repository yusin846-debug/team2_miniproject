// screens/archive/archive.api.js
// 담당: 팀원 C
// 보관함 CRUD 서비스.
//
// [현재] /api/letters 서버가 없으면 로컬 시드 데이터로 폴백
// [추후] server/archive/letters.route.js 완성 후 USE_SERVER = true 로 변경

import { get, post, del } from '../../shared/js/lib/http.js';

const USE_SERVER = false; // server/archive/letters.route.js 준비되면 true 로 변경

export const ARCHIVE_SEED = [
  {
    id: 'a1', company: '네이버', role: '프로덕트 디자이너', date: '2026.06.21', count: 7,
    question: '본인이 생각하는 좋은 프로덕트란 무엇이며, 이를 위해 어떤 노력을 해왔는지 서술해 주세요.',
    content: "저는 네이버가 추구하는 '사용자를 먼저 생각한다'는 철학에 깊이 공감하여 지원하게 되었습니다. 대학 시절 UX 동아리에서 모바일 서비스 개선 프로젝트를 진행하며, 사용자의 불편을 데이터로 증명하고 빠르게 개선하는 경험을 쌓았습니다.\n\n좋은 프로덕트란 사용자의 문제를 정확히 정의하고 가장 단순한 방법으로 풀어내는 것이라 생각합니다. 입사 후에도 사용자를 먼저 생각하는 디자이너가 되겠습니다.",
  },
  {
    id: 'a2', company: '배달의민족', role: '브랜드 디자이너', date: '2026.06.14', count: 5,
    question: '지원 동기와 입사 후 이루고 싶은 목표를 서술해 주세요.',
    content: "'문화를 만든다'는 자부심에 끌려 지원하게 되었습니다. 사용자의 일상에 재미를 더하는 브랜드를 만들고 싶었기 때문입니다.\n\n대학 시절 브랜드 프로젝트를 이끌며 톤앤매너를 일관되게 설계하는 경험을 쌓았습니다. 입사 후 배달의민족만의 위트가 담긴 브랜드 경험을 만들어 내고 싶습니다.",
  },
  {
    id: 'a3', company: '쿠팡', role: 'UX 디자이너', date: '2026.05.30', count: 6,
    question: '가장 도전적이었던 경험과 그로부터 배운 점을 작성해 주세요.',
    content: "'고객 감동'이라는 원칙 아래, 사용자의 불편을 데이터로 증명하고 빠르게 개선하는 경험을 쌓았습니다.\n\n가장 도전적이었던 것은 3주 만에 결제 플로우를 재설계한 프로젝트였습니다. 촉박한 일정 속에서도 사용성 테스트를 놓치지 않았고, 이탈률을 크게 낮췄습니다. 제약 속에서 우선순위를 정하는 법을 배웠습니다.",
  },
];

function snippetOf(content = '') {
  const raw = content.replace(/\n+/g, ' ').trim();
  return raw.length > 80 ? raw.slice(0, 80) + '…' : raw;
}

function todayLabel() {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export async function fetchLetters(query = '') {
  if (!USE_SERVER) {
    const q = query.trim().toLowerCase();
    return ARCHIVE_SEED
      .filter((a) => !q || `${a.company}${a.role}${a.question || ''}${a.content || ''}`.toLowerCase().includes(q))
      .map((a) => ({ ...a, snippet: snippetOf(a.content) }));
  }
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  return get(`/api/letters?${params}`);
}

export async function fetchLetter(id) {
  if (!USE_SERVER) return ARCHIVE_SEED.find((a) => a.id === id) || null;
  return get(`/api/letters/${id}`);
}

export async function saveLetter(payload) {
  if (!USE_SERVER) {
    const item = { id: 'a' + Date.now(), date: todayLabel(), ...payload };
    ARCHIVE_SEED.unshift(item);
    return item;
  }
  return post('/api/letters', payload);
}

export async function deleteLetter(id) {
  if (!USE_SERVER) {
    const i = ARCHIVE_SEED.findIndex((a) => a.id === id);
    if (i > -1) ARCHIVE_SEED.splice(i, 1);
    return null;
  }
  return del(`/api/letters/${id}`);
}
