// api/analyze.js  →  POST /api/analyze
// 자소서 AI 분석 서버리스 함수.
// 담당: 팀원 C
//
// 완성 후 js/services/analyze.js 의 USE_SERVER 를 true 로 변경하세요.

import { callAI } from './_lib/ai.js';
import { CATEGORIES, CATEGORY_ORDER } from '../js/data/categories.js';
import { replaceWithJosa } from '../js/lib/josa.js';

const REQUIRED_FIELDS = ['id', 'original', 'suggestion', 'reason'];
const MAX_PER_CATEGORY = 20; // 정상적인 개수 제한이 아니라, AI 오작동(무한 반복 등) 방지용 안전장치
const NON_COMPANY_CATEGORIES = CATEGORY_ORDER.filter((id) => id !== 'company');

function buildPrompt({ text, target, role }) {
  return `
너는 자소서 첨삭 전문가야. 아래 자소서를 "${target}" 회사의 "${role}" 직군에 지원하는 용도로 첨삭해야 해.

## companies — 언급된 회사명 분류
본문에 언급된 모든 회사명을 찾아 나열하고, 각각을 다음 중 하나로 분류해라.
- "worked_at": 과거/현재 근무·인턴·프로젝트 경험을 설명하는 문맥에서 언급된 회사명
  예: "삼성전자에서 2년간 마케팅 업무를 담당하며 캠페인 기획 경험을 쌓았습니다." → 삼성전자는 worked_at
- "target": 그 외의 문맥(지원동기, 포부, 가치 공감 등)에서 언급된 회사명 — 치환 대상
  예: "저는 삼성전자의 도전적인 조직문화에 깊이 공감하여 지원하게 되었습니다." → 삼성전자는 target
- 지원하는 회사와 이미 근무한 회사의 이름은 절대 같을 수 없다는 전제를 따라라. 본문에는 예시·비교 목적으로 언급된 회사명은 없다고 가정해라 (즉 worked_at 이 아니면 전부 target 이다).
- 같은 회사명이 본문에 여러 번 나와도 목록에는 한 번만 올려라. (몇 번 나오는지는 신경 쓰지 않아도 된다 — 그건 별도로 처리한다.)

## keyword — 인재상·가치
본문에서 (이전에 지원했던 회사의) 인재상/가치/조직문화를 언급한 문장을 찾아라. "${target}"가 실제로 추구할 것으로 알려진 미션·가치에 맞게 그 문장을 다시 쓰도록 제안해라. "${target}"에 대해 확실히 아는 정보가 없다면 사실을 단정하지 말고 일반적인 표현으로 제안하며 confidence 를 "low" 로 설정해라.

## position — 직군·포지션
본문에서 직무/포지션 관련 키워드나 표현을 찾아 "${role}" 직군에 맞는 표현으로 바꾸도록 제안해라.

## grammar — 문장·맞춤법
본문에서 어색하거나 맞춤법·문법이 잘못된 문장을 찾아 더 자연스러운 문장으로 고쳐 제안해라. 본문에 없는 새로운 내용을 추가하지 마라.

## tone — 지원동기 톤
본문의 지원동기·자기소개 문장 중 "${target}"의 서비스·브랜드 톤과 어울리지 않는 부분을 찾아, 그 톤에 맞게 다시 쓰도록 제안해라. "${target}"의 톤에 대한 확신이 낮으면 confidence 를 "low" 로 설정해라.

## 공통 규칙
- companies 는 개수 제한 없이 발견되는 회사명을 전부 나열해라.
- keyword/position/grammar/tone 은 각 카테고리당 최대 1건만 제안해라. 아무것도 발견되지 않은 카테고리는 suggestions 에서 아예 제외해라.
- original 은 반드시 본문에 실제로 존재하는 문구를 그대로 옮겨 적어라 (지어내지 마라).
- 아래 JSON 형식으로만 응답해라. 마크다운 코드펜스나 다른 설명 문장은 절대 포함하지 마라.

{
  "companies": [
    { "name": "본문에 실제로 쓰인 표기 그대로의 회사명", "role": "worked_at 또는 target" }
  ],
  "suggestions": [
    {
      "id": "keyword | position | grammar | tone 중 하나",
      "original": "본문에서 그대로 발췌한 원문",
      "suggestion": "수정 제안",
      "reason": "제안 이유 (한 문장)",
      "confidence": "high 또는 low"
    }
  ]
}

자소서 본문:
"""
${text}
"""
`.trim();
}

// 문장 단위로 나눈다 (마침표/느낌표/물음표/줄바꿈 기준). company 치환 대상 문장을 찾는 데만 쓴다.
function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
}

// AI가 분류한 회사명 중 "target"만 골라, 본문에서 실제로 등장하는 모든 문장을 코드가 직접 찾아 치환한다.
// (전제: 지원 회사와 이미 근무한 회사의 이름은 다르므로, target 으로 분류된 회사명은 문맥 재판단 없이 전부 치환해도 안전하다.)
function buildCompanySuggestions(text, companies, target) {
  const targetNames = (Array.isArray(companies) ? companies : [])
    .filter((c) => c && typeof c.name === 'string' && c.name.length > 0 && c.role === 'target' && c.name !== target)
    .map((c) => c.name);

  if (targetNames.length === 0) return { origin: '—', companySuggestions: [] };

  const sentences = splitSentences(text);
  const seenSentences = new Set();
  const cat = CATEGORIES.company;
  const companySuggestions = [];

  for (const name of targetNames) {
    for (const sentence of sentences) {
      if (seenSentences.has(sentence) || !sentence.includes(name)) continue;
      seenSentences.add(sentence);
      const index = companySuggestions.length;
      companySuggestions.push({
        id: index === 0 ? 'company' : `company-${index}`,
        category: 'company',
        label: cat.label,
        color: cat.color,
        bg: cat.bg,
        original: sentence,
        suggestion: replaceWithJosa(sentence, name, target),
        reason: `'${name}'을(를) '${target}'(으)로 치환합니다.`,
        confidence: 'high',
      });
    }
  }

  return { origin: targetNames[0], companySuggestions };
}

function parseAIResponse(raw, { text, target }) {
  const cleaned = raw.trim().replace(/^```(json)?/i, '').replace(/```$/i, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('AI 응답을 JSON으로 해석할 수 없습니다');
  }

  if (!Array.isArray(parsed.suggestions)) {
    throw new Error('AI 응답에 suggestions 배열이 없습니다');
  }

  const seenOriginals = new Set();   // 같은 카테고리 내 동일 문구 중복 방지
  const countPerCategory = new Map();

  const otherSuggestions = parsed.suggestions
    .filter((item) => item && NON_COMPANY_CATEGORIES.includes(item.id)
      && REQUIRED_FIELDS.every((field) => typeof item[field] === 'string' && item[field].length > 0))
    .filter((item) => {
      const key = `${item.id}::${item.original}`;
      if (seenOriginals.has(key)) return false;
      seenOriginals.add(key);
      return true;
    })
    .filter((item) => (countPerCategory.get(item.id) ?? 0) < MAX_PER_CATEGORY)
    .map((item) => {
      const cat = CATEGORIES[item.id];
      const index = countPerCategory.get(item.id) ?? 0;
      countPerCategory.set(item.id, index + 1);
      return {
        id: index === 0 ? item.id : `${item.id}-${index}`, // 같은 카테고리에 여러 건이면 고유 id 부여
        category: item.id,
        label: cat.label,
        color: cat.color,
        bg: cat.bg,
        original: item.original,
        suggestion: item.suggestion,
        reason: item.reason,
        confidence: item.confidence === 'low' ? 'low' : 'high',
      };
    });

  const { origin, companySuggestions } = buildCompanySuggestions(text, parsed.companies, target);

  const suggestions = [...companySuggestions, ...otherSuggestions]
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)); // 카테고리별로 묶어서 정렬 (Array#sort 는 stable)

  return { origin, suggestions };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { text, target, role } = req.body;

  if (!text || !target || !role) {
    return res.status(400).json({ error: '필수 값이 누락되었습니다 (text, target, role)' });
  }

  const prompt = buildPrompt({ text, target, role });

  try {
    const aiResponse = await callAI(prompt);
    const result = parseAIResponse(aiResponse, { text, target });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
