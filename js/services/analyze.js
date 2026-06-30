// js/services/analyze.js
// 자소서 AI 분석 서비스.
// 담당: 팀원 C
//
// [현재] 로컬 규칙 기반 분석 (lib/matcher.js)
// [추후] USE_SERVER = true 로 바꾸면 api/analyze.js 로 요청 전송

import { post } from './http.js';
import { buildSuggestions, applySuggestions } from '../lib/matcher.js';

const USE_SERVER = false; // api/analyze.js 완성 후 true 로 변경

export async function analyze({ text, target, role }) {
  if (!USE_SERVER) {
    return buildSuggestions({ text, target, role });
  }
  return post('/api/analyze', { text, target, role });
}

export { applySuggestions };
