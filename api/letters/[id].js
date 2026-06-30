// api/letters/[id].js  →  GET /api/letters/:id  |  DELETE /api/letters/:id
// 보관함 단건 조회 및 삭제 서버리스 함수.
// 담당: 팀원 D

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    // TODO: DB 에서 letter 단건 조회
    // const letter = await db.from('letters').select('*').eq('id', id).single();
    // res.status(200).json(letter);
    return res.status(501).json({ error: '미구현 — api/letters/[id].js 를 완성해주세요' });
  }

  if (req.method === 'DELETE') {
    // TODO: DB 에서 letter 삭제
    // await db.from('letters').delete().eq('id', id);
    // res.status(204).end();
    return res.status(501).json({ error: '미구현 — api/letters/[id].js 를 완성해주세요' });
  }

  res.status(405).json({ error: 'Method Not Allowed' });
}
