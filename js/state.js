// js/state.js
// 아주 작은 중앙 상태 저장소. setState 시 구독자(렌더러)에게 알린다.

import { SAMPLE_LETTER } from './data/samples.js';

const initialState = {
  // ── 공통: 화면 제어 (팀원 E) ──────────────────────────────
  screen: 'onboarding',   // 'onboarding' | 'app'
  tab: 'write',           // 'write' | 'archive'
  stage: 'input',         // 'input' | 'result'

  // ── 팀원 A: 로그인·온보딩 ─────────────────────────────────
  onboardingStep: 0,      // 0: 로그인화면, 1~3: 투어 단계
  username: '',
  password: '',
  user: null,             // { id, name } 로그인 성공 후 저장

  // ── 팀원 B: 자소서 입력 ───────────────────────────────────
  text: SAMPLE_LETTER,
  target: '토스',
  role: '프로덕트 디자이너',
  customCompany: '',

  // ── 팀원 C: AI 첨삭 결과 ──────────────────────────────────
  origin: '—',
  suggestions: [],        // [{ id, category, label, original, suggestion, reason }]
  appliedIds: [],         // 사용자가 선택한 제안 id 목록

  // ── 팀원 D: 보관함 ────────────────────────────────────────
  search: '',
  letters: [],            // [{ id, company, role, date, snippet, content }]

  // ── 공통: 피드백 (팀원 E) ─────────────────────────────────
  toast: '',
};

let state = { ...initialState };
const listeners = new Set();

export const getState = () => state;

export function setState(patch) {
  state = { ...state, ...patch };
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
