// screens/archive/archive.state.js
// 담당: 팀원 C
// 보관함 — 검색/필터, 등록(파일 업로드 포함), 정리(삭제) 모드, 상세보기 상태 슬라이스.

import { getState, setState } from '../../shared/js/state.js';
import { ROLES } from '../../shared/js/lib/roles.js';
import { fetchLetters, saveLetter, deleteLetter } from './archive.api.js';

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
  await saveLetter({
    company: f.company.trim(),
    role: f.role,
    question: f.question.trim(),
    content: f.content.trim(),
    count: 0,
  });
  setState({ addModal: false, toast: '보관함에 등록했어요.' });
  setTimeout(() => setState({ toast: '' }), 2200);
  await refreshLetters();
}

async function removeLetter(id) {
  await deleteLetter(id);
  setState((s) => ({ detailId: s.detailId === id ? null : s.detailId, toast: '삭제했어요.' }));
  setTimeout(() => setState({ toast: '' }), 2200);
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
