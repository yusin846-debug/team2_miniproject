// screens/write/write.api.js
// 담당: 팀원 A
// "환승 준비하기" 버튼이 부르는 진입점. 서버(POST /api/transfer, server/write/transfer.route.js)
// 또는 로컬 규칙 기반 매칭(result 화면 소유)으로 분석을 실행한다.
//
// [현재] 로컬 규칙 기반 분석 (screens/result/result.state.js 의 buildSuggestions)
// [추후] USE_SERVER = true 로 바꾸면 서버(Claude API 연동, server/result/claude.service.js)로 요청 전송

import { post } from '../../shared/js/lib/http.js';
import { buildSuggestions } from '../result/result.state.js';

const USE_SERVER = false; // server/write/transfer.route.js 준비되면 true 로 변경

export async function startTransfer({ text, target, role, question }) {
  if (!USE_SERVER) {
    return buildSuggestions({ text, target, role });
  }
  return post('/api/transfer', { text, target, role, question });
}
