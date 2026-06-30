// api/analyze.js  →  POST /api/analyze
// 자소서 AI 분석 서버리스 함수.
// 담당: 팀원 C
//
// 완성 후 js/services/analyze.js 의 USE_SERVER 를 true 로 변경하세요.

import { callAI } from './_lib/ai.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { text, target, role } = req.body;

  if (!text || !target || !role) {
    return res.status(400).json({ error: '필수 값이 누락되었습니다 (text, target, role)' });
  }

  // TODO: 프롬프트 설계 및 AI 호출
  const prompt = `
    아래 자소서를 "${target}" 회사의 "${role}" 직군에 맞게 분석해줘.
    반드시 아래 5가지 카테고리 JSON 배열로만 응답해줘:
    [
      { "id": "company",  "label": "기업명 교체",   "original": "...", "suggestion": "...", "reason": "..." },
      { "id": "keyword",  "label": "핵심 키워드",   "original": "...", "suggestion": "...", "reason": "..." },
      { "id": "position", "label": "직군 적합성",   "original": "...", "suggestion": "...", "reason": "..." },
      { "id": "grammar",  "label": "문법·표현",     "original": "...", "suggestion": "...", "reason": "..." },
      { "id": "tone",     "label": "말투·어조",     "original": "...", "suggestion": "...", "reason": "..." }
    ]

    자소서:
    ${text}
  `;

  try {
    const aiResponse = await callAI(prompt);
    // TODO: aiResponse 파싱 후 suggestions 배열 구성
    res.status(200).json({ suggestions: aiResponse });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
