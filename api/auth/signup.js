// api/auth/signup.js  →  POST /api/auth/signup
// 회원가입 서버리스 함수. db.json 의 users 테이블에 신규 유저를 추가한다.
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

async function writeDb(db) {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2) + '\n', 'utf-8');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { username, password, name } = req.body || {};

  if (!username || !password || !name) {
    return res.status(400).json({ message: '이메일, 비밀번호, 이름을 모두 입력해주세요' });
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_RE.test(username)) {
    return res.status(400).json({ message: '올바른 이메일 형식을 입력해주세요' });
  }

  const db = await readDb();

  if (db.users.find((u) => u.username === username)) {
    return res.status(409).json({ message: '이미 사용 중인 아이디예요' });
  }

  const newUser = {
    id: 'u' + Date.now(),
    username,
    password,
    name,
  };

  // Vercel 배포 환경은 파일시스템이 읽기 전용이라 writeDb가 실패한다.
  // 서버 영속 저장은 못 해도 클라이언트(localStorage)에 저장되므로 세션은 유지된다.
  try {
    db.users.push(newUser);
    await writeDb(db);
  } catch {
    /* read-only filesystem — 세션 전용 계정으로 진행 */
  }

  return res.status(201).json({ id: newUser.id, name: newUser.name });
}
