// js/features/header.js
// 상단 헤더: 로고 / 탭(잡도리·보관함) / 사용자 칩

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
    </nav>
    <div class="spacer"></div>
    <button class="icon-btn" data-action="tour:open" title="둘러보기 다시 보기">?</button>
    <div class="user-chip">
      <span class="user-chip__avatar">취준</span>
      <span class="user-chip__name">취준생님</span>
    </div>
  </header>`;
}
