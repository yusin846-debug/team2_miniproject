// js/features/toast.js
// 하단 토스트 알림

export function toastView(state) {
  if (!state.toast) return '';
  return `<div class="toast"><span class="toast__ico">✓</span>${state.toast}</div>`;
}
