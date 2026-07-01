// js/lib/matcher.js
// 자소서 환승 분석 엔진 (MVP, 규칙 기반) — AI 서버(api/analyze.js) 미연동/실패 시 폴백으로 쓰인다.
// 담당: 팀원 C

import { COMPANIES, COMPANY_ORDER } from '../data/companies.js';
import { CATEGORIES, CATEGORY_ORDER } from '../data/categories.js';
import { MATCH_RULES, GRAMMAR_FIX } from '../data/samples.js';

// 본문에서 "원본(이전 지원) 회사"를 감지한다. target 과 다른 회사를 우선 탐색.
export function detectOrigin(text = '', target = '') {
  for (const name of COMPANY_ORDER) {
    if (name !== target && text.includes(name)) return name;
  }
  for (const name of Object.keys(COMPANIES)) {
    if (text.includes(name)) return name;
  }
  return '—';
}

// 적용 가능한 환승 제안 목록을 만든다.
// 반환: [{ id, category, label, color, bg, original, suggestion, reason, found }]
export function buildSuggestions({ text = '', target = '', role = '' }) {
  const origin = detectOrigin(text, target);
  const tp = COMPANIES[target] || {
    mission: `'${target}'의 핵심 가치`,
    tone: `${target}가 추구하는 가치를 담은 서비스`,
  };

  const raw = {
    company:  { match: origin,               suggestion: target },
    keyword:  { match: MATCH_RULES.keyword,  suggestion: tp.mission },
    position: { match: MATCH_RULES.position, suggestion: role },
    grammar:  { match: MATCH_RULES.grammar,  suggestion: GRAMMAR_FIX },
    tone:     { match: MATCH_RULES.tone,     suggestion: tp.tone },
  };

  const list = [];
  for (const id of CATEGORY_ORDER) {
    const r = raw[id];
    const cat = CATEGORIES[id];
    // company 는 origin 감지 시에만, 나머지는 본문에 기준 문구가 있을 때만 제안
    const found = id === 'company'
      ? origin !== '—' && text.includes(origin)
      : text.includes(r.match);
    if (!found) continue;
    list.push({
      id,
      category: id,
      label: cat.label,
      color: cat.color,
      bg: cat.bg,
      original: r.match,
      suggestion: r.suggestion,
      reason: cat.reason,
    });
  }
  return { origin, suggestions: list };
}

// 적용된 제안(appliedIds)을 반영한 최종 자소서 본문을 만든다.
// company 를 포함한 모든 카테고리는 s.original → s.suggestion 로 첫 일치만 치환한다.
// (본문 전체에서 회사명을 일괄 치환하면 경력 설명 문맥까지 바뀌어버리므로,
//  회사명도 AI 가 지원동기 문맥으로 판단해 돌려준 문구만 치환 대상으로 삼는다.)
export function applySuggestions(text, suggestions, appliedIds) {
  let out = text;
  for (const s of suggestions) {
    if (appliedIds.includes(s.id)) out = out.replace(s.original, s.suggestion);
  }
  return out;
}
