// js/features/archive.js
// 담당: 팀원 D
// 보관함 — 검색·태그 필터, 등록(파일 업로드 포함), 정리(삭제) 모드, 상세보기(바텀시트)

import { getState, setState } from '../state.js';
import { badgeStyle } from '../data/companies.js';
import { ROLES } from '../data/roles.js';
import { escapeHtml } from '../lib/dom.js';
import { fetchLetters, saveLetter, deleteLetter } from '../services/letters.js';

export const ARCHIVE_TAGS = ['전체', '토스', '네이버', '디자이너'];

export const archiveInitialState = {
  search: '',
  letters: [],               // [{ id, company, role, date, count, question, content, snippet }]
  manageMode: false,
  detailId: null,
  addModal: false,
  addForm: { company: '', role: ROLES[0], question: '', content: '' },
  uploadName: '',
};

async function refreshLetters() {
  const letters = await fetchLetters(getState().search);
  setState({ letters });
}

export async function enterArchive() {
  setState({ tab: 'archive' });
  await refreshLetters();
}

let searchTimer;
function search(value) {
  setState({ search: value });
  clearTimeout(searchTimer);
  searchTimer = setTimeout(refreshLetters, 200);
}

function updateAddForm(key, value) {
  setState((s) => ({ addForm: { ...s.addForm, [key]: value } }));
}

async function submitAdd() {
  const f = getState().addForm;
  if (!f.company.trim() || !f.question.trim() || !f.content.trim()) {
    setState({ toast: '회사명·문항·내용을 모두 입력해 주세요.' });
    setTimeout(() => setState({ toast: '' }), 2200);
    return;
  }
  const saved = await saveLetter({
    company: f.company.trim(),
    role: f.role,
    question: f.question.trim(),
    content: f.content.trim(),
    count: 0,
  });
  setState({
    addModal: false,
    toast: saved && saved._local ? '이 기기에만 저장했어요 (서버 연결 실패)' : '보관함에 등록했어요.',
  });
  setTimeout(() => setState({ toast: '' }), 2600);
  await refreshLetters();
}

async function removeLetter(id) {
  const result = await deleteLetter(id);
  setState((s) => ({
    detailId: s.detailId === id ? null : s.detailId,
    toast: result && result._local ? '이 기기에서만 삭제했어요 (서버 연결 실패)' : '삭제했어요.',
  }));
  setTimeout(() => setState({ toast: '' }), 2600);
  await refreshLetters();
}

function loadFromDetail() {
  const s = getState();
  const item = s.letters.find((a) => a.id === s.detailId);
  if (!item) return;
  setState({
    tab: 'write', stage: 'input', detailId: null,
    target: item.company, role: item.role,
    question: item.question || '', text: item.content || item.snippet || '',
    customCompany: '', appliedIds: [], activeId: null,
    toast: `${item.company} 자소서를 불러왔어요.`,
  });
  setTimeout(() => setState({ toast: '' }), 2200);
}

async function copyDetail() {
  const s = getState();
  const item = s.letters.find((a) => a.id === s.detailId);
  if (!item) return;
  try {
    await navigator.clipboard.writeText(item.content || item.snippet || '');
    setState({ toast: '복사했어요! 바로 붙여넣으세요.' });
  } catch {
    setState({ toast: '복사에 실패했어요.' });
  }
  setTimeout(() => setState({ toast: '' }), 2200);
}

function onUploadFile(file) {
  if (!file) return;
  const isText = /\.txt$/i.test(file.name) || file.type === 'text/plain';
  if (!isText) {
    setState({ uploadName: file.name, toast: 'txt 파일만 자동으로 읽을 수 있어요. 내용을 붙여넣어 주세요.' });
    setTimeout(() => setState({ toast: '' }), 2200);
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    updateAddForm('content', String(reader.result || ''));
    setState({ uploadName: file.name });
  };
  reader.readAsText(file);
}

export const archiveActions = {
  'archive:tag': (_e, el) => search(el.dataset.tag === '전체' ? '' : el.dataset.tag),
  'archive:manage-toggle': () => setState((s) => ({ manageMode: !s.manageMode })),
  'archive:open': (_e, el) => { if (!getState().manageMode) setState({ detailId: el.dataset.id }); },
  'archive:delete': (e, el) => { e.stopPropagation(); removeLetter(el.dataset.id); },
  'archive:detail-close': () => setState({ detailId: null }),
  'archive:detail-copy': () => copyDetail(),
  'archive:detail-load': () => loadFromDetail(),
  'archive:add-open': () => setState({ addModal: true, addForm: { company: '', role: ROLES[0], question: '', content: '' }, uploadName: '' }),
  'archive:add-close': () => setState({ addModal: false }),
  'archive:add-role': (_e, el) => updateAddForm('role', el.dataset.role),
  'archive:add-submit': () => submitAdd(),
};

// input(텍스트 타이핑) 이벤트 처리
export function handleArchiveInput(action, el, e) {
  if (action === 'archive:search')       search(el.value);
  if (action === 'archive:add-company')  updateAddForm('company', el.value);
  if (action === 'archive:add-question') updateAddForm('question', el.value);
  if (action === 'archive:add-content')  updateAddForm('content', el.value);
  if (action === 'archive:add-upload' && e) onUploadFile(el.files && el.files[0]);
}

function cardView(a, manageMode) {
  const b = badgeStyle(a.company, 40);
  return `
  <article class="archive-card" data-action="archive:open" data-id="${a.id}">
    ${manageMode ? `<button class="archive-card__delete" data-action="archive:delete" data-id="${a.id}">×</button>` : ''}
    <div class="archive-card__top">
      <span class="badge" style="${b.css}">${b.mark}</span>
      <div class="archive-card__meta">
        <strong>${escapeHtml(a.company)}</strong>
        <span>${escapeHtml(a.date)}</span>
      </div>
    </div>
    <div class="archive-card__question"><span>Q.</span>${escapeHtml(a.question || '')}</div>
    <p class="archive-card__snippet">${escapeHtml(a.snippet || '')}</p>
    <div class="archive-card__bottom">
      <div class="archive-card__tags">
        <span class="archive-card__role">${escapeHtml(a.role)}</span>
        <span class="archive-card__count">${a.count}곳 수정</span>
      </div>
      <span class="archive-card__hint">펼쳐보기 ↑</span>
    </div>
  </article>`;
}

function detailSheet(item) {
  if (!item) return '';
  const b = badgeStyle(item.company, 44);
  return `
  <div class="sheet-overlay" data-action="archive:detail-close">
    <div class="sheet-card">
      <div class="sheet-card__grip"><span></span></div>
      <div class="sheet-card__head">
        <span class="badge" style="${b.css}">${b.mark}</span>
        <div class="sheet-card__meta">
          <strong>${escapeHtml(item.company)}</strong>
          <span>${escapeHtml(item.role)} · ${escapeHtml(item.date)} · ${item.count}곳 수정</span>
        </div>
        <button class="icon-btn" data-action="archive:detail-close">×</button>
      </div>
      <div class="sheet-card__body">
        <div class="sheet-card__question"><span>Q.</span>${escapeHtml(item.question || '')}</div>
        <div class="sheet-card__content">${escapeHtml(item.content || item.snippet || '')}</div>
      </div>
      <div class="sheet-card__footer">
        <button class="btn btn--outline" data-action="archive:detail-copy">복사하기</button>
        <button class="btn btn--primary sheet-card__cta" data-action="archive:detail-load">이 자소서로 환승 준비 →</button>
      </div>
    </div>
  </div>`;
}

function addModal(state) {
  if (!state.addModal) return '';
  const f = state.addForm;
  const ok = f.company.trim() && f.question.trim() && f.content.trim();
  const roleChips = ROLES.map((r) => `
    <button class="role-chip role-chip--sm ${f.role === r ? 'is-active' : ''}" data-action="archive:add-role" data-role="${r}">${r}</button>
  `).join('');

  return `
  <div class="modal-overlay">
    <div class="modal-card add-modal">
      <div class="add-modal__head">
        <div>
          <div class="add-modal__title">기존 자소서 등록</div>
          <div class="add-modal__lead">이미 써 둔 자소서를 질문과 함께 보관함에 담아두세요.</div>
        </div>
        <button class="icon-btn" data-action="archive:add-close">×</button>
      </div>
      <div class="add-modal__body">
        <label class="add-modal__upload">
          <div class="add-modal__dropzone">
            <div class="add-modal__dropzone-ico">📄</div>
            <div class="add-modal__dropzone-label">${escapeHtml(state.uploadName || '자소서 파일 올리기')}</div>
            <div class="add-modal__dropzone-hint">.txt 파일을 올리면 내용이 자동으로 채워져요</div>
          </div>
          <input type="file" accept=".txt,text/plain" data-action="archive:add-upload" hidden />
        </label>
        <div class="add-modal__row">
          <div class="add-modal__field">
            <div class="add-modal__label">회사명</div>
            <input class="add-modal__input" data-action="archive:add-company" value="${escapeHtml(f.company)}" placeholder="예: 토스" />
          </div>
          <div class="add-modal__field add-modal__field--wide">
            <div class="add-modal__label">지원 직군</div>
            <div class="add-modal__roles">${roleChips}</div>
          </div>
        </div>
        <div class="add-modal__field">
          <div class="add-modal__label">자소서 문항</div>
          <input class="add-modal__input add-modal__input--strong" data-action="archive:add-question" value="${escapeHtml(f.question)}" placeholder="예: 지원 동기와 입사 후 포부를 서술해 주세요." />
        </div>
        <div class="add-modal__field">
          <div class="add-modal__label">자소서 내용</div>
          <textarea class="add-modal__textarea" data-action="archive:add-content" placeholder="자소서 내용을 붙여넣으세요.">${escapeHtml(f.content)}</textarea>
        </div>
        <div class="add-modal__actions">
          <button class="btn btn--ghost" data-action="archive:add-close">취소</button>
          <button class="btn btn--primary add-modal__submit" data-action="archive:add-submit" ${ok ? '' : 'disabled'}>보관함에 등록</button>
        </div>
      </div>
    </div>
  </div>`;
}

export function archiveView(state) {
  const items = state.letters;
  const detailItem = items.find((a) => a.id === state.detailId) || null;

  const list = items.length
    ? `<div class="archive__grid">${items.map((a) => cardView(a, state.manageMode)).join('')}</div>`
    : `<div class="archive-empty">
         <strong>검색 결과가 없어요</strong>
         <span>다른 키워드로 찾아보세요.</span>
       </div>`;

  const tags = ARCHIVE_TAGS.map((label) => {
    const active = (label === '전체' && !state.search) || (label !== '전체' && state.search === label);
    return `<button class="tag-chip ${active ? 'is-active' : ''}" data-action="archive:tag" data-tag="${label}">${label}</button>`;
  }).join('');

  return `
  <section class="container archive">
    <div class="archive__head">
      <div>
        <h1 class="archive__title">보관함</h1>
        <p class="archive__lead">환승해 둔 자소서를 다시 꺼내 또 환승하세요.</p>
      </div>
      <div class="archive__tools">
        <div class="archive__search">
          <span class="archive__search-ico">⌕</span>
          <input data-action="archive:search" value="${escapeHtml(state.search)}" placeholder="회사·직군·질문 검색" />
        </div>
        <button class="btn btn--primary archive__add-btn" data-action="archive:add-open">＋ 자소서 등록</button>
        <button class="btn ${state.manageMode ? 'btn--dark' : 'btn--ghost'}" data-action="archive:manage-toggle">${state.manageMode ? '완료' : '정리하기'}</button>
      </div>
    </div>

    <div class="archive__tags">${tags}</div>

    ${state.manageMode ? `<div class="archive__manage-hint">정리 모드예요 — 카드의 × 버튼을 눌러 자소서를 삭제하세요.</div>` : ''}

    ${list}
  </section>
  ${detailSheet(detailItem)}
  ${addModal(state)}`;
}
