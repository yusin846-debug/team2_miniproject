// js/features/trash.js
// 담당: 팀원 D
// 휴지통 — 소프트 삭제된 자소서 목록. 되돌리기(복원) / 완전 삭제 / 30일 자동 완전삭제.

import { getState, setState } from '../state.js';
import { badgeStyle } from '../data/companies.js';
import { escapeHtml } from '../lib/dom.js';
import { fetchTrash, restoreLetter, permanentlyDeleteLetter, TRASH_RETENTION_DAYS } from '../services/letters.js';

export const trashInitialState = {
  trashItems: [],         // [{ id, company, role, date, count, question, content, snippet, deletedAt }]
  trashManageMode: false, // 보관함의 manageMode 와 이름이 겹치지 않도록 구분
  trashDeleteId: null,    // 보관함의 deleteId 와 이름이 겹치지 않도록 구분
};

async function refreshTrash() {
  const trashItems = await fetchTrash();
  setState({ trashItems });
}

export async function enterTrash() {
  setState({ tab: 'trash' });
  await refreshTrash();
}

async function restore(id) {
  await restoreLetter(id);
  setState({ toast: '복원했어요.' });
  setTimeout(() => setState({ toast: '' }), 2200);
  await refreshTrash();
}

async function purge(id) {
  await permanentlyDeleteLetter(id);
  setState({ trashDeleteId: null, toast: '완전히 삭제했어요.' });
  setTimeout(() => setState({ toast: '' }), 2200);
  await refreshTrash();
}

export const trashActions = {
  'trash:restore': (_e, el) => restore(el.dataset.id),
  'trash:manage-toggle': () => setState((s) => ({ trashManageMode: !s.trashManageMode })),
  'trash:delete': (e, el) => { e.stopPropagation(); setState({ trashDeleteId: el.dataset.id }); },
  'trash:delete-cancel': () => setState({ trashDeleteId: null }),
  'trash:delete-confirm': () => purge(getState().trashDeleteId),
};

// input(텍스트 타이핑) 이벤트 처리 — 지금은 없음
export function handleTrashInput() {}

function daysLeft(deletedAt) {
  if (!deletedAt) return TRASH_RETENTION_DAYS;
  const elapsedMs = Date.now() - new Date(deletedAt).getTime();
  const elapsedDays = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
  return Math.max(0, TRASH_RETENTION_DAYS - elapsedDays);
}

function cardView(a, manageMode) {
  const b = badgeStyle(a.company, 40);
  return `
  <article class="archive-card trash-card">
    ${manageMode ? `<button class="archive-card__delete" data-action="trash:delete" data-id="${a.id}">×</button>` : ''}
    <div class="archive-card__top">
      <span class="badge" style="${b.css}">${b.mark}</span>
      <div class="archive-card__meta">
        <strong>${escapeHtml(a.company)}</strong>
        <span>${escapeHtml(a.date)}</span>
      </div>
      <span class="trash-card__ddue">${daysLeft(a.deletedAt)}일 후 완전 삭제</span>
    </div>
    <div class="archive-card__question"><span>Q.</span>${escapeHtml(a.question || '')}</div>
    <p class="archive-card__snippet">${escapeHtml(a.snippet || '')}</p>
    <div class="archive-card__bottom">
      <div class="archive-card__tags">
        <span class="archive-card__role">${escapeHtml(a.role)}</span>
        <span class="archive-card__count">${a.count}곳 수정</span>
      </div>
    </div>
    <button class="btn btn--primary trash-card__restore" data-action="trash:restore" data-id="${a.id}">되돌리기 ↺</button>
  </article>`;
}

function deleteModal(item) {
  if (!item) return '';
  return `
  <div class="modal-overlay">
    <div class="modal-card delete-modal">
      <div class="delete-modal__title">'${escapeHtml(item.company)}' 자소서를 완전히 삭제할까요?</div>
      <div class="delete-modal__lead">휴지통에서 완전히 삭제하면 되돌릴 수 없어요.</div>
      <div class="delete-modal__actions">
        <button class="btn btn--ghost" data-action="trash:delete-cancel">취소</button>
        <button class="btn delete-modal__confirm" data-action="trash:delete-confirm">완전히 삭제</button>
      </div>
    </div>
  </div>`;
}

export function trashView(state) {
  const items = state.trashItems;
  const deleteItem = items.find((a) => a.id === state.trashDeleteId) || null;

  const list = items.length
    ? `<div class="archive__grid">${items.map((a) => cardView(a, state.trashManageMode)).join('')}</div>`
    : `<div class="archive-empty">
         <strong>휴지통이 비어있어요</strong>
         <span>삭제한 자소서가 여기에 보관돼요.</span>
       </div>`;

  return `
  <section class="container archive">
    <div class="archive__head">
      <div>
        <h1 class="archive__title">휴지통</h1>
        <p class="archive__lead">삭제한 자소서는 여기 30일간 보관돼요. 이후엔 자동으로 완전히 삭제돼요.</p>
      </div>
      <div class="archive__tools">
        <button class="btn ${state.trashManageMode ? 'btn--dark' : 'trash-manage-btn'}" data-action="trash:manage-toggle">${state.trashManageMode ? '완료' : '삭제하기'}</button>
      </div>
    </div>

    ${state.trashManageMode ? `<div class="archive__manage-hint">삭제 모드예요 — 카드의 × 버튼을 누르면 완전히 삭제돼요. 되돌릴 수 없어요.</div>` : ''}

    ${list}
  </section>
  ${deleteModal(deleteItem)}`;
}
