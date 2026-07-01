// js/services/letters.js
// 보관함 CRUD 서비스.
// 담당: 팀원 D
//
// [현재] api/letters.js · api/letters/[id].js 완성됨 — 서버로 요청
// [폴백] 서버 실패 시 로컬 시드 데이터(ARCHIVE_SEED)로 대체할 수 있음 — USE_SERVER=false 로 전환

import { get, post, patch, del } from './http.js';
import { ARCHIVE_SEED } from '../data/samples.js';

const USE_SERVER = true; // api/letters.js 완성 후 true 로 변경됨

export const TRASH_RETENTION_DAYS = 30; // 휴지통 보관 기간 — 지나면 자동으로 완전히 삭제

// 서버가 없는 로컬 폴백 모드에서, 조회할 때마다 보관 기간이 지난 휴지통 항목을 완전히 지운다.
function purgeExpiredTrashLocal() {
  const cutoff = Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  for (let i = ARCHIVE_SEED.length - 1; i >= 0; i--) {
    const deletedAt = ARCHIVE_SEED[i].deletedAt;
    if (deletedAt && new Date(deletedAt).getTime() < cutoff) ARCHIVE_SEED.splice(i, 1);
  }
}

export async function fetchLetters(query = '') {
  if (!USE_SERVER) {
    purgeExpiredTrashLocal();
    const q = query.trim();
    return ARCHIVE_SEED
      .filter((a) => !a.deletedAt)
      .filter((a) => !q || a.company.includes(q) || a.role.includes(q)
        || (a.question || '').includes(q) || (a.content || '').includes(q));
  }
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  const qs = params.toString();
  return get(`/api/letters${qs ? `?${qs}` : ''}`);
}

export async function fetchTrash() {
  if (!USE_SERVER) {
    purgeExpiredTrashLocal();
    return ARCHIVE_SEED.filter((a) => a.deletedAt);
  }
  return get('/api/letters/trash');
}

export async function fetchLetter(id) {
  if (!USE_SERVER) return ARCHIVE_SEED.find((a) => a.id === id) || null;
  return get(`/api/letters/${id}`);
}

export async function saveLetter(payload) {
  if (!USE_SERVER) {
    const item = {
      id: 'a' + Date.now(),
      date: new Date().toISOString().slice(0, 10).replace(/-/g, '.'),
      question: '',
      ...payload,
    };
    ARCHIVE_SEED.unshift(item);
    return item;
  }
  return post('/api/letters', payload);
}

export async function deleteLetter(id) {
  if (!USE_SERVER) {
    const item = ARCHIVE_SEED.find((a) => a.id === id);
    if (item) item.deletedAt = new Date().toISOString();
    return null;
  }
  return del(`/api/letters/${id}`);
}

export async function restoreLetter(id) {
  if (!USE_SERVER) {
    const item = ARCHIVE_SEED.find((a) => a.id === id);
    if (item) delete item.deletedAt;
    return item || null;
  }
  return patch(`/api/letters/${id}?action=restore`);
}

export async function permanentlyDeleteLetter(id) {
  if (!USE_SERVER) {
    const i = ARCHIVE_SEED.findIndex((a) => a.id === id);
    if (i > -1) ARCHIVE_SEED.splice(i, 1);
    return null;
  }
  return del(`/api/letters/${id}?permanent=true`);
}
