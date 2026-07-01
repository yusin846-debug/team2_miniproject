// js/services/letters.js
// 보관함 CRUD 서비스.
// 담당: 팀원 D
//
// [현재] api/letters.js · api/letters/[id].js 완성됨 — 서버로 요청
// [폴백] 서버 실패 시 로컬 시드 데이터(ARCHIVE_SEED)로 대체할 수 있음 — USE_SERVER=false 로 전환

import { get, post, del } from './http.js';
import { ARCHIVE_SEED } from '../data/samples.js';

const USE_SERVER = true; // api/letters.js 완성 후 true 로 변경됨

export async function fetchLetters(query = '') {
  if (!USE_SERVER) {
    const q = query.trim();
    return ARCHIVE_SEED.filter(
      (a) => !q || a.company.includes(q) || a.role.includes(q)
        || (a.question || '').includes(q) || (a.content || '').includes(q),
    );
  }
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  const qs = params.toString();
  return get(`/api/letters${qs ? `?${qs}` : ''}`);
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
    const i = ARCHIVE_SEED.findIndex((a) => a.id === id);
    if (i > -1) ARCHIVE_SEED.splice(i, 1);
    return null;
  }
  return del(`/api/letters/${id}`);
}
