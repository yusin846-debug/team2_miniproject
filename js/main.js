// js/main.js
// 앱 진입점: 상태 슬라이스 조립 + 화면 렌더 + 이벤트 위임 + 공통(온보딩/내비게이션) 액션.
// 화면별 액션은 각 js/features/*.js 가 소유하며, 여기서는 그것들을 합칠 뿐이다.

import { getState, setState, subscribe } from './state.js';
import { delegate } from './lib/dom.js';
import { getStoredUser } from './services/auth.js';

import { headerView } from './features/header.js';
import { toastView } from './features/toast.js';
import { onboardingView, onboardingInitialState, onboardingActions, handleOnboardingInput, handleOnboardingKeydown } from './features/onboarding.js';
import { writeView, writeInitialState, writeActions, handleWriteInput } from './features/write.js';
import { resultView, resultInitialState, resultActions } from './features/result.js';
import { archiveView, archiveInitialState, archiveActions, handleArchiveInput, enterArchive } from './features/archive.js';
import { trashView, trashInitialState, trashActions, handleTrashInput, enterTrash } from './features/trash.js';

const root = document.getElementById('app');

// 화면별 상태 슬라이스를 스토어에 합쳐 넣는다 (부팅 시 1회).
setState({ ...onboardingInitialState, ...writeInitialState, ...resultInitialState, ...archiveInitialState, ...trashInitialState });

function render(state) {
  const body =
    state.tab === 'archive' ? archiveView(state)
    : state.tab === 'trash' ? trashView(state)
    : state.stage === 'result' ? resultView(state)
    : writeView(state);

  // 온보딩(로그인/투어)도 항상 앱 셸 위에 얹어서 그린다 — 뒤에 실제 화면이 있어야
  // 온보딩 오버레이의 backdrop-filter(블러)가 유리처럼 비쳐 보인다.
  const shell = headerView(state) + `<main class="app-main">${body}</main>`;
  const onboarding = state.screen === 'onboarding' ? onboardingView(state) : '';

  return shell + onboarding + toastView(state);
}

// innerHTML 재렌더는 매번 DOM 노드를 새로 만든다 — 타이핑 중이던 input/textarea 의 포커스가
// 사라지는 걸 막기 위해, 렌더 직전의 포커스 대상(data-action 기준)·실제 입력값·커서 위치를
// 기억했다가 재렌더 후 같은 data-action 을 가진 새 엘리먼트에 복원한다.
// (실제 입력값까지 복원하는 이유: state 값이 비동기 처리 등으로 한 박자 늦게 도착해도,
//  화면엔 항상 "지금 실제로 친 값"이 우선되게 하기 위함)
function paint(state) {
  const active = document.activeElement;
  const isTextField = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
  let focused = null;
  if (isTextField && root.contains(active) && active.dataset && active.dataset.action) {
    focused = {
      action: active.dataset.action,
      liveValue: active.value,
      selectionStart: 'selectionStart' in active ? active.selectionStart : null,
      selectionEnd: 'selectionEnd' in active ? active.selectionEnd : null,
    };
  }

  root.innerHTML = render(state);

  if (focused) {
    const el = root.querySelector(`[data-action="${focused.action}"]`);
    if (el) {
      if (focused.liveValue != null) el.value = focused.liveValue;
      el.focus();
      if (focused.selectionStart != null && typeof el.setSelectionRange === 'function') {
        try { el.setSelectionRange(focused.selectionStart, focused.selectionEnd); } catch { /* setSelectionRange 미지원 input type(e.g. number) 무시 */ }
      }
    }
  }
}

// 한글 IME는 문장 전체가 아니라 "글자(음절) 하나"마다 compositionstart~compositionend가
// 따로따로 일어난다. compositionend 즉시 paint()(=DOM 재생성)를 하면, 사용자가 바로 이어서
// 다음 글자를 타이핑하기 시작하는 그 찰나에 재렌더링이 끼어들어 다음 글자의 초성이 씹히거나
// 깨지는 버그가 생긴다. 그래서 compositionend가 와도 바로 반영하지 않고 아주 잠깐(150ms)
// 기다렸다가 반영하고, 그 사이 다음 글자의 compositionstart가 또 오면("아직 계속 타이핑
// 중") 대기를 취소하고 다시 기다린다. 버튼 클릭 등 이 값을 바로 써야 하는 순간에는
// flushPendingCommit()으로 즉시 반영한다.
let isComposing = false;
let commitTimer = null;
let pendingCommitEl = null;

function flushPendingCommit() {
  if (commitTimer) {
    clearTimeout(commitTimer);
    commitTimer = null;
    if (pendingCommitEl) { handleAllInputs(pendingCommitEl); pendingCommitEl = null; }
  }
}

function enterApp() {
  setState({ screen: 'app', onboardingStep: 0 });
}

function closeOnboard() {
  try {
    if (getState().dontShowOnboarding) localStorage.setItem('hs_onboard_hide', '1');
  } catch { /* localStorage 접근 불가 환경(프라이빗 모드 등)에서는 무시 */ }
  enterApp();
}

/* ---------- 공통(온보딩/내비게이션) 액션 ---------- */
const sharedActions = {
  // auth:show-form / auth:back / auth:submit 은 onboardingActions 에서 처리
  'auth:login': () => setState({ onboardingStep: 1 }), // '그냥 둘러볼게요' — 로그인 없이 투어로 진입
  'tour:skip': () => closeOnboard(),
  'tour:open': () => setState({ screen: 'onboarding', onboardingStep: 1 }),
  'tour:next': () => {
    const step = getState().onboardingStep;
    if (step >= 3) closeOnboard();
    else setState({ onboardingStep: step + 1 });
  },
  'tour:prev': () => setState((s) => ({ onboardingStep: Math.max(1, s.onboardingStep - 1) })),
  'tour:dont-toggle': () => setState((s) => ({ dontShowOnboarding: !s.dontShowOnboarding })),
  'nav:write': () => setState({ tab: 'write' }),
  'nav:archive': () => enterArchive(),
  'nav:trash': () => enterTrash(),
};

const actions = { ...sharedActions, ...onboardingActions, ...writeActions, ...resultActions, ...archiveActions, ...trashActions };

/* ---------- 이벤트 위임 (한 번만 등록) ---------- */
delegate(root, 'click', '[data-action]', (e, el) => {
  flushPendingCommit(); // 대기 중인 입력 반영을 먼저 끝내야 방금 친 글자가 안 씹힌다.
  const fn = actions[el.dataset.action];
  if (fn) { e.preventDefault(); fn(e, el); }
});
function handleAllInputs(el) {
  handleOnboardingInput(el.dataset.action, el);
  handleWriteInput(el.dataset.action, el);
  handleArchiveInput(el.dataset.action, el);
  handleTrashInput(el.dataset.action, el);
}

delegate(root, 'compositionstart', '[data-action]', () => {
  isComposing = true;
  clearTimeout(commitTimer);
  commitTimer = null;
});
delegate(root, 'compositionend', '[data-action]', (e, el) => {
  isComposing = false;
  pendingCommitEl = el;
  clearTimeout(commitTimer);
  commitTimer = setTimeout(() => {
    commitTimer = null;
    if (!isComposing) { pendingCommitEl = null; handleAllInputs(el); }
  }, 150);
});
delegate(root, 'input', '[data-action]', (e, el) => {
  if (isComposing || e.isComposing) return;
  handleAllInputs(el);
});
delegate(root, 'change', '[data-action]', (e, el) => {
  if (el.type === 'file') handleArchiveInput(el.dataset.action, el, e);
});
delegate(root, 'keydown', '[data-action]', (e, el) => {
  handleOnboardingKeydown(e, el.dataset.action);
});
// 버튼 클릭 없이 다른 곳을 클릭하거나 탭으로 포커스가 빠져나가는 경우에도, 대기 중이던
// 입력 반영이 유실되지 않도록 포커스가 빠질 때(focusout) 즉시 반영한다.
delegate(root, 'focusout', '[data-action]', () => flushPendingCommit());

subscribe(paint);

/* ---------- 시작 ---------- */
try {
  const storedUser = getStoredUser();
  if (storedUser) {
    setState({ screen: 'app', user: storedUser });
  } else if (localStorage.getItem('hs_onboard_hide') === '1') {
    setState({ screen: 'app' });
  }
} catch { /* localStorage 접근 불가 환경에서는 매번 온보딩 노출 */ }

paint(getState());
