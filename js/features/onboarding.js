// js/features/onboarding.js
// 담당: 팀원 A
// 온보딩 — 로그인 화면 + 기능 투어. 특정 화면 소유가 아닌 공통 셸(최초 진입 시에만 노출).

const TOUR = [
  null, // index 0 = 로그인 단계 (투어 슬라이드 아님)
  { title: '회사만 바꿔서, 자소서 환승', desc: '한 번 잘 쓴 자소서, 새로 지원할 회사에 맞게 단어만 쏙쏙 갈아끼워요.' },
  { title: '바꿀 곳을 색깔로 콕콕', desc: '회사명·직군·인재상 키워드부터 어색한 문장까지, 잡아서 수정안을 제안해요.' },
  { title: '복사 한 번, 보관함에 차곡차곡', desc: '마음에 들면 바로 복사하거나 보관함에 저장해 다음 지원 때 또 환승하세요.' },
];

export function onboardingView(state) {
  const step = state.onboardingStep;

  if (step === 0) {
    return `
    <div class="onboarding-overlay">
      <div class="onboarding-card">
        <div class="onboarding-card__hero">
          <img class="onboarding-card__illust" src="assets/onboarding-login.png"
               alt="자소서 환승 — 더 좋은 회사로, 당신의 이야기를 환승하세요." />
          <div class="onboarding-card__actions">
            <button class="btn btn--kakao btn--block" data-action="auth:login" data-provider="kakao">
              <span class="kakao-ico">k</span>카카오로 시작하기
            </button>
            <button class="btn btn--email btn--block" data-action="auth:login" data-provider="email">이메일로 시작하기</button>
          </div>
          <button class="onboarding-card__skip" data-action="tour:skip">그냥 둘러볼게요</button>
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
