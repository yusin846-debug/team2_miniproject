// shared/js/core.js
// 앱 진입점: 렌더 구독 + 이벤트 위임 등록 + 공통(온보딩/내비게이션) 액션.
// 화면별 액션은 각 screens/*/*.state.js 가 소유하며, 여기서는 그것들을 합칠 뿐이다.

import { getState, setState, subscribe } from './state.js';
import { delegate } from './lib/dom.js';
import { render } from './router.js';

import { writeInitialState, writeActions, handleWriteInput } from '../../screens/write/write.state.js';
import { resultInitialState, resultActions } from '../../screens/result/result.state.js';
import { archiveInitialState, archiveActions, handleArchiveInput, enterArchive } from '../../screens/archive/archive.state.js';

const root = document.getElementById('app');

// 화면별 상태 슬라이스를 스토어에 합쳐 넣는다 (부팅 시 1회).
setState({ ...writeInitialState, ...resultInitialState, ...archiveInitialState });

function paint(state) {
  root.innerHTML = render(state);
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
  'auth:login': () => setState({ onboardingStep: 1 }), // TODO: 실제 로그인 연동 (팀원 A)
  'tour:skip': () => closeOnboard(),
  'tour:open': () => setState({ screen: 'onboarding', onboardingStep: 0 }),
  'tour:next': () => {
    const step = getState().onboardingStep;
    if (step >= 3) closeOnboard();
    else setState({ onboardingStep: step + 1 });
  },
  'tour:prev': () => setState((s) => ({ onboardingStep: Math.max(1, s.onboardingStep - 1) })),
  'tour:dont-toggle': () => setState((s) => ({ dontShowOnboarding: !s.dontShowOnboarding })),
  'nav:write': () => setState({ tab: 'write' }),
  'nav:archive': () => enterArchive(),
};

const actions = { ...sharedActions, ...writeActions, ...resultActions, ...archiveActions };

/* ---------- 이벤트 위임 (한 번만 등록) ---------- */
delegate(root, 'click', '[data-action]', (e, el) => {
  const fn = actions[el.dataset.action];
  if (fn) { e.preventDefault(); fn(e, el); }
});
delegate(root, 'input', '[data-action]', (e, el) => {
  handleWriteInput(el.dataset.action, el);
  handleArchiveInput(el.dataset.action, el);
});
delegate(root, 'change', '[data-action]', (e, el) => {
  if (el.type === 'file') handleArchiveInput(el.dataset.action, el, e);
});

subscribe(paint);

/* ---------- 시작 ---------- */
try {
  if (localStorage.getItem('hs_onboard_hide') === '1') setState({ screen: 'app' });
} catch { /* localStorage 접근 불가 환경에서는 매번 온보딩 노출 */ }

paint(getState());
