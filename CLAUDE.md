# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 프로젝트 개요

**자소서 환승 (잡도리)** — 기존에 작성한 자소서를 새 회사·직군에 맞게 AI가 자동으로 첨삭해주는 서비스.
**바닐라 HTML/CSS/ES Modules** 프론트엔드 + **Vercel 서버리스 함수** 백엔드 구조. 빌드 도구 없음.

---

## 실행 방법

### 프론트만 개발할 때
```bash
npm run dev
# → http://localhost:5173
# js/services/analyze.js · js/services/letters.js 의 USE_SERVER=false 로 바꾸면
# 서버 없이도 로컬 시드 데이터(js/lib/matcher.js, js/data/samples.js)로 모든 화면 동작
```

### API까지 함께 테스트할 때 (AI 분석 · 보관함 저장 실제 동작 확인)
```bash
# 최초 1회: Vercel CLI 설치 및 로그인
npm install -g vercel
vercel login

cp .env.local.example .env.local   # OPENAI_API_KEY 채워 넣기

npm run dev:api
# → http://localhost:3000  (프론트 + api/ 함수 동시 실행, 배포 환경과 동일)
```

`npm run dev:api` 사용 시 `.env.local` 의 환경변수가 자동으로 로드됩니다.

---

## 폴더 구조

```
jasoseo-transfer/
│
├── api/                          ← 백엔드: Vercel 서버리스 함수 (Node.js)
│   ├── _lib/
│   │   └── ai.js                 ← OpenAI 클라이언트 공통 설정 (팀원 C)
│   ├── analyze.js                ← POST /api/analyze   — AI 자소서 분석 (gpt-4o-mini, 실동작)
│   ├── auth.js                   ← POST /api/auth/login — 로그인 (미구현 스텁, 501)
│   ├── letters.js                ← GET·POST /api/letters — 보관함 목록 조회·저장 (db.json, 실동작)
│   └── letters/[id].js           ← GET·DELETE /api/letters/:id — 단건 조회·삭제 (db.json, 실동작)
│
├── js/
│   ├── main.js                   ← 앱 진입점: 렌더 루프 + 액션 핸들러 조립 + 이벤트 위임 (팀원 E)
│   ├── state.js                  ← 중앙 상태 저장소
│   │
│   ├── services/                 ← 브라우저 → 서버 요청 전송
│   │   ├── http.js               ← 공통 fetch 래퍼 (get/post/del)
│   │   ├── analyze.js            ← analyze() — USE_SERVER=true, api/analyze.js 호출
│   │   ├── letters.js            ← fetchLetters/fetchLetter/saveLetter/deleteLetter — USE_SERVER=true
│   │   └── auth.js               ← login/logout/getStoredUser/saveUser (auth.js 완성 전까지 미사용)
│   │
│   ├── features/                 ← 화면 렌더링 + 상태·액션 (한 화면 = 한 파일)
│   │   ├── onboarding.js         ← 로그인 화면(유리 블러 + bounce 진입) + 3단계 일러스트 투어
│   │   ├── write.js              ← 자소서 입력 화면 (문항 입력란 + 본문 + 회사/직군 선택)
│   │   ├── result.js             ← AI 첨삭 결과 — 카테고리별 하이라이트 미리보기 + 제안 카드 + 저장완료 모달
│   │   ├── archive.js            ← 보관함 — 검색/태그, 호버 카드, 상세 바텀시트, 등록(txt 업로드), 정리(삭제) 모드
│   │   ├── header.js             ← 상단 네비게이션
│   │   └── toast.js              ← 알림 배너
│   │
│   ├── lib/
│   │   ├── dom.js                ← DOM 유틸·이벤트 위임·XSS 이스케이프(escapeHtml())
│   │   └── matcher.js            ← 규칙 기반 분석 엔진 — AI 서버 미연동/실패 시 폴백으로만 사용
│   │
│   └── data/                     ← 로컬 시드 데이터 (서버 없을 때 폴백)
│       ├── companies.js
│       ├── roles.js
│       ├── categories.js
│       └── samples.js
│
├── css/
│   ├── tokens.css                ← 브랜드 디자인 토큰 (색상·타이포·반경·그림자)
│   ├── base.css                  ← 리셋 + 공통 버튼/카드/배지
│   ├── layout.css                ← 앱 셸·컨테이너·토스트·공용 모달/시트 애니메이션
│   └── components/                ← 화면별 스타일 (header/write/result/archive/onboarding)
│
├── assets/                       로고 · 온보딩 일러스트
├── index.html
├── vercel.json
├── db.json                       ← api/letters.js·[id].js 가 사용하는 간이 저장소
├── .env.local.example
├── .gitignore
└── package.json
```

---

## 각 레이어의 역할

| 레이어 | 폴더 | 한 줄 역할 | 로직 있음? |
|--------|------|-----------|-----------|
| 백엔드 | `api/` | DB(db.json) 조회, AI 호출, 비즈니스 로직 | ✅ 핵심 로직 |
| 서비스 | `js/services/` | `/api/*` 에 fetch 요청만 전달 (실패 시 로컬 폴백) | 폴백만 |
| 핸들러 | `js/main.js` | 버튼 클릭 감지 → 각 feature 의 액션 호출 | ✅ 흐름 연결 |
| 뷰+상태 | `js/features/` | state 를 HTML 문자열로 렌더 + 화면별 액션/상태 슬라이스 | ✅ 화면 로직 |
| 상태 | `js/state.js` | 단일 상태 객체 관리 (features/* 를 모른다) | ❌ 저장만 |

---

## 기능별 구현 흐름

### AI 자소서 분석 (핵심 기능 — 실제 OpenAI 연동됨)

```
[환승 준비하기 버튼 클릭]
        ↓
js/features/write.js     write:start 액션 → runTransfer() 실행
        ↓
js/services/analyze.js   analyze({ text, target, role }) 호출 (USE_SERVER=true)
        ↓
api/analyze.js           프롬프트 조립(buildPrompt) → api/_lib/ai.js 의 callAI() 로
                          OpenAI(gpt-4o-mini) 호출 → 응답 파싱(parseAIResponse)
                          → 회사명 치환은 코드가 문장 단위로 결정적으로 처리(buildCompanySuggestions)
                          → { origin, suggestions } 반환
        ↓
js/features/write.js     setState({ origin, suggestions, appliedIds: [], stage: 'result' })
                          — 제안은 최초엔 전부 미적용 상태로 시작, 사용자가 하나씩 적용
        ↓
js/features/result.js    suggestions 를 카드로, 본문은 카테고리별 색상 하이라이트로 렌더링
```

**로컬 폴백:** `OPENAI_API_KEY` 없이 테스트하려면 `js/services/analyze.js` 의 `USE_SERVER`를
`false`로 바꾸세요 — `js/lib/matcher.js` 의 규칙 기반 매칭으로 동작합니다.

---

### 보관함 등록·검색·삭제·상세보기

```
[＋ 자소서 등록] → archive:add-submit → js/services/letters.js saveLetter()
                  → POST /api/letters → db.json 저장
[카드 클릭]       → archive:open → 상세보기 바텀시트(질문 전문 + 본문 + 복사/환승 준비 버튼)
[정리하기]        → archive:manage-toggle → 카드에 × 버튼 노출 → archive:delete → DELETE /api/letters/:id
[검색/태그]       → archive:search, archive:tag → GET /api/letters?q=...
```

---

### 로그인 (현재 placeholder)

로그인 버튼(`auth:login`, `js/main.js`)은 아직 실제 인증 없이 바로 온보딩 투어로 진입합니다.
실제 로그인을 붙이려면 팀원 A 가 `api/auth.js` 를 완성하고 `js/services/auth.js` 를 연결한 뒤
`js/main.js` 의 `auth:login` 액션을 교체하세요.

---

## 팀원 분업표

| 팀원 | 담당 화면 | 담당 파일 |
|------|----------|---------|
| A | 로그인·온보딩 | `js/features/onboarding.js` · `js/services/auth.js` · `api/auth.js` |
| B | 자소서 입력 | `js/features/write.js` |
| C | 첨삭 결과 · AI 핵심 | `js/features/result.js` · `js/services/analyze.js` · `api/analyze.js` · `api/_lib/ai.js` · `js/lib/matcher.js` |
| D | 보관함 | `js/features/archive.js` · `js/services/letters.js` · `api/letters.js` · `api/letters/[id].js` |
| E | 공통·인프라 | `js/main.js` · `js/state.js` · `js/features/header.js` |

> **충돌 방지:** `js/main.js` 는 팀원 E 가 관리합니다. 다른 팀원이 액션 핸들러를 추가해야 할 때는
> 본인 화면의 `js/features/*.js` 에서 `xxxActions`/`handleXxxInput` 을 export 하고,
> `js/main.js` 는 그것들을 import 해서 합치기만 합니다 — `main.js` 자체를 거의 건드리지 않아도 됩니다.

---

## 커밋 메시지 규칙

### 형식

```
type(scope): 한글 설명
```

### type — 변경 성격

| type | 언제 쓰나 |
|------|----------|
| `feat` | 새 기능 추가 |
| `fix` | 버그 수정 |
| `style` | CSS·UI 변경 (기능 변화 없음) |
| `refactor` | 동작은 그대로, 코드 구조 개선 |
| `chore` | 설정 파일·환경변수·패키지 등 |

### scope — 담당 화면·영역

| scope | 해당 팀원 |
|-------|----------|
| `onboarding` | 팀원 A |
| `write` | 팀원 B |
| `result` | 팀원 C |
| `archive` | 팀원 D |
| `header` | 팀원 E |
| `api` | 서버리스 함수 (api/ 폴더) |
| `state` | state.js |
| `common` | 여러 화면에 걸친 변경 |

### 예시

```bash
feat(result): AI 첨삭 결과 5개 카테고리 카드 렌더링
feat(onboarding): 로그인 화면 유리 블러 처리 + 진입 모션 추가
fix(archive): 검색어 초기화 시 목록 안 뜨는 버그 수정
style(write): 회사 선택 버튼 모바일 레이아웃 수정
feat(api): POST /api/analyze OpenAI 연동
chore: .env.local.example 환경변수 템플릿 추가
```

---

## 협업 규칙

### 1. 브랜치 규칙

```
main                        ← 배포 브랜치 (직접 push 절대 금지)
├── feat/onboarding-login   ← 팀원 A
├── feat/write-form         ← 팀원 B
├── feat/result-ai          ← 팀원 C
├── feat/archive-crud       ← 팀원 D
└── feat/header-nav         ← 팀원 E
```

- 브랜치 이름 형식: `feat/담당화면-기능명`
- **`main` 직접 push 금지** — GitHub에서 Branch Protection Rule 설정 필요
  - Settings → Branches → Add rule → `main` → Require pull request before merging ✅

---

### 2. 작업 순서 규칙

매일 작업 시작 전 반드시 아래 순서를 따릅니다.

```bash
# 1. 최신 main 가져오기
git checkout main
git pull origin main

# 2. 내 브랜치로 이동 (없으면 생성)
git checkout feat/내브랜치이름
# 처음이라면: git checkout -b feat/내브랜치이름

# 3. main 변경사항을 내 브랜치에 반영
git merge main

# 4. 작업 후 push
git add 내가_수정한_파일만
git commit -m "feat(scope): 설명"
git push origin feat/내브랜치이름
```

> `git add .` 대신 **수정한 파일만 add** — 실수로 다른 팀원 파일을 덮어쓰는 상황을 방지합니다.

---

### 3. PR 규칙

- **PR 생성 시점**: 기능 완성 후 (미완성 상태로 PR 금지)
- **PR 제목**: 커밋 메시지 규칙과 동일 형식 사용
- **Merge 조건**:
  - 팀장 Approve 1명 이상
  - 로컬에서 `npm run dev` (필요 시 `npm run dev:api`) 실행 후 담당 화면 정상 동작 확인
- **Merge 방식**: Squash and Merge (커밋 히스토리 깔끔하게 유지)

---

### 4. 충돌 처리 규칙

충돌이 났을 때 **절대 상대방 코드를 마음대로 지우지 않습니다.**

각 화면이 `js/features/<이름>.js` 한 파일로 분리되어 있어 대부분의 충돌은 `js/main.js`
또는 여러 화면이 함께 쓰는 `js/data/*` 에서만 발생합니다. 충돌 파일 확인 후 해당 팀원에게
먼저 연락 → 함께 보면서 어떤 코드를 살릴지 결정 → 충돌 마커(`<<<<`, `====`, `>>>>`) 제거 후 커밋.

**폴더 구조를 바꾸는 리팩터링(파일 이동/분할/병합)은 팀 전원과 먼저 상의하세요.**
과거에 한 명이 구조를 임의로 바꿔 병합했다가, 다른 팀원이 진행 중이던 `api/analyze.js`
작업(OpenAI 연동)과 `api/letters.js` 작업이 충돌 상태로 며칠간 묶여 있던 적이 있습니다.

---

## 핵심 규칙

- **`api/` 파일**: 브라우저에서 실행되지 않음. API 키는 반드시 여기에만 사용 (`process.env.*`)
- **`js/features/*.js` 파일**: fetch 직접 호출 금지. `js/services/*` 함수만 호출
- **XSS**: 사용자 입력을 HTML에 삽입할 때 반드시 `js/lib/dom.js`의 `escapeHtml()` 사용
- **환경변수**: `.env.local.example` 복사 후 `.env.local` 로 이름 변경해서 사용. 절대 커밋 금지
