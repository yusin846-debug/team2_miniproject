// server/archive/letters.route.js  →  GET/POST /api/letters, GET/DELETE /api/letters/:id
// 담당: 팀원 C
// db.json 을 간이 저장소로 사용하는 보관함 CRUD.

import { Router } from 'express';
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

function todayLabel() {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export const lettersRouter = Router();

lettersRouter.get('/', async (req, res) => {
  const db = await readDb();
  const q = (req.query.q || '').toString().trim().toLowerCase();
  const letters = db.letters
    .filter((a) => !q || `${a.company}${a.role}${a.question || ''}${a.content || ''}`.toLowerCase().includes(q))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((a) => ({ ...a, snippet: snippetOf(a.content) }));
  res.status(200).json(letters);
});

lettersRouter.post('/', async (req, res) => {
  const { company, role, question, content, count } = req.body || {};
  if (!company || !role || !content) {
    return res.status(400).json({ error: '필수 값이 누락되었습니다 (company, role, content)' });
  }
  const db = await readDb();
  const item = {
    id: 'a' + Date.now(),
    company, role,
    question: question || '',
    content,
    count: count || 0,
    date: todayLabel(),
  };
  db.letters.unshift(item);
  await writeDb(db);
  res.status(201).json({ ...item, snippet: snippetOf(content) });
});

lettersRouter.get('/:id', async (req, res) => {
  const db = await readDb();
  const item = db.letters.find((a) => a.id === req.params.id);
  if (!item) return res.status(404).json({ error: '찾을 수 없어요' });
  res.status(200).json({ ...item, snippet: snippetOf(item.content) });
});

lettersRouter.delete('/:id', async (req, res) => {
  const db = await readDb();
  const before = db.letters.length;
  db.letters = db.letters.filter((a) => a.id !== req.params.id);
  if (db.letters.length === before) return res.status(404).json({ error: '찾을 수 없어요' });
  await writeDb(db);
  res.status(204).end();
});
