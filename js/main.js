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
// 사라지는 걸 막기 위해, 렌더 직전의 포커스 대상(data-action 기준)과 커서 위치를 기억했다가
// 재렌더 후 같은 data-action 을 가진 새 엘리먼트에 복원한다.
function paint(state) {
  const active = document.activeElement;
  let focused = null;
  if (active && root.contains(active) && active.dataset && active.dataset.action) {
    focused = {
      action: active.dataset.action,
      selectionStart: 'selectionStart' in active ? active.selectionStart : null,
      selectionEnd: 'selectionEnd' in active ? active.selectionEnd : null,
    };
  }

  root.innerHTML = render(state);

  if (focused) {
    const el = root.querySelector(`[data-action="${focused.action}"]`);
    if (el) {
      el.focus();
      if (focused.selectionStart != null && typeof el.setSelectionRange === 'function') {
        try { el.setSelectionRange(focused.selectionStart, focused.selectionEnd); } catch { /* setSelectionRange 미지원 input type(e.g. number) 무시 */ }
      }
    }
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
  const fn = actions[el.dataset.action];
  if (fn) { e.preventDefault(); fn(e, el); }
});
// 한글 입력 시 매 키 입력마다 setState → 전체 innerHTML 재렌더가 일어나면
// 조합 중이던 DOM 노드가 통째로 교체되어 IME 조합(한글 자모)이 끊기고 글자가 깨진다.
// compositionstart~compositionend 구간에서는 상태 반영을 건너뛰고, 조합이 끝난 시점에 한 번만 반영한다.
let isComposing = false;
delegate(root, 'compositionstart', '[data-action]', () => { isComposing = true; });
delegate(root, 'compositionend', '[data-action]', (e, el) => {
  isComposing = false;
  handleOnboardingInput(el.dataset.action, el);
  handleWriteInput(el.dataset.action, el);
  handleArchiveInput(el.dataset.action, el);
  handleTrashInput(el.dataset.action, el);
});
delegate(root, 'input', '[data-action]', (e, el) => {
  if (isComposing) return;
  handleOnboardingInput(el.dataset.action, el);
  handleWriteInput(el.dataset.action, el);
  handleArchiveInput(el.dataset.action, el);
  handleTrashInput(el.dataset.action, el);
});
delegate(root, 'change', '[data-action]', (e, el) => {
  if (el.type === 'file') handleArchiveInput(el.dataset.action, el, e);
});
delegate(root, 'keydown', '[data-action]', (e, el) => {
  handleOnboardingKeydown(e, el.dataset.action);
});

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
