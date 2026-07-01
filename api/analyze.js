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
const OTHER_CATEGORIES = ['keyword', 'grammar', 'tone']; // company·position 은 각자 별도 프롬프트로 다수결 처리
const COMPANY_VOTES = 3; // 회사명 분류가 흔들리는 경우가 있어 다수결로 정확도를 높인다
const POSITION_VOTES = 3; // position 도 같은 이유로 다수결 처리

// companies 분류만 담당하는 프롬프트. 작고 가벼워서 여러 번(다수결) 호출해도 비용 부담이 적다.
function buildCompanyPrompt({ text, target }) {
  return `
너는 자소서 첨삭 전문가야. 아래 자소서를 "${target}" 회사에 지원하는 용도로 첨삭 준비 중이야.

## companies — 언급된 회사명 분류
본문에 언급된 모든 회사명을 찾아 나열하고, 각각을 다음 중 하나로 분류해라.
- "worked_at": 화자(자소서 작성자) 자신이 그 회사에 소속되어 근무했거나 근무 중임을 설명하는 경우에만 해당한다.
  판단 기준은 "누가 그 회사와 관계를 맺고 있는 주체인가"다 — 화자 자신의 소속·경력을 말하는 문장만 worked_at이다.
  예: "삼성전자에서 2년간 마케팅 업무를 담당하며 캠페인 기획 경험을 쌓았습니다." → worked_at (화자 자신의 경력)
- "target": 그 외 모든 언급 — 치환 대상. 화자의 지원동기·포부를 말하는 문장뿐 아니라, 회사 자체를 3인칭으로 설명·칭찬하는 문장도 포함된다.
  예: "삼성전자에서 개발자로 성장하고 싶습니다." → target (화자의 미래 희망)
  예: "국민은행은 과거부터 국민들의 은행을 잘 지켜왔습니다." → target (회사 자체를 설명하는 문장이지, 화자의 경력이 아님)
- 주의: 문장의 시제만으로 판단하지 마라. 과거시제라도 화자 자신의 경력이 아니라 회사 자체를 설명하는 문장이면 target이다.
- 지원하는 회사와 이미 근무한 회사의 이름은 절대 같을 수 없다는 전제를 따라라. 본문에는 예시·비교 목적으로 언급된 회사명은 없다고 가정해라 (즉 worked_at이 아니면 전부 target이다).
- worked_at 인지 target 인지 판단이 애매하면 confidence 를 "low" 로 표시해라 (그래도 목록에는 반드시 포함시켜라).
- 같은 회사명이 본문에 여러 번 나와도 목록에는 한 번만 올려라.

아래 JSON 형식으로만 응답해라. 마크다운 코드펜스나 다른 설명 문장은 절대 포함하지 마라.
{
  "companies": [
    { "name": "본문에 실제로 쓰인 표기 그대로의 회사명", "role": "worked_at 또는 target", "confidence": "high 또는 low" }
  ]
}

자소서 본문:
"""
${text}
"""
`.trim();
}

// position 분류만 담당하는 프롬프트. company 와 마찬가지로 판단이 흔들려서 다수결로 호출한다.
function buildPositionPrompt({ text, role }) {
  return `
너는 자소서 첨삭 전문가야. 아래 자소서를 "${role}" 직군에 지원하는 용도로 첨삭 준비 중이야.

## position — 직군·포지션
본문에서 직무/포지션 관련 키워드나 표현을 찾아 "${role}" 직군에 맞는 표현으로 바꾸도록 제안해라.
- 화자 자신이 실제로 그 직무를 수행했다고 설명하는 문맥(경력·경험 서술)의 직무명은 절대 건드리지 마라.
  예: "네이버에서 2년간 마케터로 근무했습니다." → 여기서 "마케터"는 화자의 실제 경력이므로 치환 대상 아님
- 지원동기·포부·자기소개에서 언급된 직무명만 치환 대상이다.
  예: "저는 마케터로서 귀사에 기여하고 싶습니다." → 화자의 포부이므로 치환 대상
- 최대 1건만 제안해라. 발견되지 않으면 suggestions 를 빈 배열로 반환해라.
- original 은 반드시 그 수정이 포함된 **문장 전체**를 그대로 옮겨 적어라. 짧은 구절만 쓰면 본문에 같은 표현이 여러 번 나올 때 어느 위치인지 구분할 수 없다.
- suggestion 을 작성할 때는 직무명만 수정하고, 나머지(특히 회사명)는 절대 바꾸지 말고 원문 그대로 유지해라. 회사명은 이 프롬프트가 담당하지 않는다.

아래 JSON 형식으로만 응답해라. 마크다운 코드펜스나 다른 설명 문장은 절대 포함하지 마라.
{
  "suggestions": [
    { "original": "본문에서 그대로 발췌한 문장 전체", "suggestion": "수정 제안", "reason": "제안 이유 (한 문장)" }
  ]
}

자소서 본문:
"""
${text}
"""
`.trim();
}

// company·position 을 제외한 카테고리(keyword/grammar/tone)를 담당하는 프롬프트.
function buildOtherPrompt({ text, target, role }) {
  return `
너는 자소서 첨삭 전문가야. 아래 자소서를 "${target}" 회사의 "${role}" 직군에 지원하는 용도로 첨삭해야 해.

## keyword — 인재상·가치
본문에서 (이전에 지원했던 회사의) 인재상/가치/조직문화를 언급한 문장을 찾아라. "${target}"가 실제로 추구할 것으로 알려진 미션·가치에 맞게 그 문장을 다시 쓰도록 제안해라. "${target}"에 대해 확실히 아는 정보가 없다면 사실을 단정하지 말고 일반적인 표현으로 제안하며 confidence 를 "low" 로 설정해라.

## grammar — 문장·맞춤법
본문에서 어색하거나 맞춤법·문법이 잘못된 문장을 찾아 더 자연스러운 문장으로 고쳐 제안해라. 본문에 없는 새로운 내용을 추가하지 마라.

## tone — 지원동기 톤
본문의 지원동기·자기소개 문장 중 "${target}"의 서비스·브랜드 톤과 어울리지 않는 부분을 찾아, 그 톤에 맞게 다시 쓰도록 제안해라. "${target}"의 톤에 대한 확신이 낮으면 confidence 를 "low" 로 설정해라.

## 공통 규칙
- 카테고리당 최대 1건만 제안해라. 아무것도 발견되지 않은 카테고리는 결과에서 아예 제외해라.
- original 은 반드시 본문에 실제로 존재하는 문구를 그대로 옮겨 적어라 (지어내지 마라).
- original 은 반드시 그 수정이 포함된 **문장 전체**를 옮겨 적어라. 짧은 구절만 쓰면 안 된다 — 본문에 같은 표현이 여러 번 나올 경우 어느 위치를 말하는지 구분할 수 없기 때문이다.
- suggestion 을 작성할 때는 **그 카테고리가 담당하는 부분만** 수정하고, 나머지는 original 그대로 유지해라. 특히 회사명·직군명은 이 프롬프트가 담당하지 않으니(별도로 처리됨) 본문에 어떤 회사명·직무명이 있든 절대 바꾸지 말고 원문 그대로 남겨라.
- 아래 JSON 형식으로만 응답해라. 마크다운 코드펜스나 다른 설명 문장은 절대 포함하지 마라.

{
  "suggestions": [
    {
      "id": "keyword | grammar | tone 중 하나",
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

function parseJSON(raw) {
  try {
    return JSON.parse(raw.trim().replace(/^```(json)?/i, '').replace(/```$/i, '').trim());
  } catch {
    return null;
  }
}

// companies 분류를 COMPANY_VOTES 번 병렬로 호출해서 다수결로 최종 role 을 정한다.
// (동점이면 판단이 애매하다는 뜻이므로 target · confidence:low 후보로 남긴다.)
async function classifyCompanies({ text, target }) {
  const prompt = buildCompanyPrompt({ text, target });
  const responses = await Promise.all(
    Array.from({ length: COMPANY_VOTES }, () => callAI(prompt).catch(() => null)),
  );

  const tally = new Map(); // name -> { target: n, worked_at: n }
  for (const raw of responses) {
    if (!raw) continue;
    const parsed = parseJSON(raw);
    if (!Array.isArray(parsed?.companies)) continue;
    for (const c of parsed.companies) {
      if (!c || typeof c.name !== 'string' || !c.name) continue;
      const entry = tally.get(c.name) ?? { target: 0, worked_at: 0 };
      if (c.role === 'target') entry.target++;
      else entry.worked_at++;
      tally.set(c.name, entry);
    }
  }

  const companies = [];
  for (const [name, { target: t, worked_at: w }] of tally) {
    if (t > w) companies.push({ name, role: 'target', confidence: 'high' });
    else if (w > t) companies.push({ name, role: 'worked_at', confidence: 'high' });
    else companies.push({ name, role: 'target', confidence: 'low' }); // 동점 = 애매함 → 후보로 남김
  }
  return companies;
}

// position 제안을 POSITION_VOTES 번 병렬로 호출해서 다수결로 정한다.
// company 는 "회사명별 target/worked_at 득표"로 집계했지만, position 은 매번 다른 문장을
// 고를 수 있어서 같은 방식이 안 통한다. 대신 "어떤 문장(original)을 제안했는지"로 묶어서
// 가장 많이 나온 것을 채택하고, 3번 중 2번 이상 동의하면 confidence: high, 아니면 low 로 표시한다.
async function classifyPosition({ text, role }) {
  const prompt = buildPositionPrompt({ text, role });
  const responses = await Promise.all(
    Array.from({ length: POSITION_VOTES }, () => callAI(prompt).catch(() => null)),
  );

  const valid = [];
  for (const raw of responses) {
    if (!raw) continue;
    const parsed = parseJSON(raw);
    const item = Array.isArray(parsed?.suggestions) ? parsed.suggestions[0] : null;
    if (!item || typeof item.original !== 'string' || !item.original
      || typeof item.suggestion !== 'string' || !item.suggestion) continue;
    valid.push(item);
  }
  if (valid.length === 0) return null; // 3번 다 아무 제안도 못 찾음

  const groups = new Map(); // original 문장 -> 그 문장을 고른 응답들
  for (const item of valid) {
    const key = item.original;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }

  let best = null;
  for (const items of groups.values()) {
    if (!best || items.length > best.length) best = items;
  }

  return { ...best[0], confidence: best.length >= 2 ? 'high' : 'low' };
}

// 문장 단위로 나눈다 (마침표/느낌표/물음표/줄바꿈 기준). company 치환 대상 문장을 찾는 데만 쓴다.
function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
}

// AI가 분류한 회사명 중 "target"(치환 대상) 및 "confidence: low"(애매해서 후보로는 남겨야 하는 것)를 골라,
// 본문에서 실제로 등장하는 모든 문장을 코드가 직접 찾아 치환 후보로 만든다.
// (전제: 지원 회사와 이미 근무한 회사의 이름은 다르므로, target 으로 확신 있게 분류된 회사명은
//  문맥 재판단 없이 전부 치환해도 안전하다. 반대로 worked_at 이라도 확신이 낮으면 무조건 버리지 않고
//  낮은 확신도 후보로 남겨서 사용자가 직접 판단하게 한다.)
function buildCompanySuggestions(text, companies, target) {
  const candidates = (Array.isArray(companies) ? companies : [])
    .filter((c) => c && typeof c.name === 'string' && c.name.length > 0 && c.name !== target
      && (c.role === 'target' || c.confidence === 'low'))
    .map((c) => ({ name: c.name, confidence: c.confidence === 'low' ? 'low' : 'high' }));

  if (candidates.length === 0) return { origin: '—', companySuggestions: [] };

  const sentences = splitSentences(text);
  const seenSentences = new Set();
  const cat = CATEGORIES.company;
  const companySuggestions = [];

  for (const { name, confidence } of candidates) {
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
        confidence,
      });
    }
  }

  const origin = candidates.find((c) => c.confidence === 'high')?.name ?? candidates[0]?.name ?? '—';
  return { origin, companySuggestions };
}

function parseOtherSuggestions(raw) {
  const parsed = parseJSON(raw);
  if (!Array.isArray(parsed?.suggestions)) {
    throw new Error('AI 응답에 suggestions 배열이 없습니다');
  }

  const seenOriginals = new Set();   // 같은 카테고리 내 동일 문구 중복 방지
  const countPerCategory = new Map();

  return parsed.suggestions
    .filter((item) => item && OTHER_CATEGORIES.includes(item.id)
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
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { text, target, role } = req.body;

  if (!text || !target || !role) {
    return res.status(400).json({ error: '필수 값이 누락되었습니다 (text, target, role)' });
  }

  try {
    const [companies, positionResult, otherRaw] = await Promise.all([
      classifyCompanies({ text, target }),
      classifyPosition({ text, role }),
      callAI(buildOtherPrompt({ text, target, role })),
    ]);

    const otherSuggestions = parseOtherSuggestions(otherRaw);
    const { origin, companySuggestions } = buildCompanySuggestions(text, companies, target);

    const positionSuggestions = [];
    if (positionResult) {
      const cat = CATEGORIES.position;
      positionSuggestions.push({
        id: 'position',
        category: 'position',
        label: cat.label,
        color: cat.color,
        bg: cat.bg,
        original: positionResult.original,
        suggestion: positionResult.suggestion,
        reason: positionResult.reason || cat.reason,
        confidence: positionResult.confidence,
      });
    }

    const suggestions = [...companySuggestions, ...positionSuggestions, ...otherSuggestions]
      .sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)); // 카테고리별로 묶어서 정렬 (Array#sort 는 stable)

    res.status(200).json({ origin, suggestions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
