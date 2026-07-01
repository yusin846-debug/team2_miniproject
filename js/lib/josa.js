// js/lib/josa.js
// 한글 조사(은/는, 이/가, 을/를, 과/와, 로/으로) 자동 교정 유틸.
// 회사명처럼 문장 안의 단어를 다른 단어로 치환할 때, 받침 유무에 따라 조사가 어색해지는 것을 방지한다.

const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;
const JONGSEONG_COUNT = 28;
const RIEUL_JONGSEONG_INDEX = 8;

function hasBatchim(char) {
  const code = char.charCodeAt(0) - HANGUL_BASE;
  if (code < 0 || char.charCodeAt(0) > HANGUL_LAST) return false;
  return code % JONGSEONG_COUNT !== 0;
}

function isRieulBatchim(char) {
  const code = char.charCodeAt(0) - HANGUL_BASE;
  if (code < 0 || char.charCodeAt(0) > HANGUL_LAST) return false;
  return code % JONGSEONG_COUNT === RIEUL_JONGSEONG_INDEX;
}

// 받침 유무로 갈리는 조사 쌍. [받침 있을 때, 받침 없을 때]
const PARTICLE_PAIRS = [
  ['은', '는'],
  ['이', '가'],
  ['을', '를'],
  ['과', '와'],
];

function pickParticle(word, [withBatchim, withoutBatchim]) {
  const lastChar = word[word.length - 1];
  return hasBatchim(lastChar) ? withBatchim : withoutBatchim;
}

function pickRoParticle(word) {
  const lastChar = word[word.length - 1];
  if (!hasBatchim(lastChar) || isRieulBatchim(lastChar)) return '로';
  return '으로';
}

// sentence 안에서 name 을 target 으로 전부 치환하되, 그 뒤에 바로 붙는 조사가 있으면
// target 의 받침 유무에 맞게 자연스러운 형태로 함께 교정한다.
export function replaceWithJosa(sentence, name, target) {
  let result = '';
  let cursor = 0;
  let idx = sentence.indexOf(name, cursor);

  while (idx !== -1) {
    result += sentence.slice(cursor, idx) + target;
    let after = idx + name.length;

    if (sentence.slice(after, after + 2) === '으로' || sentence[after] === '로') {
      const isTwoChar = sentence.slice(after, after + 2) === '으로';
      result += pickRoParticle(target);
      after += isTwoChar ? 2 : 1;
    } else {
      const pair = PARTICLE_PAIRS.find(([a, b]) => sentence[after] === a || sentence[after] === b);
      if (pair) {
        result += pickParticle(target, pair);
        after += 1;
      }
    }

    cursor = after;
    idx = sentence.indexOf(name, cursor);
  }

  result += sentence.slice(cursor);
  return result;
}
