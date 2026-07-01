// shared/js/state.js
// 중앙 상태 저장소 엔진. 화면(screens/*)에 대해 아무것도 알지 못하는 leaf 모듈이다.
// 화면별 상태 슬라이스(write/result/archive)는 core.js 가 부팅 시 합쳐 넣는다.
// (state.js 가 screens/* 를 직접 import 하면 screens/* → shared/js/state.js → screens/*
//  순환 참조가 생겨 모듈 평가 순서에 따라 TDZ 에러가 날 수 있어 의도적으로 피한다.)

let state = {
  // ── 공통: 화면 전환 ──────────────────────────────
  screen: 'onboarding',   // 'onboarding' | 'app'
  tab: 'write',           // 'write' | 'archive'
  stage: 'input',         // 'input' | 'result' (write 탭 내부 단계)
  onboardingStep: 0,      // 0: 로그인, 1~3: 투어
  dontShowOnboarding: false,
  user: null,

  // ── 공통: 피드백 ─────────────────────────────────
  toast: '',
};
const listeners = new Set();

export const getState = () => state;

// patch 객체 또는 (state) => patch 함수(직전 상태 기반 갱신) 모두 허용한다.
export function setState(patch) {
  const next = typeof patch === 'function' ? patch(state) : patch;
  state = { ...state, ...next };
  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let toastTimer;
export function flashToast(message) {
  setState({ toast: message });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => setState({ toast: '' }), 2200);
}
