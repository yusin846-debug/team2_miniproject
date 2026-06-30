// js/features/result.js
// 환승 결과 — 미리보기 + 잡도리 제안 (적용/전체적용/복사/저장)

import { applySuggestions } from '../lib/matcher.js';
import { badgeStyle } from '../data/companies.js';
import { escapeHtml } from '../lib/dom.js';

export function resultView(state) {
  const company = state.customCompany || state.target;
  const total = state.suggestions.length;
  const applied = state.appliedIds.length;
  const finalText = applySuggestions(state.text, state.suggestions, state.appliedIds, state.origin, company);
  const b = badgeStyle(state.target, 28);

  const cards = state.suggestions.map((s) => {
    const on = state.appliedIds.includes(s.id);
    return `
      <div class="sugg ${on ? 'is-on' : ''}">
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

  const allOn = applied === total && total > 0;

  return `
  <section class="container result">
    <button class="link-back" data-action="result:back">← 다시 작성</button>

    <div class="result__grid">
      <!-- 미리보기 -->
      <div class="card preview">
        <div class="preview__head">
          <span class="badge" style="${b.css}">${b.mark}</span>
          <div>
            <strong>${escapeHtml(company)}</strong>
            <span class="preview__role">· ${escapeHtml(state.role)}</span>
          </div>
          <span class="preview__count">수정 제안 ${total}곳 · 적용 ${applied}</span>
        </div>
        <div class="preview__body">${escapeHtml(finalText).replace(/\n/g, '<br>')}</div>
        <div class="preview__actions">
          <button class="btn btn--ghost" data-action="result:copy">복사하기</button>
          <button class="btn btn--primary" data-action="result:save">보관함에 저장</button>
        </div>
      </div>

      <!-- 제안 -->
      <aside class="suggestions">
        <div class="suggestions__head">
          <h3>잡도리 제안 <b>${total}</b>건</h3>
          <button class="btn btn--soft" data-action="result:applyAll">${allOn ? '전체 해제' : '전체 적용'}</button>
        </div>
        <div class="suggestions__list">${cards || '<p class="empty">적용할 제안이 없어요.</p>'}</div>
      </aside>
    </div>
  </section>`;
}
