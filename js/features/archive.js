// js/features/archive.js
// 보관함 — 저장된 자소서 검색 / 불러오기 / 재환승

import { badgeStyle } from '../data/companies.js';
import { escapeHtml } from '../lib/dom.js';

export function archiveView(state) {
  const items = state.letters;

  const list = items.length
    ? items.map((a) => {
        const b = badgeStyle(a.company, 30);
        return `
        <article class="archive-card">
          <div class="archive-card__top">
            <span class="badge" style="${b.css}">${b.mark}</span>
            <div class="archive-card__meta">
              <strong>${escapeHtml(a.company)}</strong>
              <span>${escapeHtml(a.role)} · ${escapeHtml(a.date)}</span>
            </div>
            <span class="archive-card__count">제안 ${a.count}건</span>
          </div>
          <p class="archive-card__snippet">${escapeHtml(a.snippet)}</p>
          <button class="btn btn--soft btn--block" data-action="archive:load" data-id="${a.id}">불러오기</button>
        </article>`;
      }).join('')
    : `<div class="archive-empty">
         <strong>검색 결과가 없어요</strong>
         <span>다른 키워드로 찾아보세요.</span>
       </div>`;

  return `
  <section class="container archive">
    <h1 class="archive__title">보관함</h1>
    <p class="archive__lead">환승해 둔 자소서를 다시 꺼내 또 환승하세요.</p>
    <div class="archive__search">
      <span class="archive__search-ico">⌕</span>
      <input data-action="archive:search" value="${escapeHtml(state.search)}" placeholder="회사명 · 키워드로 검색" />
    </div>
    <div class="archive__grid">${list}</div>
  </section>`;
}
