// shared/js/lib/dom.js
// 의존성 없는 작은 DOM 유틸. (바닐라 JS 프로젝트용)

export const qs  = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => [...root.querySelectorAll(sel)];

// HTML 문자열 내 사용자 입력을 안전하게 이스케이프 (XSS 방지)
export function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// 이벤트 위임: root 에서 발생한 이벤트 중 selector 에 매칭되는 가장 가까운 요소를 잡아 handler 실행
export function delegate(root, type, selector, handler) {
  root.addEventListener(type, (e) => {
    const target = e.target.closest(selector);
    if (target && root.contains(target)) handler(e, target);
  });
}
