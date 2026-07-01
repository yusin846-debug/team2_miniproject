// shared/js/router.js
// state.screen / state.tab / state.stage 를 보고 어떤 화면을 그릴지 결정하는 라우터.
// 팀원별 화면(write/result/archive)은 각자 소유한 view 함수만 노출하고,
// 이 파일이 그 view 들을 조합해 최종 HTML을 만든다.

import { headerView } from './header.js';
import { onboardingView } from './onboarding.js';
import { toastView } from './toast.js';
import { writeView } from '../../screens/write/write.view.js';
import { resultView } from '../../screens/result/result.view.js';
import { archiveView } from '../../screens/archive/archive.view.js';

export function render(state) {
  const body =
    state.tab === 'archive' ? archiveView(state)
    : state.stage === 'result' ? resultView(state)
    : writeView(state);

  // 온보딩(로그인/투어)도 항상 앱 셸 위에 얹어서 그린다 — 뒤에 실제 화면이 있어야
  // 온보딩 오버레이의 backdrop-filter(블러)가 유리처럼 비쳐 보인다.
  const shell = headerView(state) + `<main class="app-main">${body}</main>`;
  const onboarding = state.screen === 'onboarding' ? onboardingView(state) : '';

  return shell + onboarding + toastView(state);
}
