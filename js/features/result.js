// js/features/result.js
// 담당: 팀원 B / 팀원 C (AI 첨삭 결과)
// 환승 결과 — 카테고리별 하이라이트 미리보기 + 잡도리 제안 (적용/전체적용/복사/저장)

import { getState, setState } from '../state.js';
import { badgeStyle } from '../data/companies.js';
import { escapeHtml } from '../lib/dom.js';
import { applySuggestions } from '../lib/matcher.js';
import { saveLetter } from '../services/letters.js';
import { CATEGORIES, CATEGORY_ORDER } from '../data/categories.js';
import { enterArchive } from './archive.js';

export const resultInitialState = {
  origin: '—',
  suggestions: [],   // [{ id, category, label, color, bg, original, suggestion, reason }]
  appliedIds: [],
  activeId: null,
  savedModal: false,
};

// 본문에서 제안 문구가 등장하는 위치를 찾아 겹치지 않게 정렬한다. (미리보기 하이라이트용)
// api/analyze.js 가 company 카테고리를 문장 단위로 이미 여러 건(company, company-1, …)으로
// 쪼개서 내려주므로, 여기서는 각 제안을 그 original 문구가 처음 등장하는 위치 1곳에만 매칭하면 된다.
function findOccurrences(text, suggestions) {
  const occ = [];
  suggestions.forEach((s) => {
    const i = text.indexOf(s.original);
    if (i !== -1) occ.push({ start: i, end: i + s.original.length, s });
  });
  occ.sort((a, b) => a.start - b.start);
  const out = [];
  let last = -1;
  occ.forEach((o) => { if (o.start >= last) { out.push(o); last = o.end; } });
  return out;
}

// 미리보기용 세그먼트(일반 텍스트 / 카테고리별 하이라이트) 배열을 만든다.
function buildSegments(text, suggestions, appliedIds, activeId) {
  const occ = findOccurrences(text, suggestions);
  const segments = [];
  let cur = 0;
  occ.forEach((o) => {
    if (o.start > cur) segments.push({ plain: true, text: text.slice(cur, o.start) });
    const applied = appliedIds.includes(o.s.id);
    segments.push({
      plain: false,
      text: applied ? o.s.suggestion : text.slice(o.start, o.end),
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

export function resultView(state) {
  const target = state.customCompany || state.target;
  const total = state.suggestions.length;
  const applied = state.appliedIds.length;
  const allOn = applied === total && total > 0;
  const b = badgeStyle(target, 28);

  const segments = buildSegments(state.text, state.suggestions, state.appliedIds, state.activeId);
  const previewHtml = segments.map((seg) => {
    if (seg.plain) return escapeHtml(seg.text);
    const style = `color:${seg.color};background:${seg.bg};border-bottom:2px solid ${seg.color};border-radius:4px;padding:1px 3px;font-weight:${seg.applied ? 700 : 600};cursor:pointer;${seg.active ? `box-shadow:0 0 0 2px ${seg.color};` : ''}`;
    return `<span style="${style}" data-action="result:select" data-id="${seg.id}">${escapeHtml(seg.text)}</span>`;
  }).join('');

  const legend = CATEGORY_ORDER.map((id) => {
    const c = CATEGORIES[id];
    return `<span class="legend-item"><span class="legend-item__dot" style="background:${c.color}"></span>${c.label}</span>`;
  }).join('');

  const cards = state.suggestions.map((s) => {
    const on = state.appliedIds.includes(s.id);
    const active = state.activeId === s.id;
    return `
      <div class="sugg ${on ? 'is-on' : ''} ${active ? 'is-active' : ''}" data-action="result:select" data-id="${s.id}">
        <div class="sugg__head">
          <span class="sugg__tag" style="background:${s.bg};color:${s.color}">${s.label}</span>
          <button class="sugg__toggle ${on ? 'is-on' : ''}" data-action="result:toggle" data-id="${s.id}">
            ${on ? '적용됨 ✓' : '적용'}
          </button>
        </div>
        <div class="sugg__diff">
          <span class="sugg__from">${escapeHtml(s.original)}</span>
          <span class="sugg__arrow">→</span>
          <span class="sugg__to">${escapeHtml(s.suggestion)}</span>
        </div>
        <p class="sugg__reason">${escapeHtml(s.reason)}</p>
      </div>`;
  }).join('');

  const savedModal = state.savedModal ? `
    <div class="modal-overlay">
      <div class="modal-card saved-modal">
        <div class="saved-modal__ico">✓</div>
        <div class="saved-modal__title">보관함에 저장했어요</div>
        <div class="saved-modal__desc">${escapeHtml(target)} ${escapeHtml(state.role)} 자소서<br>다음 지원 때 다시 꺼내 환승하세요.</div>
        <div class="saved-modal__actions">
          <button class="btn btn--ghost" data-action="result:saved-close">계속 편집</button>
          <button class="btn btn--primary" data-action="result:saved-goto-archive">보관함 보기</button>
        </div>
      </div>
    </div>` : '';

  return `
  <section class="container result">
    <div class="result__top">
      <button class="link-back" data-action="result:back">← 다시 작성</button>
      <div class="result__meta">
        <span class="badge" style="${b.css}">${b.mark}</span>
        <strong>${escapeHtml(target)}</strong>
        <span class="result__dot">·</span>
        <span class="result__role">${escapeHtml(state.role)}</span>
      </div>
      <span class="result__count">수정 제안 <b>${total}</b>곳 · 적용 <b class="is-accent">${applied}</b></span>
    </div>

    <div class="result__grid">
      <!-- 미리보기 -->
      <div class="card preview">
        <div class="preview__head">
          <span class="preview__label">환승 미리보기</span>
          <div class="legend">${legend}</div>
        </div>
        ${state.question ? `<div class="preview__question"><span>Q.</span>${escapeHtml(state.question)}</div>` : ''}
        <div class="preview__body">${previewHtml}</div>
      </div>

      <!-- 제안 -->
      <aside class="suggestions">
        <div class="suggestions__head">
          <h3>잡도리 제안 <b>${total}</b>건</h3>
          <button class="btn btn--soft" data-action="result:applyAll">${allOn ? '모두 해제' : '모두 적용'}</button>
        </div>
        <div class="suggestions__list">${cards || '<p class="empty">적용할 제안이 없어요.</p>'}</div>
        <div class="result__actions">
          <button class="btn btn--outline" data-action="result:copy">복사하기</button>
          <button class="btn btn--primary" data-action="result:save">보관함에 저장</button>
        </div>
      </aside>
    </div>
  </section>
  ${savedModal}`;
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
  return applySuggestions(s.text, s.suggestions, s.appliedIds);
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

async function saveResult() {
  const s = getState();
  const target = s.customCompany || s.target;
  const content = finalText(s);
  await saveLetter({
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
  'result:save':        () => saveResult(),
  'result:saved-close': () => setState({ savedModal: false }),
  'result:saved-goto-archive': () => { setState({ savedModal: false }); enterArchive(); },
};
