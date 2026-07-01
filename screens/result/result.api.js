// screens/result/result.api.js
// 담당: 팀원 B
// "보관함에 저장" 버튼이 부르는 진입점. 실제 저장 엔드포인트(POST /api/letters)는
// 보관함 화면(screens/archive)이 소유하므로, 그 서비스 함수를 그대로 위임한다.

import { saveLetter } from '../archive/archive.api.js';

export async function saveResult(payload) {
  return saveLetter(payload);
}
