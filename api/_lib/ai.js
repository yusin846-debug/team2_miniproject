// api/_lib/ai.js
// AI API 클라이언트 공통 설정. (OpenAI)
// 담당: 팀원 C

import OpenAI from 'openai';
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// vercel dev 의 .env.local 자동 로딩이 환경에 따라 되지 않는 경우를 대비해 직접 로드한다.
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
config({ path: path.join(projectRoot, '.env.local') });

const REQUEST_TIMEOUT_MS = 30000;

let client;
function getClient() {
  console.log('[ai.js] OPENAI_API_KEY present:', Boolean(process.env.OPENAI_API_KEY));
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

export async function callAI(prompt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const completion = await getClient().chat.completions.create(
      {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      },
      { signal: controller.signal },
    );

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error('AI 응답에 내용이 없습니다');
    return content;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('AI 응답 시간이 초과되었습니다');
    throw new Error(`AI 호출 실패: ${err.message}`);
  } finally {
    clearTimeout(timeout);
  }
}
