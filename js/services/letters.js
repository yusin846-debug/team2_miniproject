// js/services/letters.js
// 보관함 CRUD 서비스.
// 담당: 팀원 D
//
// [현재] api/letters.js · api/letters/[id].js 완성됨 — 서버로 요청
// [폴백] 서버 실패 시 로컬 시드 데이터(ARCHIVE_SEED)로 대체할 수 있음 — USE_SERVER=false 로 전환
//
// [브라우저 폴백] Vercel 배포본은 서버리스 함수의 파일시스템이 읽기 전용이라
// api/letters.js 가 db.json 에 쓰기(등록·삭제)를 시도하면 항상 실패한다(FUNCTION_INVOCATION_FAILED).
// 그래서 등록/삭제가 서버에서 실패하면 이 브라우저의 localStorage 에만 저장해 화면상으로는
// 계속 동작하게 해준다 — 진짜 다중 사용자 DB가 아니라 "이 기기에서만 보이는" 임시 저장이다.

import { get, post, del } from './http.js';
import { ARCHIVE_SEED } from '../data/samples.js';

const USE_SERVER = true; // api/letters.js 완성 후 true 로 변경됨

const LOCAL_ADDED_KEY = 'hs_local_letters';   // 서버 저장 실패 시 이 기기에만 추가된 항목
const LOCAL_DELETED_KEY = 'hs_local_deleted'; // 서버 삭제 실패 시 이 기기에서만 숨길 id 목록

function readLocal(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
}
function writeLocal(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* 프라이빗 모드 등 접근 불가 시 무시 */ }
}

function matchesQuery(a, q) {
  if (!q) return true;
  return a.company.includes(q) || a.role.includes(q)
    || (a.question || '').includes(q) || (a.content || '').includes(q);
}

export async function fetchLetters(query = '') {
  const q = query.trim();

  let serverLetters = [];
  if (USE_SERVER) {
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      const qs = params.toString();
      serverLetters = await get(`/api/letters${qs ? `?${qs}` : ''}`);
    } catch {
      serverLetters = []; // 서버 조회 실패 — 로컬 항목만이라도 보여준다
    }
  } else {
    serverLetters = ARCHIVE_SEED.filter((a) => matchesQuery(a, q));
  }

  const deletedIds = new Set(readLocal(LOCAL_DELETED_KEY));
  const localAdded = readLocal(LOCAL_ADDED_KEY).filter((a) => matchesQuery(a, q));

  const merged = [...localAdded, ...serverLetters.filter((a) => !deletedIds.has(a.id))];
  merged.sort((a, b) => (a.date < b.date ? 1 : -1));
  return merged;
}

export async function fetchLetter(id) {
  const localMatch = readLocal(LOCAL_ADDED_KEY).find((a) => a.id === id);
  if (localMatch) return localMatch;
  if (!USE_SERVER) return ARCHIVE_SEED.find((a) => a.id === id) || null;
  try {
    return await get(`/api/letters/${id}`);
  } catch {
    return null;
  }
}

export async function saveLetter(payload) {
  if (USE_SERVER) {
    try {
      return await post('/api/letters', payload);
    } catch {
      // 서버 저장 실패 — 이 기기의 localStorage 에만 저장하고 계속 진행한다.
    }
  }
  const item = {
    id: 'local-' + Date.now(),
    date: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
    question: '',
    count: 0,
    ...payload,
    _local: true,
  };
  const local = readLocal(LOCAL_ADDED_KEY);
  local.unshift(item);
  writeLocal(LOCAL_ADDED_KEY, local);
  return item;
}

export async function deleteLetter(id) {
  const local = readLocal(LOCAL_ADDED_KEY);
  if (local.some((a) => a.id === id)) {
    // 이 기기에만 있던(로컬 저장) 항목 — 그냥 지우면 된다.
    writeLocal(LOCAL_ADDED_KEY, local.filter((a) => a.id !== id));
    return null;
  }

  if (USE_SERVER) {
    try {
      await del(`/api/letters/${id}`);
      return null;
    } catch {
      // 서버 삭제 실패 — 이 기기에서만 숨긴다(서버 목록에는 계속 남아있음).
    }
  }
  const deleted = readLocal(LOCAL_DELETED_KEY);
  if (!deleted.includes(id)) writeLocal(LOCAL_DELETED_KEY, [...deleted, id]);
  return { _local: true };
}
