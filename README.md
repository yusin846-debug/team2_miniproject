# 자소서 환승 (JASOSEO TRANSFER)

> 한 번 쓴 자소서를 새 회사·직군에 맞게 AI가 "환승"시켜주는 첨삭 서비스의 프론트엔드.
> Claude Design 시안을 **바닐라 HTML/CSS/JS(ES Modules)** 구조로 재구성했습니다.

---

## 실행 방법

정적 서버가 필요합니다 (ES Module은 `file://`에서 동작하지 않음).

```bash
# 1) 프론트엔드 실행 (둘 중 하나)
npx serve -l 5173 .        # 또는: python3 -m http.server 5173
#  → http://localhost:5173

# 2) (선택) 목 API 서버 — 보관함 CRUD를 실제 서버로 쓰고 싶을 때
npx json-server --watch db.json --port 3000
```

기본값은 **백엔드 없이도 동작**합니다(로컬 시드 데이터 폴백).
실제 서버에 연결하려면 `js/api/client.js`의 `BASE_URL`을 `'http://localhost:3000'`으로 설정하세요.

---

## 폴더 구조

```
jasoseo-transfer/
├── index.html                 # 진입 HTML — CSS/JS 로드, #app 루트
├── db.json                    # json-server 목 데이터 (companies/roles/letters)
├── package.json
│
├── css/
│   ├── tokens.css             # ★ 브랜드 디자인 토큰 (색상·타이포·반경)
│   ├── base.css               # 리셋 + 공통 요소(버튼·카드·배지)
│   ├── layout.css             # 앱 셸·컨테이너·토스트
│   └── components/            # 화면별 스타일
│       ├── header.css
│       ├── write.css          # 입력 단계
│       ├── result.css         # 결과(미리보기·제안)
│       ├── archive.css        # 보관함
│       └── onboarding.css     # 로그인·투어
│
└── js/
    ├── main.js                # ★ 진입점 — 렌더 루프 + 이벤트 위임
    ├── state.js               # 중앙 상태 저장소(setState/subscribe)
    ├── data/                  # 마스터·시드 데이터 (백엔드 붙기 전 사용)
    │   ├── companies.js       #   회사 마스터 + 배지 스타일
    │   ├── roles.js           #   직군 마스터
    │   ├── categories.js      #   제안 5개 카테고리
    │   └── samples.js         #   예시 자소서 + 매칭 규칙 + 보관함 시드
    ├── api/
    │   └── client.js          # ★ REST API 클라이언트 (기능명세서와 1:1, 폴백 내장)
    ├── lib/
    │   ├── dom.js             #   DOM 유틸 + 이벤트 위임 + XSS escape
    │   └── matcher.js         # ★ 환승 분석 엔진 (추후 GPT API로 교체 지점)
    └── features/              # 화면(컴포넌트) 뷰
        ├── header.js
        ├── write.js
        ├── result.js
        ├── archive.js
        ├── onboarding.js
        └── toast.js
```

---

## 아키텍처 한눈에

- **상태 → 렌더**: `state.js`가 단일 상태를 들고, 바뀌면 `main.js`의 `render()`가 화면을 다시 그립니다.
- **이벤트**: 모든 버튼은 `data-action="..."` 속성만 달고, `main.js`가 위임(delegation)으로 한 번에 처리합니다. 재렌더 후에도 리스너 재등록이 필요 없습니다.
- **뷰**: 각 `features/*.js`는 `state`를 받아 HTML 문자열을 돌려주는 순수 함수입니다.
- **데이터/통신 분리**: 화면은 `api/client.js`만 호출하고, 서버 유무는 클라이언트가 알아서 처리합니다.

---

## 백엔드(Node.js + GPT API) 연결 지점

현재 환승 분석은 `js/lib/matcher.js`의 규칙 기반 `buildSuggestions()`로 동작합니다(MVP).
실제 GPT 첨삭으로 교체할 때는 **두 곳만** 바꾸면 됩니다.

1. `js/api/client.js`에 `analyze()` 추가 — `POST /transfer` 호출
2. `js/main.js`의 `runAnalyze()`에서 `buildSuggestions(...)` → `await api.analyze(...)`로 교체

> 참고: `POST /transfer`, `/letters`, `/auth/login` 등 전체 스펙은 **기능명세서(API)** 문서를 따릅니다.

---

## 데이터 모델 (요약)

| 리소스 | 주요 필드 |
|--------|-----------|
| companies | id · name · color · mark · mission · tone |
| roles | id · name |
| letters | id · company · role · date · count · snippet · content |
