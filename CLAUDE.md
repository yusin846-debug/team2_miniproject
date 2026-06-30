# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 프로젝트 개요

**자소서 환승** — 기존에 작성한 자소서를 새 회사·직군에 맞게 AI가 자동으로 첨삭해주는 서비스.  
**바닐라 HTML/CSS/ES Modules** 프론트엔드 + **Vercel 서버리스 함수** 백엔드 구조. 빌드 도구 없음.

---

## 실행 방법

### 프론트만 개발할 때 (팀원 A·B·C·D — 화면 작업 중)
```bash
npm run dev
# → http://localhost:5173
# USE_SERVER = false 상태 → 로컬 시드 데이터로 모든 화면 동작
```

### API까지 함께 테스트할 때 (팀원 C·D — 백엔드 연결 후)
```bash
# 최초 1회: Vercel CLI 설치 및 로그인
npm install -g vercel
vercel login

npm run dev:api
# → http://localhost:3000
# 프론트 + api/ 함수 동시 실행 (배포 환경과 동일)
```

`npm run dev:api` 사용 시 `.env.local` 의 환경변수가 자동으로 로드됩니다.

---

## 폴더 구조

```
jasoseo-transfer/
│
├── api/                          ← 백엔드: Vercel 서버리스 함수 (Node.js)
│   ├── _lib/
│   │   └── ai.js                 ← AI API 클라이언트 공통 설정
│   ├── analyze.js                ← POST /api/analyze   (AI 자소서 분석)
│   ├── auth.js                   ← POST /api/auth/login (로그인)
│   ├── letters.js                ← GET·POST /api/letters (보관함 목록·저장)
│   └── letters/[id].js           ← GET·DELETE /api/letters/:id (단건 조회·삭제)
│
├── js/
│   ├── main.js                   ← 앱 진입점: 렌더 루프 + 액션 핸들러 + 이벤트 위임
│   ├── state.js                  ← 중앙 상태 저장소
│   │
│   ├── services/                 ← 브라우저 → 서버 요청 전송 (로직 없음, 전달만)
│   │   ├── http.js               ← 공통 fetch 래퍼 (get/post/del)
│   │   ├── analyze.js            ← analyze() 호출
│   │   ├── letters.js            ← fetchLetters/fetchLetter/saveLetter/deleteLetter
│   │   └── auth.js               ← login/logout/getStoredUser/saveUser
│   │
│   ├── features/                 ← 화면 렌더링: state → HTML 문자열 반환 (순수 함수)
│   │   ├── onboarding.js         ← 로그인·투어 화면
│   │   ├── write.js              ← 자소서 입력 화면
│   │   ├── result.js             ← AI 첨삭 결과 화면
│   │   ├── archive.js            ← 보관함 화면
│   │   ├── header.js             ← 상단 네비게이션
│   │   └── toast.js              ← 알림 배너
│   │
│   ├── lib/
│   │   ├── dom.js                ← DOM 유틸·이벤트 위임·XSS 이스케이프(esc())
│   │   └── matcher.js            ← 규칙 기반 분석 엔진 (AI 연동 전 임시 사용)
│   │
│   └── data/                     ← 로컬 시드 데이터 (서버 없을 때 폴백)
│       ├── companies.js
│       ├── roles.js
│       ├── categories.js
│       └── samples.js
│
├── css/
│   ├── tokens.css                ← 브랜드 디자인 토큰 (색상·타이포·반경)
│   ├── base.css
│   ├── layout.css
│   └── components/               ← 화면별 스타일
│
├── index.html
├── vercel.json
├── .gitignore
└── package.json
```

---

## 각 레이어의 역할

| 레이어 | 폴더 | 한 줄 역할 | 로직 있음? |
|--------|------|-----------|-----------|
| 백엔드 | `api/` | DB 조회, AI 호출, 비즈니스 로직 | ✅ 핵심 로직 |
| 서비스 | `js/services/` | `/api/*` 에 fetch 요청만 전달 | ❌ 전달만 |
| 핸들러 | `js/main.js` | 버튼 클릭 감지 → 서비스 호출 → 상태 저장 | ✅ 흐름 연결 |
| 뷰 | `js/features/` | state 받아서 HTML 문자열 반환 | ❌ 렌더만 |
| 상태 | `js/state.js` | 단일 상태 객체 관리 | ❌ 저장만 |

---

## 기능별 구현 흐름

### AI 자소서 분석 (핵심 기능)

```
[환승 시작 버튼 클릭]
        ↓
js/main.js          write:start 액션 감지 → runAnalyze() 실행
        ↓
js/services/analyze.js   analyze({ text, target, role }) 호출
        ↓                ├─ USE_SERVER=false → lib/matcher.js 로컬 분석 (현재)
        ↓                └─ USE_SERVER=true  → POST /api/analyze (AI 연동 후)
api/analyze.js      프롬프트 설계 → AI API 호출 → 5개 카테고리 JSON 반환
        ↓
js/main.js          setState({ suggestions, stage: 'result' })
        ↓
js/features/result.js    suggestions 배열을 카드로 렌더링
```

**AI 연동 전환 방법:**
1. `api/_lib/ai.js` — AI API 클라이언트 초기화
2. `api/analyze.js` — TODO 주석 부분 구현
3. `js/services/analyze.js` — `USE_SERVER = true` 로 변경

---

### 보관함 저장·조회

```
[저장 버튼 클릭]
        ↓
js/main.js          result:save 액션 → saveResult() 실행
        ↓
js/services/letters.js   saveLetter(payload) 호출
        ↓                ├─ USE_SERVER=false → 로컬 ARCHIVE_SEED 에 추가 (현재)
        ↓                └─ USE_SERVER=true  → POST /api/letters
api/letters.js      DB 에 저장 후 저장된 항목 반환
        ↓
js/main.js          flashToast('보관함에 저장했어요')
```

---

### 로그인

```
[로그인 버튼 클릭]
        ↓
js/main.js          auth:login 액션 → login() 실행
        ↓
js/services/auth.js  POST /api/auth/login 요청
        ↓
api/auth.js         DB 에서 유저 조회 → 비밀번호 일치 확인
        ↓
js/main.js          성공 → saveUser() → localStorage 저장 → setState({ screen: 'app' })
                    실패 → flashToast('아이디 또는 비밀번호가 틀렸어요')
```

---

## 팀원 분업표

| 팀원 | 담당 화면 | 담당 파일 |
|------|----------|---------|
| A | 로그인·온보딩 | `js/features/onboarding.js` · `js/services/auth.js` · `api/auth.js` |
| B | 자소서 입력 | `js/features/write.js` |
| C | 첨삭 결과 | `js/features/result.js` · `js/services/analyze.js` · `api/analyze.js` · `api/_lib/ai.js` |
| D | 보관함 | `js/features/archive.js` · `js/services/letters.js` · `api/letters.js` · `api/letters/[id].js` |
| E | 공통·인프라 | `js/main.js` · `js/state.js` · `js/features/header.js` |

> **충돌 방지:** `js/main.js` 는 팀원 E 가 관리합니다. 다른 팀원이 액션 핸들러를 추가해야 할 때는 팀원 E 에게 요청하거나, 파일 내 담당 구간 주석(`// ── 팀원 A: 온보딩 ──`)을 확인 후 해당 구간에만 작성하세요.

---

## 서버 전환 방법 (백엔드 완성 후)

각 서비스 파일 상단의 `USE_SERVER` 플래그만 바꾸면 됩니다.

```js
// js/services/analyze.js
const USE_SERVER = true;  // ← false → true

// js/services/letters.js
const USE_SERVER = true;  // ← false → true
```

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
feat(onboarding): 아이디·비밀번호 로그인 폼 추가
fix(archive): 검색어 초기화 시 목록 안 뜨는 버그 수정
style(write): 회사 선택 버튼 모바일 레이아웃 수정
feat(api): POST /api/analyze AI 호출 구현
chore: .env.local.example 환경변수 템플릿 추가
```

### 브랜치 전략

```
main                        ← 배포 브랜치 (직접 push 금지)
└── feat/onboarding-login   ← 팀원 A
└── feat/write-form         ← 팀원 B
└── feat/result-ai          ← 팀원 C
└── feat/archive-crud       ← 팀원 D
└── feat/header-nav         ← 팀원 E
```

작업 완료 후 `main` 으로 Pull Request → 팀장 확인 후 Merge.

---

## 핵심 규칙

- **`api/` 파일**: 브라우저에서 실행되지 않음. API 키는 반드시 여기에만 사용 (`process.env.*`)
- **`js/features/` 파일**: fetch 직접 호출 금지. `services/` 함수만 호출
- **XSS**: 사용자 입력을 HTML에 삽입할 때 반드시 `js/lib/dom.js`의 `esc()` 사용
- **환경변수**: `.env.local.example` 복사 후 `.env.local` 로 이름 변경해서 사용. 절대 커밋 금지
