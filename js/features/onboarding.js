// js/features/onboarding.js
// 담당: 팀원 A
// 온보딩 — 로그인/회원가입 화면 + 기능 투어. 특정 화면 소유가 아닌 공통 셸(최초 진입 시에만 노출).

import { setState } from '../state.js';
import { login, logout, signup, saveUser } from '../services/auth.js';

const TOUR = [
  null, // index 0 = 로그인 단계 (투어 슬라이드 아님)
  { title: '회사만 바꿔서, 자소서 환승', desc: '한 번 잘 쓴 자소서, 새로 지원할 회사에 맞게 단어만 쏙쏙 갈아끼워요.' },
  { title: '바꿀 곳을 색깔로 콕콕', desc: '회사명·직군·인재상 키워드부터 어색한 문장까지, 잡아서 수정안을 제안해요.' },
  { title: '복사 한 번, 보관함에 차곡차곡', desc: '마음에 들면 바로 복사하거나 보관함에 저장해 다음 지원 때 또 환승하세요.' },
];

/* ---------- 상태 슬라이스 (팀 E가 main.js 에 spread 해줘야 함) ---------- */
export const onboardingInitialState = {
  authMode: 'buttons', // 'buttons' | 'form' | 'signup'
  authError: '',
  // authUsername / authPassword 는 state에 두지 않음 — 타이핑마다 re-render가 일어나
  // onboarding-card 애니메이션이 반복 재생되므로 submit 시 DOM에서 직접 읽는다.
};

/* ---------- 뷰 ---------- */
export function onboardingView(state) {
  const step = state.onboardingStep;

  if (step === 0) {
    if (state.authMode === 'form')   return renderLoginForm(state);
    if (state.authMode === 'signup') return renderSignupForm(state);
    return `
    <div class="onboarding-overlay">
      <div class="onboarding-card">
        <div class="onboarding-card__hero">
          <img class="onboarding-card__illust" src="assets/onboarding-login.png"
               alt="자소서 환승 — 더 좋은 회사로, 당신의 이야기를 환승하세요." />
          <div class="onboarding-card__actions">
            <button class="btn btn--kakao btn--block" disabled>
              <span class="kakao-ico">k</span>카카오로 시작하기
            </button>
            <button class="btn btn--email btn--block" data-action="auth:show-form">이메일로 시작하기</button>
          </div>
          <button class="onboarding-card__skip" data-action="auth:login">그냥 둘러볼게요</button>
        </div>
      </div>
    </div>`;
  }

  const slide = TOUR[step] || TOUR[1];
  const dots = [1, 2, 3].map((n) => `<span class="tour-dot ${n === step ? 'is-on' : ''}"></span>`).join('');

  const illust = step === 1
    ? `<img class="tour-illust__img" src="assets/onboarding-tour1.png" alt="자소서 환승" />`
    : step === 2
    ? `<div class="tour-illust__bars">
         <span class="bar" style="width:100%"></span>
         <span class="bar-row">
           <span class="bar bar--blue" style="width:36%"></span>
           <span class="bar" style="width:30%"></span>
           <span class="bar bar--mint" style="width:24%"></span>
         </span>
         <span class="bar" style="width:90%"></span>
         <span class="bar-row">
           <span class="bar bar--amber" style="width:50%"></span>
           <span class="bar bar--pink" style="width:38%"></span>
         </span>
       </div>`
    : `<div class="tour-illust__cards">
         <span class="tour-illust__card tour-illust__card--back"></span>
         <span class="tour-illust__card tour-illust__card--front">✓</span>
       </div>`;

  return `
  <div class="onboarding-overlay">
    <div class="onboarding-card">
      <div class="onboarding-card__tour">
        <button class="onboarding-card__close" data-action="tour:skip">건너뛰기</button>
        <div class="tour-illust">${illust}</div>
        <div class="onboarding-card__body">
          <div class="onboarding-card__title">${slide.title}</div>
          <p class="onboarding-card__desc">${slide.desc}</p>
          <div class="tour-dots">${dots}</div>
        </div>
        <div class="onboarding-card__footer">
          <label class="dont-show">
            <span class="dont-show__box ${state.dontShowOnboarding ? 'is-on' : ''}" data-action="tour:dont-toggle">${state.dontShowOnboarding ? '✓' : ''}</span>
            다시 보지 않기
          </label>
          <div class="onboarding-card__nav">
            ${step > 1 ? `<button class="btn btn--ghost" data-action="tour:prev">이전</button>` : ''}
            <button class="btn btn--primary" data-action="tour:next">${step >= 3 ? '시작하기' : '다음'}</button>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

function renderLoginForm(state) {
  return `
  <div class="onboarding-overlay">
    <div class="onboarding-card">
      <div class="onboarding-card__hero">
        <div class="login-form">
          <h2 class="login-form__title">로그인</h2>
          ${state.authError ? `<p class="login-form__error">${state.authError}</p>` : ''}
          <div class="login-form__fields">
            <input class="login-form__input" type="text" placeholder="아이디"
              data-action="auth:username" autocomplete="username" />
            <input class="login-form__input" type="password" placeholder="비밀번호"
              data-action="auth:password" autocomplete="current-password" />
          </div>
          <div class="login-form__actions">
            <button class="btn btn--primary btn--block" data-action="auth:submit">로그인</button>
            <button class="btn btn--ghost btn--block" data-action="auth:back">뒤로</button>
          </div>
          <p class="login-form__switch">계정이 없으신가요? <button class="login-form__switch-btn" data-action="auth:show-signup">회원가입</button></p>
        </div>
      </div>
    </div>
  </div>`;
}

function renderSignupForm(state) {
  return `
  <div class="onboarding-overlay">
    <div class="onboarding-card">
      <div class="onboarding-card__hero">
        <div class="login-form">
          <h2 class="login-form__title">회원가입</h2>
          ${state.authError ? `<p class="login-form__error">${state.authError}</p>` : ''}
          <div class="login-form__fields">
            <input class="login-form__input" type="text" placeholder="아이디"
              data-action="auth:signup-username" autocomplete="username" />
            <input class="login-form__input" type="password" placeholder="비밀번호"
              data-action="auth:signup-password" autocomplete="new-password" />
            <input class="login-form__input" type="text" placeholder="이름"
              data-action="auth:signup-name" autocomplete="name" />
          </div>
          <div class="login-form__actions">
            <button class="btn btn--primary btn--block" data-action="auth:signup-submit">가입하기</button>
            <button class="btn btn--ghost btn--block" data-action="auth:show-form">로그인으로 돌아가기</button>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

/* ---------- 액션 (팀 E가 main.js actions 에 ...onboardingActions 로 spread 해줘야 함) ---------- */
export const onboardingActions = {
  'auth:show-form':     () => setState({ authMode: 'form', authError: '' }),
  'auth:show-signup':   () => setState({ authMode: 'signup', authError: '' }),
  'auth:back':          () => setState({ authMode: 'buttons', authError: '' }),
  'auth:logout':        () => {
    logout();
    setState({ screen: 'onboarding', onboardingStep: 0, authMode: 'buttons', authError: '', user: null });
  },
  'auth:submit':        async () => {
    const username = document.querySelector('[data-action="auth:username"]')?.value?.trim() ?? '';
    const password = document.querySelector('[data-action="auth:password"]')?.value ?? '';
    if (!username || !password) {
      setState({ authError: '아이디와 비밀번호를 입력해주세요' });
      return;
    }
    try {
      const user = await login({ username, password });
      saveUser(user);
      setState({ screen: 'app', user, authError: '' });
    } catch (err) {
      const is401 = err?.message?.includes('401');
      setState({ authError: is401 ? 'ID/비밀번호를 확인해주세요' : '로그인에 실패했어요' });
    }
  },
  'auth:signup-submit': async () => {
    const username = document.querySelector('[data-action="auth:signup-username"]')?.value?.trim() ?? '';
    const password = document.querySelector('[data-action="auth:signup-password"]')?.value ?? '';
    const name     = document.querySelector('[data-action="auth:signup-name"]')?.value?.trim() ?? '';
    if (!username || !password || !name) {
      setState({ authError: '아이디, 비밀번호, 이름을 모두 입력해주세요' });
      return;
    }
    try {
      const user = await signup({ username, password, name });
      saveUser(user);
      setState({ screen: 'app', user, authError: '' });
    } catch (err) {
      const is409 = err?.message?.includes('409');
      setState({ authError: is409 ? '이미 사용 중인 아이디예요' : '가입에 실패했어요' });
    }
  },
};

/* ---------- input 핸들러 (팀 E가 main.js input delegate 에 추가해줘야 함) ---------- */
// DOM 값만 유지 — setState 하면 re-render → onboarding-card 애니메이션 재실행되므로 의도적으로 비워둠
export function handleOnboardingInput() {}

/* ---------- keydown 핸들러 (팀 E가 main.js 에 keydown delegate 추가해줘야 함) ---------- */
export function handleOnboardingKeydown(e, action) {
  if (e.key !== 'Enter') return;
  if (action === 'auth:username' || action === 'auth:password') {
    onboardingActions['auth:submit']();
  }
  if (action === 'auth:signup-username' || action === 'auth:signup-password' || action === 'auth:signup-name') {
    onboardingActions['auth:signup-submit']();
  }
}
