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
    return res.status(400).json({ message: '아이디, 비밀번호, 이름을 모두 입력해주세요' });
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

  db.users.push(newUser);
  await writeDb(db);

  return res.status(201).json({ id: newUser.id, name: newUser.name });
}
