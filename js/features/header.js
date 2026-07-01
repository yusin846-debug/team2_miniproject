// js/features/header.js
// 상단 헤더: 로고 / 탭(잡도리·보관함) / 사용자 칩 — 특정 화면 소유가 아닌 공통 셸.

export function headerView(state) {
  const tab = (id, label) => {
    const active = state.tab === id;
    return `<button class="tab ${active ? 'is-active' : ''}" data-action="nav:${id}">${label}</button>`;
  };

  return `
  <header class="app-header">
    <div class="brand" data-action="nav:write">
      <img class="brand__logo" src="assets/logo.png" alt="자소서 환승" />
      <div class="brand__name">
        <span class="brand__title">자소서 환승</span>
        <span class="brand__sub">JASOSEO&nbsp;TRANSFER</span>
      </div>
    </div>
    <nav class="tabs">
      ${tab('write', '잡도리')}
      ${tab('archive', '보관함')}
      ${tab('trash', '휴지통')}
    </nav>
    <div class="spacer"></div>
    ${state.user ? `
    <button class="icon-btn" data-action="tour:open" title="둘러보기 다시 보기">?</button>
    <button class="icon-btn" data-action="auth:logout" title="로그아웃">↩</button>
    <div class="user-chip">
      <span class="user-chip__avatar">${state.user.name[0]}</span>
      <span class="user-chip__name">${state.user.name}님</span>
    </div>` : `
    <button class="btn btn--login-chip" data-action="auth:open">로그인</button>`}
  </header>`;
}
