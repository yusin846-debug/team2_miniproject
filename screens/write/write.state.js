// screens/write/write.state.js
// 담당: 팀원 A
// STEP 1(자소서 붙여넣기) 화면의 상태 슬라이스 + 액션.

import { getState, setState } from '../../shared/js/state.js';
import { startTransfer } from './write.api.js';

export const SAMPLE_LETTER =
`저는 카카오에 지원하게 된 동기를 말씀드리겠습니다. 평소 카카오가 추구하는 '사람과 사람을 잇는다'는 가치에 깊이 공감했기 때문입니다.

대학 시절 UX 동아리에서 모바일 서비스 개선 프로젝트를 진행하며, 사용자의 불편을 데이터로 증명하고 빠르게 개선하는 경험을 쌓았습니다. 저는 이런 과정을 통해서 좋은 디자이너가 되기 위해 노력을 많이 하였습니다.

입사 후 카카오의 UX 디자이너로서 일상에 즐거움을 주는 서비스를 만들고 싶습니다.`;

export const SAMPLE_QUESTION = '지원 동기와 입사 후 포부를 서술해 주세요.';

export const writeInitialState = {
  text: SAMPLE_LETTER,
  question: SAMPLE_QUESTION,
  target: '토스',
  role: '프로덕트 디자이너',
  customCompany: '',
};

async function runTransfer() {
  const s = getState();
  if (!(s.text || '').trim() || !s.target) return; // canRun 아닐 때는 무시
  const target = s.customCompany || s.target;
  const { origin, suggestions } = await startTransfer({ text: s.text, target, role: s.role, question: s.question });
  setState({
    origin,
    suggestions,
    appliedIds: [],
    activeId: null,
    stage: 'result',
  });
}

export const writeActions = {
  'write:company': (_e, el) => setState({ target: el.dataset.company, customCompany: '' }),
  'write:role':    (_e, el) => setState({ role: el.dataset.role }),
  'write:start':   () => runTransfer(),
};

// input 이벤트(타이핑 중 실시간 반영)는 click 위임과 별도로 처리
export function handleWriteInput(action, el) {
  if (action === 'write:text')     setState({ text: el.value });
  if (action === 'write:question') setState({ question: el.value });
  if (action === 'write:custom')   setState({ customCompany: el.value, target: el.value || getState().target });
}
