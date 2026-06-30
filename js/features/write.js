// js/features/write.js
// STEP 1 — 자소서 붙여넣기 + 목표 회사/직군 선택 (입력 단계)

import { COMPANY_ORDER, badgeStyle } from '../data/companies.js';
import { ROLES } from '../data/roles.js';
import { detectOrigin } from '../lib/matcher.js';
import { escapeHtml } from '../lib/dom.js';

export function writeView(state) {
  const origin = detectOrigin(state.text, state.target);
  const charCount = state.text.length;

  const companyChips = COMPANY_ORDER.map((name) => {
    const b = badgeStyle(name, 26);
    const active = state.target === name;
    return `
      <button class="company-chip ${active ? 'is-active' : ''}" data-action="write:company" data-company="${name}">
        <span class="badge" style="${b.css}">${b.mark}</span>
        <span>${name}</span>
      </button>`;
  }).join('');

  const roleChips = ROLES.map((r) => {
    const active = state.role === r;
    return `<button class="role-chip ${active ? 'is-active' : ''}" data-action="write:role" data-role="${r}">${r}</button>`;
  }).join('');

  return `
  <section class="container write">
    <span class="step-badge"><i></i>STEP 1 · 자소서 붙여넣기</span>
    <h1 class="write__title">한 번 쓴 자소서, 새 회사로 환승할까요?</h1>
    <p class="write__lead">자소서를 붙여넣고 지원할 회사와 직군만 알려주세요. 바꿔야 할 부분은 <b>잡도리</b>가 콕콕 잡아 드릴게요.</p>

    <div class="write__grid">
      <!-- 에디터 -->
      <div class="card editor">
        <div class="editor__head">
          <span class="editor__label">내 자소서</span>
          <div class="editor__meta">
            <span class="origin">감지된 회사 · <b>${escapeHtml(origin)}</b></span>
            <span class="count">${charCount}자</span>
          </div>
        </div>
        <textarea class="editor__area" data-action="write:text" placeholder="여기에 기존 자소서를 붙여넣으세요.">${escapeHtml(state.text)}</textarea>
      </div>

      <!-- 설정 패널 -->
      <aside class="write__panel">
        <div class="card panel">
          <h3 class="panel__title">어디로 환승하나요?</h3>
          <input class="panel__input" data-action="write:custom" value="${escapeHtml(state.customCompany)}"
                 placeholder="회사명을 직접 입력하거나 아래에서 골라주세요" />
          <div class="panel__hint">자주 찾는 회사</div>
          <div class="company-chips">${companyChips}</div>
        </div>

        <div class="card panel">
          <h3 class="panel__title">지원 직군</h3>
          <div class="role-chips">${roleChips}</div>
        </div>

        <button class="btn btn--primary btn--block" data-action="write:start">잡도리 시작하기 →</button>
      </aside>
    </div>
  </section>`;
}
