// js/services/letters.js
// 보관함 CRUD 서비스.
// 담당: 팀원 D
//
// [현재] api/letters.js · api/letters/[id].js · api/letters/trash.js 완성됨 — 서버로 요청
// [폴백] 서버 실패 시 로컬 시드 데이터(ARCHIVE_SEED)로 대체할 수 있음 — USE_SERVER=false 로 전환
//
// [브라우저 폴백] Vercel 배포본은 서버리스 함수의 파일시스템이 읽기 전용이라
// api/letters.js 가 db.json 에 쓰기(등록·삭제·복원)를 시도하면 항상 실패한다(FUNCTION_INVOCATION_FAILED).
// 그래서 서버 쓰기가 실패하면 이 브라우저의 localStorage 에만 반영해 화면상으로는 계속
// 동작하게 해준다 — 진짜 다중 사용자 DB가 아니라 "이 기기에서만 보이는" 임시 저장이다.
// 삭제는 소프트 삭제(휴지통 이동)라, 로컬 폴백도 완전삭제 대신 로컬 휴지통으로 옮긴다.

import { get, post, patch, del } from './http.js';
import { ARCHIVE_SEED } from '../data/samples.js';

const USE_SERVER = true; // api/letters.js 완성 후 true 로 변경됨

export const TRASH_RETENTION_DAYS = 30; // 휴지통 보관 기간 — 지나면 자동으로 완전히 삭제

const LOCAL_ADDED_KEY = 'hs_local_letters';   // 서버 저장 실패 시 이 기기에만 추가된 항목
const LOCAL_TRASH_KEY = 'hs_local_trash';     // 서버 소프트삭제(휴지통 이동) 실패 시 이 기기에서만 휴지통 처리한 항목
const LOCAL_DELETED_KEY = 'hs_local_deleted'; // 서버 완전삭제 실패 시 이 기기에서만 숨길 id 목록

function readLocal(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
}
function writeLocal(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* 프라이빗 모드 등 접근 불가 시 무시 */ }
}

// 서버(api/letters.js)의 snippetOf() 와 동일한 방식 — 로컬 폴백 저장 항목도
// 미리보기 문단이 똑같이 보이도록 클라이언트에서도 같은 요약문을 만들어준다.
function snippetOf(content = '') {
  const raw = content.replace(/\n+/g, ' ').trim();
  return raw.length > 80 ? raw.slice(0, 80) + '…' : raw;
}

function matchesQuery(a, q) {
  if (!q) return true;
  return a.company.includes(q) || a.role.includes(q)
    || (a.question || '').includes(q) || (a.content || '').includes(q);
}

// 조회할 때마다 보관 기간이 지난 휴지통 항목을 완전히 지운다 — !USE_SERVER 로컬 폴백
// (ARCHIVE_SEED) 과 브라우저 폴백(LOCAL_TRASH_KEY) 양쪽 모두 정리한다.
function purgeExpiredTrashLocal() {
  const cutoff = Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  for (let i = ARCHIVE_SEED.length - 1; i >= 0; i--) {
    const deletedAt = ARCHIVE_SEED[i].deletedAt;
    if (deletedAt && new Date(deletedAt).getTime() < cutoff) ARCHIVE_SEED.splice(i, 1);
  }
  const trash = readLocal(LOCAL_TRASH_KEY).filter((a) => {
    const t = a.deletedAt ? new Date(a.deletedAt).getTime() : Date.now();
    return t >= cutoff;
  });
  writeLocal(LOCAL_TRASH_KEY, trash);
}

export async function fetchLetters(query = '') {
  purgeExpiredTrashLocal();
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
    serverLetters = ARCHIVE_SEED.filter((a) => !a.deletedAt).filter((a) => matchesQuery(a, q));
  }

  const deletedIds = new Set(readLocal(LOCAL_DELETED_KEY));
  const localTrashIds = new Set(readLocal(LOCAL_TRASH_KEY).map((a) => a.id));
  const localAdded = readLocal(LOCAL_ADDED_KEY).filter((a) => matchesQuery(a, q));

  const merged = [
    ...localAdded,
    ...serverLetters.filter((a) => !deletedIds.has(a.id) && !localTrashIds.has(a.id)),
  ];
  // 날짜가 같으면 0을 반환해야 하는데 예전 코드는 무조건 -1을 반환해서, 날짜가 같은 항목이
  // 여러 개일 때(하루에 여러 번 저장 등) 정렬 순서가 뒤죽박죽되는 버그가 있었다. 같으면 0을
  // 반환해 원래 순서(최근 저장한 게 앞에 오도록 이미 구성된 순서)를 그대로 유지하게 고쳤다.
  merged.sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1));
  return merged;
}

export async function fetchTrash() {
  purgeExpiredTrashLocal();

  let serverTrash = [];
  if (USE_SERVER) {
    try {
      serverTrash = await get('/api/letters/trash');
    } catch {
      serverTrash = [];
    }
  } else {
    serverTrash = ARCHIVE_SEED.filter((a) => a.deletedAt);
  }

  const localTrash = readLocal(LOCAL_TRASH_KEY);
  const merged = [...localTrash, ...serverTrash];
  merged.sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || ''));
  return merged;
}

export async function fetchLetter(id) {
  const localMatch = readLocal(LOCAL_ADDED_KEY).find((a) => a.id === id)
    || readLocal(LOCAL_TRASH_KEY).find((a) => a.id === id);
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
    snippet: snippetOf(payload.content),
    _local: true,
  };
  const local = readLocal(LOCAL_ADDED_KEY);
  local.unshift(item);
  writeLocal(LOCAL_ADDED_KEY, local);
  return item;
}

// 소프트 삭제(휴지통으로 이동). 서버에 정상 반영되면 null, 이 기기에서만 처리했으면
// { _local: true } 를 반환한다 — 호출부(archive.js)가 안내 문구를 다르게 보여줄 때 쓴다.
export async function deleteLetter(id) {
  // 1) 이 기기에만 있던(로컬 저장 폴백) 항목이면 지우지 않고 로컬 휴지통으로 옮긴다.
  const local = readLocal(LOCAL_ADDED_KEY);
  const localIdx = local.findIndex((a) => a.id === id);
  if (localIdx > -1) {
    const [item] = local.splice(localIdx, 1);
    writeLocal(LOCAL_ADDED_KEY, local);
    item.deletedAt = new Date().toISOString();
    const trash = readLocal(LOCAL_TRASH_KEY);
    trash.unshift(item);
    writeLocal(LOCAL_TRASH_KEY, trash);
    return { _local: true };
  }

  // 2) 서버에 있는 항목이면 서버에 소프트 삭제(휴지통 이동)를 시도한다.
  if (USE_SERVER) {
    try {
      await del(`/api/letters/${id}`);
      return null;
    } catch {
      // 서버 소프트삭제 실패(쓰기 불가) — 이 기기에서만 휴지통 처리 (아래로 계속)
    }
  }

  // 3) 서버 실패 시, 원본 정보를 가져와(읽기는 항상 가능) 로컬 휴지통에 보관한다.
  const existing = await fetchLetter(id);
  const trash = readLocal(LOCAL_TRASH_KEY);
  if (!trash.some((a) => a.id === id)) {
    trash.unshift({ ...(existing || { id }), deletedAt: new Date().toISOString() });
    writeLocal(LOCAL_TRASH_KEY, trash);
  }
  return { _local: true };
}

export async function restoreLetter(id) {
  const trash = readLocal(LOCAL_TRASH_KEY);
  const idx = trash.findIndex((a) => a.id === id);
  if (idx > -1) {
    const [item] = trash.splice(idx, 1);
    writeLocal(LOCAL_TRASH_KEY, trash);
    delete item.deletedAt;
    if (String(item.id).startsWith('local-')) {
      // 원래 서버에 없던(로컬 저장 폴백) 항목 — 다시 로컬 등록 목록으로 되돌린다.
      const added = readLocal(LOCAL_ADDED_KEY);
      added.unshift(item);
      writeLocal(LOCAL_ADDED_KEY, added);
    }
    // 서버 항목이었다면 LOCAL_TRASH_KEY 에서 빠지는 것만으로 fetchLetters() 목록에 다시 나타난다.
    return item;
  }

  if (!USE_SERVER) {
    const item = ARCHIVE_SEED.find((a) => a.id === id);
    if (item) delete item.deletedAt;
    return item || null;
  }
  return patch(`/api/letters/${id}?action=restore`);
}

export async function permanentlyDeleteLetter(id) {
  const trash = readLocal(LOCAL_TRASH_KEY);
  if (trash.some((a) => a.id === id)) {
    writeLocal(LOCAL_TRASH_KEY, trash.filter((a) => a.id !== id));
    return null;
  }

  if (!USE_SERVER) {
    const i = ARCHIVE_SEED.findIndex((a) => a.id === id);
    if (i > -1) ARCHIVE_SEED.splice(i, 1);
    return null;
  }

  try {
    await del(`/api/letters/${id}?permanent=true`);
    return null;
  } catch {
    // 서버 완전삭제 실패 — 이 기기에서만 숨긴다(서버 목록에는 계속 남아있음).
    const deleted = readLocal(LOCAL_DELETED_KEY);
    if (!deleted.includes(id)) writeLocal(LOCAL_DELETED_KEY, [...deleted, id]);
    return { _local: true };
  }
}
