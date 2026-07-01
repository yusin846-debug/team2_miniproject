// screens/result/result.state.js
// 담당: 팀원 B (AI 첨삭 핵심)
// 자소서 환승 분석 엔진(MVP, 규칙 기반) + 결과 화면 상태 슬라이스.
// ─────────────────────────────────────────────────────────────
// ⚠️ 추후 계획: buildSuggestions() 의 시그니처는 그대로 두고, 내부 구현만
//    server/result/claude.service.js (Claude API 첨삭) 호출로 교체한다.
//    호출부(screens/write/write.api.js)는 buildSuggestions() 시그니처만 의존하므로 영향 없음.
// ─────────────────────────────────────────────────────────────

import { getState, setState } from '../../shared/js/state.js';
import { COMPANIES, COMPANY_ORDER, detectOrigin } from '../../shared/js/lib/companies.js';
import { saveResult } from './result.api.js';
import { enterArchive } from '../archive/archive.state.js';

export const CATEGORIES = {
  company:  { label: '회사명',      color: '#2563FF', bg: '#E7EEFF', reason: '이전 회사명이 본문에 남아 있어 목표 회사명으로 교체합니다.' },
  keyword:  { label: '인재상·가치', color: '#0E9F8E', bg: '#E1F5F2', reason: '목표 회사의 미션·가치에 맞춰 공감 포인트를 조정합니다.' },
  position: { label: '직군·포지션', color: '#7C3AED', bg: '#F1EBFE', reason: '지원하는 직군에 맞는 표현으로 바꿉니다.' },
  grammar:  { label: '문장·맞춤법', color: '#D97706', bg: '#FDF1E1', reason: '장황한 표현을 구체적이고 간결하게 다듬습니다.' },
  tone:     { label: '지원동기 톤', color: '#E11D70', bg: '#FCE6F0', reason: '지원동기 톤을 목표 회사의 서비스 톤에 맞춥니다.' },
};
export const CATEGORY_ORDER = ['company', 'keyword', 'position', 'grammar', 'tone'];

// 매칭 엔진이 찾는 기준 문구 (샘플 자소서 기준 — 실 서비스에서는 AI 분석 결과로 대체)
export const MATCH_RULES = {
  keyword:  "'사람과 사람을 잇는다'는 가치",
  position: 'UX 디자이너',
  grammar:  '저는 이런 과정을 통해서 좋은 디자이너가 되기 위해 노력을 많이 하였습니다.',
  tone:     '일상에 즐거움을 주는 서비스',
};
export const GRAMMAR_FIX = '이 경험을 통해 사용자 중심으로 사고하는 디자이너로 성장했습니다.';

export const resultInitialState = {
  origin: '—',
  suggestions: [],   // [{ id, category, label, color, bg, original, suggestion, reason }]
  appliedIds: [],
  activeId: null,
  savedModal: false,
};

// 적용 가능한 환승 제안 목록을 만든다. (screens/write 가 "환승 준비하기" 시 호출)
export function buildSuggestions({ text = '', target = '', role = '' }) {
  const origin = detectOrigin(text, target);
  const tp = COMPANIES[target] || {
    mission: `'${target}'의 핵심 가치`,
    tone: `${target}가 추구하는 가치를 담은 서비스`,
  };

  const raw = {
    company:  { match: origin,               all: true,  suggestion: target },
    keyword:  { match: MATCH_RULES.keyword,  all: false, suggestion: tp.mission },
    position: { match: MATCH_RULES.position, all: false, suggestion: role },
    grammar:  { match: MATCH_RULES.grammar,  all: false, suggestion: GRAMMAR_FIX },
    tone:     { match: MATCH_RULES.tone,     all: false, suggestion: tp.tone },
  };

  const list = [];
  for (const id of CATEGORY_ORDER) {
    const r = raw[id];
    const cat = CATEGORIES[id];
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
      all: r.all,
      suggestion: r.suggestion,
      reason: cat.reason,
    });
  }
  return { origin, suggestions: list };
}

// 적용된 제안(appliedIds)을 반영한 최종 자소서 본문을 만든다.
export function applySuggestions(text, suggestions, appliedIds, origin, target) {
  let out = text;
  if (appliedIds.includes('company') && origin && origin !== '—') {
    out = out.split(origin).join(target); // 회사명은 전체 치환
  }
  for (const s of suggestions) {
    if (s.id === 'company') continue;
    if (appliedIds.includes(s.id)) out = out.replace(s.original, s.suggestion); // 첫 일치만 치환
  }
  return out;
}

// 본문에서 제안 문구가 등장하는 위치를 찾아 겹치지 않게 정렬한다. (미리보기 하이라이트용)
function findOccurrences(text, suggestions) {
  const occ = [];
  suggestions.forEach((s) => {
    if (s.all) {
      let i = 0;
      while ((i = text.indexOf(s.original, i)) !== -1) { occ.push({ start: i, end: i + s.original.length, s }); i += s.original.length; }
    } else {
      const i = text.indexOf(s.original);
      if (i !== -1) occ.push({ start: i, end: i + s.original.length, s });
    }
  });
  occ.sort((a, b) => a.start - b.start);
  const out = [];
  let last = -1;
  occ.forEach((o) => { if (o.start >= last) { out.push(o); last = o.end; } });
  return out;
}

// 미리보기용 세그먼트(일반 텍스트 / 카테고리별 하이라이트) 배열을 만든다.
export function buildSegments(text, suggestions, appliedIds, activeId, target) {
  const occ = findOccurrences(text, suggestions);
  const segments = [];
  let cur = 0;
  occ.forEach((o) => {
    if (o.start > cur) segments.push({ plain: true, text: text.slice(cur, o.start) });
    const applied = appliedIds.includes(o.s.id);
    const disp = applied ? (o.s.id === 'company' ? target : o.s.suggestion) : text.slice(o.start, o.end);
    segments.push({
      plain: false,
      text: disp,
      id: o.s.id,
      applied,
      active: activeId === o.s.id,
      color: applied ? '#0E8C74' : o.s.color,
      bg: applied ? '#E2F7F2' : o.s.bg,
    });
    cur = o.end;
  });
  if (cur < text.length) segments.push({ plain: true, text: text.slice(cur) });
  return segments;
}

function toggleSuggestion(id) {
  const s = getState();
  const set = new Set(s.appliedIds);
  set.has(id) ? set.delete(id) : set.add(id);
  setState({ appliedIds: [...set], activeId: id });
}

function toggleAll() {
  const s = getState();
  const allOn = s.appliedIds.length === s.suggestions.length && s.suggestions.length > 0;
  setState({ appliedIds: allOn ? [] : s.suggestions.map((x) => x.id) });
}

function finalText(s) {
  const target = s.customCompany || s.target;
  return applySuggestions(s.text, s.suggestions, s.appliedIds, s.origin, target);
}

async function copyResult() {
  const s = getState();
  try {
    await navigator.clipboard.writeText(finalText(s));
    setState({ toast: '복사했어요! 바로 붙여넣으세요.' });
  } catch {
    setState({ toast: '복사에 실패했어요.' });
  }
  setTimeout(() => setState({ toast: '' }), 2200);
}

async function saveResult_() {
  const s = getState();
  const target = s.customCompany || s.target;
  const content = finalText(s);
  await saveResult({
    company: target,
    role: s.role,
    question: s.question,
    content,
    count: s.appliedIds.length,
  });
  setState({ savedModal: true });
}

export const resultActions = {
  'result:back':        () => setState({ stage: 'input' }),
  'result:select':      (_e, el) => setState({ activeId: el.dataset.id }),
  'result:toggle':      (e, el) => { e.stopPropagation(); toggleSuggestion(el.dataset.id); },
  'result:applyAll':    () => toggleAll(),
  'result:copy':        () => copyResult(),
  'result:save':        () => saveResult_(),
  'result:saved-close': () => setState({ savedModal: false }),
  'result:saved-goto-archive': () => { setState({ savedModal: false }); enterArchive(); },
};
