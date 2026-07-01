// server/write/transfer.route.js  →  POST /api/transfer
// 담당: 팀원 A
// screens/write 의 "환승 준비하기" 버튼이 부르는 엔드포인트.
// 실제 분석(AI 호출 또는 로컬 폴백)은 팀원 B 가 소유한 result/claude.service.js 에 위임한다.

import { Router } from 'express';
import { runTransferAnalysis } from '../result/claude.service.js';

export const transferRouter = Router();

transferRouter.post('/', async (req, res) => {
  const { text, target, role, question } = req.body || {};

  if (!text || !target || !role) {
    return res.status(400).json({ error: '필수 값이 누락되었습니다 (text, target, role)' });
  }

  try {
    const result = await runTransferAnalysis({ text, target, role, question });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
