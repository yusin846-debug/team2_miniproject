# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 프로젝트 개요

**잡도리 · 자소서 환승** — 기존에 작성한 자소서를 새 회사·직군에 맞게 AI가 자동으로 첨삭해주는 서비스.
**바닐라 HTML/CSS/ES Modules** 프론트엔드 + **Node/Express** 백엔드 구조. 빌드 도구 없음.

> `screens/write` · `screens/result` · `screens/archive` 는 각 화면을 독립 소유하는 팀원 단위 폴더입니다.
> 화면마다 view / state / api(fetch 클라이언트) / css 를 한 폴더에 모아, 다른 팀원 파일과의 충돌을 최소화합니다.

---

## 실행 방법

### 프론트만 개발할 때
```bash
npm run dev
# → http://localhost:5173
# api 서버 없이도 각 화면의 *.api.js 상단 USE_SERVER=false 폴백으로 모든 화면 동작
```

### API까지 함께 테스트할 때
```bash
npm install
cp .env.example .env.local   # ANTHROPIC_API_KEY 는 비워둬도 됨 (로컬 규칙 기반 매칭으로 폴백)

npm run dev:api
# → http://localhost:3000  (정적 파일 + /api/* 를 한 서버에서 함께 서빙)
```

---

## 폴더 구조

```
jobdori/
│
├── index.html / package.json / db.json / .env.example / .gitignore
│
├── shared/                       ← 초기 셋업 후 동결 (공통)
│   ├── css/                      tokens · base · layout · header · onboarding
│   └── js/
│       ├── core.js               앱 진입점: 상태 슬라이스 조립 + 이벤트 위임 + 공통(온보딩/내비게이션) 액션
│       ├── state.js              스토어 엔진 (getState/setState/subscribe) — screens/* 를 모른다
│       ├── router.js             state.screen/tab/stage → 어떤 화면 view 를 그릴지 결정
│       ├── header.js / onboarding.js / toast.js   화면 소유가 아닌 공통 셸
│       └── lib/                  dom.js(유틸·이스케이프·이벤트위임) · http.js(fetch 래퍼)
│                                  companies.js(회사 마스터+배지) · roles.js(직군 마스터)
│
├── screens/
│   ├── write/                    ← 팀원 A 전용
│   │   ├── write.view.js         STEP 1 입력 화면 렌더
│   │   ├── write.state.js        상태 슬라이스 + 액션 (회사/직군 선택, "환승 준비하기")
│   │   ├── write.api.js          POST /api/transfer 호출 (또는 result 엔진 로컬 폴백)
│   │   └── write.css
│   │
│   ├── result/                   ← 팀원 B 전용 (AI 첨삭 핵심)
│   │   ├── result.view.js        하이라이트 미리보기 + 제안 카드 렌더
│   │   ├── result.state.js       매칭 엔진(buildSuggestions/applySuggestions) + 결과 화면 상태·액션
│   │   ├── result.api.js         "보관함에 저장" → archive.api.js 위임
│   │   └── result.css
│   │
│   └── archive/                  ← 팀원 C 전용
│       ├── archive.view.js       검색/필터, 카드 그리드, 등록·상세보기 모달
│       ├── archive.state.js      상태 슬라이스 + 액션 (검색, 등록, 삭제, 상세보기)
│       ├── archive.api.js        GET/POST/DELETE /api/letters 호출
│       └── archive.css
│
├── assets/                       로고 · 온보딩 일러스트
│
└── server/
    ├── index.js                  Express 부팅 — 새 라우터 추가 시 import + app.use 두 줄만
    ├── write/transfer.route.js         POST /api/transfer            (팀원 A)
    ├── result/claude.service.js        Claude API 호출 + 로컬 폴백    (팀원 B, AI 핵심)
    ├── result/prompts.js               첨삭 프롬프트 설계             (팀원 B)
    └── archive/letters.route.js        /api/letters CRUD              (팀원 C)
```

---

## 각 레이어의 역할

| 레이어 | 폴더 | 한 줄 역할 | 로직 있음? |
|--------|------|-----------|-----------|
| 백엔드 | `server/` | DB(db.json) 조회, AI 호출, 비즈니스 로직 | ✅ 핵심 로직 |
| 서비스 | `screens/*/*.api.js` | `/api/*` 에 fetch 요청 (안 되면 로컬 폴백) | 폴백만 |
| 상태 | `screens/*/*.state.js` | 화면별 상태 슬라이스 + 액션 (data-action 핸들러) | ✅ 흐름 연결 |
| 뷰 | `screens/*/*.view.js` | state 받아서 HTML 문자열 반환 | ❌ 렌더만 |
| 스토어 | `shared/js/state.js` | 단일 상태 객체 관리 (screens/* 모름) | ❌ 저장만 |
| 라우터 | `shared/js/router.js` | 상태 → 화면 조합 | ❌ 조합만 |

---

## 기능별 구현 흐름

### AI 자소서 분석 (핵심 기능)

```
[환승 준비하기 버튼 클릭]
        ↓
screens/write/write.state.js     write:start 액션 → startTransfer() 호출
        ↓
screens/write/write.api.js       USE_SERVER=false → result.state.js 의 buildSuggestions() 로컬 실행 (현재)
        ↓                        USE_SERVER=true  → POST /api/transfer
server/write/transfer.route.js   요청 검증 → claude.service.js 위임
server/result/claude.service.js  ANTHROPIC_API_KEY 있으면 Claude 호출, 없으면 buildSuggestions() 로 폴백
        ↓
screens/write/write.state.js     setState({ origin, suggestions, appliedIds, stage:'result' })
        ↓
screens/result/result.view.js    suggestions 를 카드로, 본문은 카테고리별 색상 하이라이트로 렌더링
```

**AI 연동 전환 방법:**
1. `.env.local` 에 `ANTHROPIC_API_KEY` 채우기 (server/result/claude.service.js 가 자동으로 사용)
2. `screens/write/write.api.js` — `USE_SERVER = true` 로 변경 (서버를 거치도록)

---

### 보관함 등록·검색·삭제·상세보기

```
[＋ 자소서 등록] → archive:add-submit → archive.api.js saveLetter() → POST /api/letters → server/archive/letters.route.js → db.json 저장
[카드 클릭]       → archive:open → 상세보기 바텀시트(질문 전문 + 본문 + 복사/환승 준비 버튼)
[정리하기]        → archive:manage-toggle → 카드에 × 버튼 노출 → archive:delete → DELETE /api/letters/:id
[검색/태그]       → archive:search, archive:tag → GET /api/letters?q=...
```

---

### 로그인 (현재 placeholder)

로그인 버튼(`auth:login`, `shared/js/core.js`)은 아직 실제 인증 없이 바로 온보딩 투어로 진입합니다.
실제 로그인을 붙이려면 `screens/write` 담당(팀원 A)이 `server/` 에 `auth` 라우터를 추가하고
`shared/js/core.js` 의 `auth:login` 액션을 교체하세요.

---

## 팀원 분업표

| 팀원 | 담당 화면 | 담당 파일 |
|------|----------|---------|
| A | 자소서 입력(write) | `screens/write/*`, `server/write/transfer.route.js` |
| B | 첨삭 결과(result) · AI 핵심 | `screens/result/*`, `server/result/*` |
| C | 보관함(archive) | `screens/archive/*`, `server/archive/letters.route.js` |

`shared/` (디자인 토큰, 스토어 엔진, 라우터, 헤더/온보딩 셸)는 초기 셋업 후 동결합니다.
구조 변경이 필요하면 세 팀원이 함께 논의 후 반영하세요.

> **충돌 방지:** `shared/js/core.js` 는 화면별 액션을 조립만 하는 파일입니다. 새 액션을 추가할 때는
> 본인 화면의 `*.state.js` 에 액션을 추가하고, `core.js` 의 공통(온보딩/내비게이션) 영역은 건드리지 마세요.

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
| `write` | 팀원 A |
| `result` | 팀원 B |
| `archive` | 팀원 C |
| `server` | 서버(`server/`) 공통 |
| `shared` | 공통 셸/스토어(`shared/`) — 셋업 후에는 팀 논의 필요 |

### 예시

```bash
feat(result): 자소서 미리보기 카테고리별 하이라이트 렌더링
feat(archive): 자소서 등록 모달 + txt 업로드 추가
fix(archive): 검색어 초기화 시 목록 안 뜨는 버그 수정
style(write): 회사 선택 버튼 모바일 레이아웃 수정
feat(server): POST /api/transfer → Claude API 연동
chore: .env.example 환경변수 템플릿 추가
```

---

## 협업 규칙

### 1. 브랜치 규칙

```
main                     ← 배포 브랜치 (직접 push 절대 금지)
├── feat/write-...       ← 팀원 A
├── feat/result-...      ← 팀원 B
└── feat/archive-...     ← 팀원 C
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

각 화면이 `screens/<이름>/` 폴더로 분리되어 있어 대부분의 충돌은 `shared/` 또는 `server/index.js` 에서만
발생합니다. 충돌 파일 확인 후 해당 팀원에게 먼저 연락 → 함께 보면서 어떤 코드를 살릴지 결정 →
충돌 마커(`<<<<`, `====`, `>>>>`) 제거 후 커밋.

---

## 핵심 규칙

- **`server/` 파일**: 브라우저에서 실행되지 않음. API 키는 반드시 여기에만 사용 (`process.env.*`)
- **`screens/*/*.view.js` 파일**: fetch 직접 호출 금지. 같은 화면의 `*.api.js` 함수만 호출
- **XSS**: 사용자 입력을 HTML에 삽입할 때 반드시 `shared/js/lib/dom.js`의 `escapeHtml()` 사용
- **환경변수**: `.env.example` 복사 후 `.env.local` 로 이름 변경해서 사용. 절대 커밋 금지
