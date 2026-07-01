// api/letters/trash.js  →  GET /api/letters/trash
// 휴지통(소프트 삭제된 자소서) 목록 조회. db.json 을 간이 저장소로 사용한다.
// 담당: 팀원 D

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../../db.json');

const TRASH_RETENTION_DAYS = 30; // 휴지통 보관 기간 — 지나면 자동으로 완전히 삭제

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

// 목록을 조회할 때마다 보관 기간이 지난 휴지통 항목을 완전히 지운다 (서버가 따로 배치 작업을 못 돌리므로).
function purgeExpiredTrash(db) {
  const cutoff = Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const before = db.letters.length;
  db.letters = db.letters.filter((a) => !(a.deletedAt && new Date(a.deletedAt).getTime() < cutoff));
  return db.letters.length !== before;
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const db = await readDb();
    if (purgeExpiredTrash(db)) await writeDb(db);
    const trashed = db.letters
      .filter((a) => a.deletedAt)
      .map((a) => ({ ...a, snippet: snippetOf(a.content) }));
    return res.status(200).json(trashed);
  }

  res.status(405).json({ error: 'Method Not Allowed' });
}
