// js/services/analyze.js
// 자소서 AI 분석 서비스.
// 담당: 팀원 C
//
// [현재] api/analyze.js (OpenAI 연동) 로 요청 전송
// [폴백] 서버 실패 시 로컬 규칙 기반 분석 (lib/matcher.js) 로 대체할 수 있음 — USE_SERVER=false 로 전환

import { post } from './http.js';
import { buildSuggestions, applySuggestions } from '../lib/matcher.js';

const USE_SERVER = true; // api/analyze.js 완성 후 true 로 변경됨

export async function analyze({ text, target, role }) {
  if (!USE_SERVER) {
    return buildSuggestions({ text, target, role });
  }
  return post('/api/analyze', { text, target, role });
}

export { applySuggestions };
