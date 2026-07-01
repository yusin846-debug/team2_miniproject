// js/services/auth.js
// 로그인·인증 서비스.
// 담당: 팀원 A
//
// [추후] api/auth.js 서버리스 함수 완성 후 실제 로그인 로직 연결

import { post } from './http.js';

export async function login({ username, password }) {
  return post('/api/auth/login', { username, password });
}

export async function signup({ username, password, name }) {
  return post('/api/auth/signup', { username, password, name });
}

const LOCAL_USERS_KEY = 'hs_local_users';

export function saveLocalUser({ id, name, username, password }) {
  try {
    const users = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY)) || [];
    if (!users.find((u) => u.username === username)) {
      users.push({ id, name, username, password });
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
    }
  } catch {}
}

export function findLocalUser({ username, password }) {
  try {
    const users = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY)) || [];
    return users.find((u) => u.username === username && u.password === password) || null;
  } catch { return null; }
}

export function logout() {
  localStorage.removeItem('user');
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
}

export function saveUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}
