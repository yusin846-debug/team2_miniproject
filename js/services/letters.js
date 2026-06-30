// js/services/letters.js
// 보관함 CRUD 서비스.
// 담당: 팀원 D
//
// [현재] /api/letters 가 없으면 로컬 시드 데이터로 폴백
// [추후] api/letters.js 서버리스 함수 완성 후 폴백 코드 제거

import { get, post, del } from './http.js';
import { ARCHIVE_SEED } from '../data/samples.js';

const USE_SERVER = false; // api/letters.js 완성 후 true 로 변경

export async function fetchLetters(query = '') {
  if (!USE_SERVER) {
    const q = query.trim();
    return ARCHIVE_SEED.filter(
      (a) => !q || a.company.includes(q) || a.snippet.includes(q) || a.role.includes(q),
    );
  }
  const params = new URLSearchParams({ _sort: 'date', _order: 'desc' });
  if (query) params.set('q', query);
  return get(`/api/letters?${params}`);
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
      snippet: (payload.content || '').slice(0, 60) + '…',
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
