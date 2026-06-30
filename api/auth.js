// api/auth.js  →  POST /api/auth/login
// 로그인 서버리스 함수.
// 담당: 팀원 A

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요' });
  }

  // TODO: DB 에서 유저 조회 후 비밀번호 확인
  // const user = await db.from('users').select('*').eq('username', username).single();
  // if (!user || user.password !== password) {
  //   return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 틀렸어요' });
  // }
  // res.status(200).json({ success: true, user: { id: user.id, name: user.name } });

  res.status(501).json({ error: '미구현 — api/auth.js 를 완성해주세요' });
}
