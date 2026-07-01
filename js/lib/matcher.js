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

// original/suggestion 두 문장의 공통 앞/뒤 부분을 잘라내고, 실제로 달라진 구간만 반환한다.
// start 는 original 안에서 그 구간이 시작하는 글자 위치.
export function diffSpan(original, suggestion) {
  let start = 0;
  const minLen = Math.min(original.length, suggestion.length);
  while (start < minLen && original[start] === suggestion[start]) start++;

  let endOrig = original.length;
  let endSugg = suggestion.length;
  while (endOrig > start && endSugg > start && original[endOrig - 1] === suggestion[endSugg - 1]) {
    endOrig--;
    endSugg--;
  }

  const from = original.slice(start, endOrig);
  const to = suggestion.slice(start, endSugg);
  return from || to ? { from, to, start } : { from: original, to: suggestion, start: 0 };
}

// 제안 목록을 "본문 안에서 실제로 바뀌는 글자 구간" 단위로 변환한다.
// 같은 문장을 통째로 치환하는 대신 diffSpan 으로 좁힌 구간만 쓰기 때문에,
// 한 문장 안에 서로 다른 카테고리의 수정이 여러 개 있어도(예: 회사명 + 직군) 충돌 없이 함께 반영된다.
// 구간이 진짜로 겹치는 경우에만 CATEGORY_ORDER 우선순위가 높은 쪽을 남긴다.
export function computeSuggestionEdits(text, suggestions) {
  const edits = [];
  for (const s of suggestions) {
    const sentenceStart = text.indexOf(s.original);
    if (sentenceStart === -1) continue;
    const { from, to, start } = diffSpan(s.original, s.suggestion);
    edits.push({
      id: s.id,
      category: s.category,
      color: s.color,
      bg: s.bg,
      start: sentenceStart + start,
      end: sentenceStart + start + from.length,
      from,
      to,
    });
  }

  edits.sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));
  const accepted = [];
  for (const e of edits) {
    const overlaps = accepted.some((a) => e.start < a.end && a.start < e.end);
    if (!overlaps) accepted.push(e);
  }
  return accepted.sort((a, b) => a.start - b.start);
}

// 적용된 제안(appliedIds)을 반영한 최종 자소서 본문을 만든다.
export function applySuggestions(text, suggestions, appliedIds) {
  const applied = suggestions.filter((s) => appliedIds.includes(s.id));
  const edits = computeSuggestionEdits(text, applied).sort((a, b) => b.start - a.start); // 뒤에서부터 치환해야 앞쪽 위치가 안 밀림
  let out = text;
  for (const e of edits) {
    out = out.slice(0, e.start) + e.to + out.slice(e.end);
  }
  return out;
}
