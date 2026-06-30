// api/letters.js  →  GET /api/letters  |  POST /api/letters
// 보관함 목록 조회 및 저장 서버리스 함수.
// 담당: 팀원 D
//
// 완성 후 js/services/letters.js 의 USE_SERVER 를 true 로 변경하세요.

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // TODO: DB 에서 letters 목록 조회
    // const { q } = req.query;
    // const letters = await db.from('letters').select('*').ilike('company', `%${q}%`);
    // res.status(200).json(letters);
    return res.status(501).json({ error: '미구현 — api/letters.js 를 완성해주세요' });
  }

  if (req.method === 'POST') {
    // TODO: DB 에 letter 저장
    // const payload = req.body;
    // const saved = await db.from('letters').insert(payload).select().single();
    // res.status(201).json(saved);
    return res.status(501).json({ error: '미구현 — api/letters.js 를 완성해주세요' });
  }

  res.status(405).json({ error: 'Method Not Allowed' });
}
