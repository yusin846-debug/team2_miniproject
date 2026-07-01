// api/letters.js  →  GET /api/letters  |  POST /api/letters
// 보관함 목록 조회 및 저장 서버리스 함수. db.json 을 간이 저장소로 사용한다.
// 담당: 팀원 D

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../db.json');

async function readDb() {
  const raw = await fs.readFile(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

async function writeDb(db) {
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2) + '\n', 'utf-8');
}

function snippetOf(content = '') {
  const raw = content.replace(/\n+/g, ' ').trim();
  return raw.length > 80 ? raw.slice(0, 80) + '…' : raw;
}

function todayLabel() {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

const TRASH_RETENTION_DAYS = 30; // 휴지통 보관 기간 — 지나면 자동으로 완전히 삭제
const ADMIN_ID = 'u1';

// 목록을 조회할 때마다 보관 기간이 지난 휴지통 항목을 완전히 지운다 (서버가 따로 배치 작업을 못 돌리므로).
function purgeExpiredTrash(db) {
  const cutoff = Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const before = db.letters.length;
  db.letters = db.letters.filter((a) => !(a.deletedAt && new Date(a.deletedAt).getTime() < cutoff));
  return db.letters.length !== before;
}

export default async function handler(req, res) {
  const userId = (req.query.userId || '').toString().trim();

  if (req.method === 'GET') {
    const db = await readDb();
    if (purgeExpiredTrash(db)) await writeDb(db);
    const q = (req.query.q || '').toString().trim().toLowerCase();
    const isAdmin = userId === ADMIN_ID;
    const letters = db.letters
      .filter((a) => !a.deletedAt)
      .filter((a) => isAdmin || a.userId === userId)
      .filter((a) => !q || `${a.company}${a.role}${a.question || ''}${a.content || ''}`.toLowerCase().includes(q))
      // 날짜가 같으면 0을 반환해야 하는데(정렬 규칙), 예전 코드는 무조건 -1을 반환해서
      // 같은 날짜에 여러 건 저장했을 때 순서가 뒤죽박죽되는 버그가 있었다. 같으면 0을
      // 반환해 원래 순서(저장 시 배열 맨 앞에 추가된 순서 = 최신순)를 그대로 유지하게 고쳤다.
      .sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1))
      .map((a) => ({ ...a, snippet: snippetOf(a.content) }));
    return res.status(200).json(letters);
  }

  if (req.method === 'POST') {
    const { company, role, question, content, count } = req.body || {};
    if (!company || !role || !content) {
      return res.status(400).json({ error: '필수 값이 누락되었습니다 (company, role, content)' });
    }
    if (!userId) {
      return res.status(401).json({ error: '로그인이 필요합니다' });
    }
    const db = await readDb();
    const item = {
      id: 'a' + Date.now(),
      userId,
      company, role,
      question: question || '',
      content,
      count: count || 0,
      date: todayLabel(),
    };
    db.letters.unshift(item);
    await writeDb(db);
    return res.status(201).json({ ...item, snippet: snippetOf(content) });
  }

  res.status(405).json({ error: 'Method Not Allowed' });
}
