// js/features/onboarding.js
// 온보딩 — 로그인 화면 + 기능 투어

const TOUR = [
  { title: '한 번 쓴 자소서, 또 쓰지 마세요', desc: '기존 자소서를 붙여넣기만 하면 새 회사에 맞게 환승해 드려요.' },
  { title: '잡도리가 콕콕 잡아줘요', desc: '회사명·인재상·직군·문장·톤까지 5가지를 자동으로 제안해요.' },
  { title: '보관함에서 다시 꺼내 환승', desc: '환승한 자소서를 저장해 두고 다음 지원 때 또 활용하세요.' },
];

export function onboardingView(state) {
  // step 0 = 로그인, step >=1 = 투어
  if (state.onboardingStep === 0) {
    return `
    <div class="onboarding">
      <div class="onboarding__card">
        <img class="onboarding__logo" src="assets/logo.png" alt="자소서 환승" />
        <h2 class="onboarding__title">자소서 환승</h2>
        <p class="onboarding__lead">더 좋은 회사로, 당신의 이야기를 환승하세요.</p>
        <button class="btn btn--kakao btn--block" data-action="auth:login" data-provider="kakao">카카오로 시작하기</button>
        <button class="btn btn--line btn--block" data-action="auth:login" data-provider="email">이메일로 시작하기</button>
        <button class="onboarding__skip" data-action="tour:skip">그냥 둘러볼게요</button>
      </div>
    </div>`;
  }

  const i = state.onboardingStep - 1;
  const step = TOUR[i];
  const last = i === TOUR.length - 1;
  const dots = TOUR.map((_, k) => `<span class="dot ${k === i ? 'is-on' : ''}"></span>`).join('');

  return `
  <div class="onboarding">
    <div class="onboarding__card">
      <span class="onboarding__step-ico">✓</span>
      <h2 class="onboarding__title">${step.title}</h2>
      <p class="onboarding__lead">${step.desc}</p>
      <div class="onboarding__dots">${dots}</div>
      <button class="btn btn--primary btn--block" data-action="tour:next">${last ? '시작하기' : '다음'}</button>
      <button class="onboarding__skip" data-action="tour:skip">건너뛰기</button>
    </div>
  </div>`;
}
