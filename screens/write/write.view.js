// screens/write/write.view.js
// 담당: 팀원 A
// STEP 1 — 자소서 문항·본문 붙여넣기 + 목표 회사/직군 선택 (입력 단계)

import { COMPANY_ORDER, badgeStyle, detectOrigin } from '../../shared/js/lib/companies.js';
import { ROLES } from '../../shared/js/lib/roles.js';
import { escapeHtml } from '../../shared/js/lib/dom.js';

export function writeView(state) {
  const target = state.customCompany || state.target;
  const origin = detectOrigin(state.text, target);
  const charCount = state.text.length;
  const canRun = (state.text || '').trim().length > 0 && !!target;

  const companyChips = COMPANY_ORDER.map((name) => {
    const b = badgeStyle(name, 26);
    const active = target === name;
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

  const tBadge = badgeStyle(target, 38);

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
        <div class="editor__question">
          <span class="editor__question-ico">Q</span>
          <input class="editor__question-input" data-action="write:question" value="${escapeHtml(state.question)}"
                 placeholder="자소서 문항을 입력하세요 (예: 지원 동기를 서술해 주세요)" />
        </div>
        <textarea class="editor__area" data-action="write:text" placeholder="여기에 자소서 답변을 붙여넣으세요.">${escapeHtml(state.text)}</textarea>
      </div>

      <!-- 설정 패널 -->
      <aside class="write__panel">
        <div class="card panel">
          <h3 class="panel__title">어디로 환승하나요?</h3>
          <input class="panel__input" data-action="write:custom" value="${escapeHtml(state.customCompany)}"
                 placeholder="회사명을 직접 입력하거나 아래에서 골라주세요" />
          <div class="panel__hint">자주 찾는 회사</div>
          <div class="company-chips">${companyChips}</div>
          <div class="target-card">
            <span class="badge" style="${tBadge.css}">${tBadge.mark}</span>
            <div class="target-card__text">
              <strong>${escapeHtml(target)}</strong>
              <span>이 회사로 환승해요</span>
            </div>
          </div>
        </div>

        <div class="card panel">
          <h3 class="panel__title">지원 직군</h3>
          <div class="role-chips">${roleChips}</div>
        </div>

        <button class="btn btn--primary btn--block" data-action="write:start" ${canRun ? '' : 'disabled'}>환승 준비하기 →</button>
      </aside>
    </div>
  </section>`;
}
