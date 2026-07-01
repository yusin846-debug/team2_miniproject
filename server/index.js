// server/index.js
// Express 앱 부팅. 화면별 라우터를 한 줄씩 붙여 나간다 — 새 라우터 추가 시 이 파일은
// import + app.use 두 줄만 늘어나야 한다 (라우트 로직은 각 폴더가 소유).

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { transferRouter } from './write/transfer.route.js';
import { lettersRouter } from './archive/letters.route.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const app = express();
app.use(express.json());

app.use('/api/transfer', transferRouter);
app.use('/api/letters', lettersRouter);

// 정적 프론트엔드 (index.html, shared/, screens/, assets/) 서빙 + SPA 폴백
app.use(express.static(ROOT));
app.get(/^(?!\/api\/).*/, (req, res) => {
  res.sendFile(path.join(ROOT, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`jobdori server ready → http://localhost:${PORT}`);
});
