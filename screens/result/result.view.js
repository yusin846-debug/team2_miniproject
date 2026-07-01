// screens/result/result.view.js
// 담당: 팀원 B
// 환승 결과 — 카테고리별 하이라이트 미리보기 + 잡도리 제안 (적용/전체적용/복사/저장)

import { badgeStyle } from '../../shared/js/lib/companies.js';
import { escapeHtml } from '../../shared/js/lib/dom.js';
import { CATEGORY_ORDER, CATEGORIES, buildSegments } from './result.state.js';

export function resultView(state) {
  const target = state.customCompany || state.target;
  const total = state.suggestions.length;
  const applied = state.appliedIds.length;
  const allOn = applied === total && total > 0;
  const b = badgeStyle(target, 28);

  const segments = buildSegments(state.text, state.suggestions, state.appliedIds, state.activeId, target);
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
            ${on ? '✓ 적용됨' : '적용'}
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
          <button class="btn btn--soft" data-action="result:applyAll">${allOn ? '전체 해제' : '전체 적용'}</button>
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
