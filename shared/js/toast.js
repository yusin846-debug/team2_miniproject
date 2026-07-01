// shared/js/toast.js
// 하단 토스트 알림 — 모든 화면이 공통으로 사용.

export function toastView(state) {
  if (!state.toast) return '';
  return `<div class="toast"><span class="toast__ico">✓</span>${state.toast}</div>`;
}
