// server/result/claude.service.js
// 담당: 팀원 B (AI 첨삭 핵심)
// ANTHROPIC_API_KEY 가 설정되어 있으면 Claude API 로 첨삭하고,
// 없으면 클라이언트와 동일한 규칙 기반 매칭(screens/result/result.state.js)으로 로컬 폴백한다.
// → 팀원이 키 없이도 npm run dev:api 로 전체 플로우를 테스트할 수 있게 하기 위함.

import { buildAnalyzePrompt } from './prompts.js';
import { buildSuggestions } from '../../screens/result/result.state.js';
import { detectOrigin } from '../../shared/js/lib/companies.js';

const MODEL = 'claude-sonnet-5';

export async function runTransferAnalysis({ text, target, role, question }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return buildSuggestions({ text, target, role });
  }

  const prompt = buildAnalyzePrompt({ text, target, role, question });
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Claude API 요청 실패 (${res.status})`);
  }

  const data = await res.json();
  const raw = (data.content || []).map((block) => block.text || '').join('');
  const match = raw.match(/\[[\s\S]*\]/);
  const suggestions = match ? JSON.parse(match[0]) : [];

  return { origin: detectOrigin(text, target), suggestions };
}
