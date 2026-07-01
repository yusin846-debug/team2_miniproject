// js/features/write.js
// 담당: 팀원 B
// STEP 1 — 자소서 문항·본문 붙여넣기 + 목표 회사/직군 선택 (입력 단계)

import { getState, setState } from '../state.js';
import { analyze } from '../services/analyze.js';
import { COMPANY_ORDER, badgeStyle } from '../data/companies.js';
import { detectOrigin, buildSuggestions } from '../lib/matcher.js';
import { ROLES } from '../data/roles.js';
import { escapeHtml } from '../lib/dom.js';
import { SAMPLE_LETTER, SAMPLE_QUESTION } from '../data/samples.js';

export const writeInitialState = {
  text: SAMPLE_LETTER,
  question: SAMPLE_QUESTION,
  target: '토스',
  role: '프로덕트 디자이너',
  customCompany: '',
  customRole: '',
  isAnalyzing: false, // "환승 준비하기" 응답을 기다리는 동안 로딩 오버레이 표시
  editorExpanded: false, // 자소서 입력창을 크게 보기 토글
};

function loadingOverlay(state) {
  if (!state.isAnalyzing) return '';
  return `
  <div class="loading-overlay">
    <div class="loading-card">
      <div class="loading-track">
        <div class="loading-scene">
          <div class="loading-building loading-building--1"></div>
          <div class="loading-tree loading-tree--1"></div>
          <div class="loading-building loading-building--2"></div>
          <div class="loading-building loading-building--3"></div>
          <div class="loading-tree loading-tree--2"></div>
          <div class="loading-building loading-building--4"></div>
        </div>
        <div class="loading-road"><div class="loading-road__line"></div></div>
        <div class="loading-runner"><div class="loading-runner__sprite"></div></div>
      </div>
      <div class="loading-title">잡도리가 자소서를 살펴보고 있어요</div>
      <div class="loading-desc">${escapeHtml(state.customCompany || state.target)} 맞춤으로 열심히 첨삭 중이에요. 잠시만 기다려주세요!</div>
    </div>
  </div>`;
}

export function writeView(state) {
  const target = state.customCompany || state.target;
  const role = state.customRole || state.role;
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
    const active = role === r;
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
        <textarea class="editor__area ${state.editorExpanded ? 'is-expanded' : ''}" data-action="write:text" placeholder="여기에 자소서 답변을 붙여넣으세요.">${escapeHtml(state.text)}</textarea>
        <button class="editor__resize-toggle ${state.editorExpanded ? 'is-expanded' : ''}" type="button" data-action="write:toggle-size">
          <span class="editor__resize-icon">⌄</span>
          ${state.editorExpanded ? '작게 보기' : '크게 보기'}
        </button>
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
          <input class="panel__input" data-action="write:custom-role" value="${escapeHtml(state.customRole)}"
                 placeholder="직군을 직접 입력하거나 아래에서 골라주세요" />
          <div class="panel__hint">자주 찾는 직군</div>
          <div class="role-chips">${roleChips}</div>
        </div>

        <button class="btn btn--primary btn--block" data-action="write:start" ${canRun && !state.isAnalyzing ? '' : 'disabled'}>환승 준비하기 →</button>
      </aside>
    </div>
  </section>
  ${loadingOverlay(state)}`;
}

async function runTransfer() {
  const s = getState();
  if (!(s.text || '').trim() || !s.target || s.isAnalyzing) return; // canRun 아닐 때/중복 클릭은 무시
  const target = s.customCompany || s.target;
  const role = s.customRole || s.role;
  setState({ isAnalyzing: true });
  let origin, suggestions;
  try {
    ({ origin, suggestions } = await analyze({ text: s.text, target, role }));
  } catch {
    // AI 서버(api/analyze.js) 호출 실패 시(키 미설정, 네트워크 오류 등) 화면 전환이
    // 그대로 멈춰버리지 않도록 로컬 규칙 기반 매칭으로 대체한다.
    ({ origin, suggestions } = buildSuggestions({ text: s.text, target, role }));
    setState({ toast: 'AI 서버 연결에 실패해 로컬 매칭으로 대신 보여드려요.' });
    setTimeout(() => setState({ toast: '' }), 2600);
  }
  setState({
    origin,
    suggestions,
    appliedIds: [], // 최초엔 미적용 상태로 시작 — 사용자가 하나씩 적용
    activeId: null,
    stage: 'result',
    isAnalyzing: false,
  });
}

export const writeActions = {
  'write:company':     (_e, el) => setState({ target: el.dataset.company, customCompany: '' }),
  'write:role':        (_e, el) => setState({ role: el.dataset.role, customRole: '' }),
  'write:start':       () => runTransfer(),
  'write:toggle-size': () => setState((s) => ({ editorExpanded: !s.editorExpanded })),
};

// input 이벤트(타이핑 중 실시간 반영)는 click 위임과 별도로 처리
export function handleWriteInput(action, el) {
  if (action === 'write:text')       setState({ text: el.value });
  if (action === 'write:question')   setState({ question: el.value });
  if (action === 'write:custom')     setState({ customCompany: el.value, target: el.value || getState().target });
  if (action === 'write:custom-role') setState({ customRole: el.value, role: el.value || getState().role });
}
