// js/services/http.js
// 공통 fetch 래퍼. 모든 서비스 파일은 이 함수를 통해 /api/* 에 요청한다.

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${res.status} ${url}`);
  return res.status === 204 ? null : res.json();
}

export const get  = (url)          => request(url);
export const post = (url, body)    => request(url, { method: 'POST',   body: JSON.stringify(body) });
export const del  = (url)          => request(url, { method: 'DELETE' });
