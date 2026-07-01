// server/result/prompts.js
// 담당: 팀원 B
// Claude 첨삭 프롬프트 설계. 응답 스키마는 screens/result/result.state.js 의
// suggestion 카드 형태(id/category/label/original/suggestion/reason)와 반드시 일치해야
// 프론트가 그대로 렌더링할 수 있다.

export function buildAnalyzePrompt({ text, target, role, question }) {
  return `아래 자소서를 "${target}" 회사의 "${role}" 직군에 맞게 첨삭해 주세요.
${question ? `자소서 문항: ${question}\n` : ''}
반드시 아래 5가지 카테고리 중 실제로 고칠 만한 부분이 있는 것만 골라 이 순서의 JSON 배열로만 응답하세요.
[
  { "id": "company",  "category": "company",  "label": "회사명",      "original": "...", "suggestion": "...", "reason": "..." },
  { "id": "keyword",  "category": "keyword",  "label": "인재상·가치", "original": "...", "suggestion": "...", "reason": "..." },
  { "id": "position", "category": "position", "label": "직군·포지션", "original": "...", "suggestion": "...", "reason": "..." },
  { "id": "grammar",  "category": "grammar",  "label": "문장·맞춤법", "original": "...", "suggestion": "...", "reason": "..." },
  { "id": "tone",     "category": "tone",     "label": "지원동기 톤", "original": "...", "suggestion": "...", "reason": "..." }
]

규칙:
- "original" 은 자소서 본문에 등장하는 문구를 그대로(축약·수정 없이) 옮겨야 합니다. 화면에서 이 문구로 본문 내 위치를 찾아 강조 표시합니다.
- 고칠 부분이 없는 카테고리는 배열에서 생략하세요.
- JSON 배열 외의 다른 텍스트(설명, 코드블록 표시 등)는 절대 포함하지 마세요.

자소서:
${text}`;
}
