// api/auth/login.js  →  POST /api/auth/login
// 로그인 서버리스 함수. db.json 의 users 테이블을 간이 저장소로 사용한다.
// 담당: 팀원 A

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../db.json');

async function readDb() {
  const raw = await fs.readFile(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ message: '아이디와 비밀번호를 입력해주세요' });
  }

  const db = await readDb();
  const user = db.users.find((u) => u.username === username);

  if (!user || user.password !== password) {
    return res.status(401).json({ message: '아이디 또는 비밀번호가 틀렸어요' });
  }

  return res.status(200).json({ id: user.id, name: user.name });
}
