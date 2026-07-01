// api/letters/[id].js  →  GET /api/letters/:id  |  DELETE /api/letters/:id
// 보관함 단건 조회 및 삭제 서버리스 함수. db.json 을 간이 저장소로 사용한다.
// 담당: 팀원 D

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

function snippetOf(content = '') {
  const raw = content.replace(/\n+/g, ' ').trim();
  return raw.length > 80 ? raw.slice(0, 80) + '…' : raw;
}

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const db = await readDb();
    const item = db.letters.find((a) => a.id === id);
    if (!item) return res.status(404).json({ error: '찾을 수 없어요' });
    return res.status(200).json({ ...item, snippet: snippetOf(item.content) });
  }

  if (req.method === 'PATCH') {
    // 지금은 "복원"만 지원 (?action=restore) — deletedAt 기록을 지워서 휴지통에서 되돌린다.
    const db = await readDb();
    const item = db.letters.find((a) => a.id === id);
    if (!item) return res.status(404).json({ error: '찾을 수 없어요' });
    delete item.deletedAt;
    await writeDb(db);
    return res.status(200).json({ ...item, snippet: snippetOf(item.content) });
  }

  if (req.method === 'DELETE') {
    const db = await readDb();
    const item = db.letters.find((a) => a.id === id);
    if (!item) return res.status(404).json({ error: '찾을 수 없어요' });

    const permanent = req.query.permanent === 'true';
    if (permanent) {
      db.letters = db.letters.filter((a) => a.id !== id);
    } else {
      item.deletedAt = new Date().toISOString(); // 진짜로 지우지 않고 휴지통으로 이동
    }
    await writeDb(db);
    return res.status(204).end();
  }

  res.status(405).json({ error: 'Method Not Allowed' });
}
