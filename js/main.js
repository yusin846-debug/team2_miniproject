// js/main.js
// 앱 진입점: 상태 → 화면 렌더 + 이벤트 위임 처리

import { getState, setState, subscribe, flashToast } from './state.js';
import { delegate } from './lib/dom.js';
import { analyze, applySuggestions } from './services/analyze.js';
import { fetchLetters, fetchLetter, saveLetter } from './services/letters.js';

import { headerView }     from './features/header.js';
import { writeView }      from './features/write.js';
import { resultView }     from './features/result.js';
import { archiveView }    from './features/archive.js';
import { onboardingView } from './features/onboarding.js';
import { toastView }      from './features/toast.js';

const root = document.getElementById('app');

/* ---------- 렌더 ---------- */
function render(state) {
  let html = '';
  if (state.screen === 'onboarding') {
    html = onboardingView(state);
  } else {
    const body =
      state.tab === 'archive' ? archiveView(state)
      : state.stage === 'result' ? resultView(state)
      : writeView(state);
    html = headerView(state) + `<main class="app-main">${body}</main>`;
  }
  root.innerHTML = html + toastView(state);
}

subscribe(render);

/* ---------- 액션 핸들러 ---------- */
const actions = {

  // ── 팀원 A: 로그인·온보딩 ─────────────────────────────────
  'auth:login': (_e, el) => {
    // TODO: js/services/auth.js 의 login() 호출로 교체
    console.log('login provider =', el.dataset.provider);
    enterApp();
  },
  'tour:skip': () => enterApp(),
  'tour:open': () => setState({ screen: 'onboarding', onboardingStep: 1 }),
  'tour:next': () => {
    const s = getState();
    if (s.onboardingStep >= 3) enterApp();
    else setState({ onboardingStep: s.onboardingStep + 1 });
  },

  // ── 팀원 B: 자소서 입력 ───────────────────────────────────
  'write:company': (_e, el) => setState({ target: el.dataset.company, customCompany: '' }),
  'write:role':    (_e, el) => setState({ role: el.dataset.role }),
  'write:start':   () => runAnalyze(),

  // ── 팀원 C: AI 첨삭 결과 ──────────────────────────────────
  'result:back':     () => setState({ stage: 'input' }),
  'result:toggle':   (_e, el) => toggleSuggestion(el.dataset.id),
  'result:applyAll': () => toggleAll(),
  'result:copy':     () => copyResult(),
  'result:save':     () => saveResult(),

  // ── 팀원 D: 보관함 ────────────────────────────────────────
  'archive:load': async (_e, el) => {
    const letter = await fetchLetter(el.dataset.id);
    if (!letter) return;
    setState({
      tab: 'write', stage: 'input',
      target: letter.company, role: letter.role,
      text: letter.content || letter.snippet || getState().text,
    });
    flashToast('보관함에서 불러왔어요');
  },

  // ── 팀원 E: 네비게이션 ────────────────────────────────────
  'nav:write':   () => setState({ tab: 'write' }),
  'nav:archive': async () => {
    setState({ tab: 'archive' });
    const letters = await fetchLetters(getState().search);
    setState({ letters });
  },
};

// input 류(텍스트 변경)는 click 위임과 별도로 처리
function handleInput(action, el) {
  if (action === 'write:text')   setState({ text: el.value });
  if (action === 'write:custom') setState({ customCompany: el.value, target: el.value || getState().target });
  if (action === 'archive:search') searchArchive(el.value);
}

/* ---------- 액션 구현 ---------- */
function enterApp() {
  setState({ screen: 'app', onboardingStep: 0 });
}

async function runAnalyze() {
  const s = getState();
  const target = s.customCompany || s.target;
  const { origin, suggestions } = await analyze({ text: s.text, target, role: s.role });
  setState({ origin, suggestions, appliedIds: suggestions.map((x) => x.id), stage: 'result' });
}

function toggleSuggestion(id) {
  const s = getState();
  const set = new Set(s.appliedIds);
  set.has(id) ? set.delete(id) : set.add(id);
  setState({ appliedIds: [...set] });
}

function toggleAll() {
  const s = getState();
  const allOn = s.appliedIds.length === s.suggestions.length && s.suggestions.length > 0;
  setState({ appliedIds: allOn ? [] : s.suggestions.map((x) => x.id) });
}

async function copyResult() {
  const s = getState();
  const company = s.customCompany || s.target;
  const text = applySuggestions(s.text, s.suggestions, s.appliedIds, s.origin, company);
  try { await navigator.clipboard.writeText(text); flashToast('복사했어요'); }
  catch { flashToast('복사에 실패했어요'); }
}

async function saveResult() {
  const s = getState();
  const company = s.customCompany || s.target;
  const content = applySuggestions(s.text, s.suggestions, s.appliedIds, s.origin, company);
  await saveLetter({ company, role: s.role, content, count: s.appliedIds.length });
  flashToast('보관함에 저장했어요');
}

let searchTimer;
function searchArchive(value) {
  setState({ search: value });
  clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    const letters = await fetchLetters(value);
    setState({ letters });
  }, 200);
}

/* ---------- 이벤트 위임 (한 번만 등록) ---------- */
delegate(root, 'click', '[data-action]', (e, el) => {
  const fn = actions[el.dataset.action];
  if (fn) { e.preventDefault(); fn(e, el); }
});
delegate(root, 'input', '[data-action]', (e, el) => handleInput(el.dataset.action, el));

/* ---------- 시작 ---------- */
render(getState());
