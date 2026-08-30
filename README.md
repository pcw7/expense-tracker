# ☁️ 가계부 (Expense Tracker)

지출을 기록하고, 카테고리별·기간별 통계를 확인하고, AI가 만들어주는 월간 소비 리포트를 받아보는 개인용 가계부 웹 애플리케이션입니다.

![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat&logo=sqlite&logoColor=white)
![OpenRouter](https://img.shields.io/badge/AI-OpenRouter-8A5CF5?style=flat)

<p>
  <img src="docs/screenshots/home-light.png" width="49%" alt="홈 화면 (라이트 모드) — 도넛 차트, AI 요약, 달력" />
  <img src="docs/screenshots/dashboard-dark.png" width="49%" alt="대시보드 (다크 모드) — 카테고리별 지출, 예산 사용률, 지출 추이" />
</p>

## ✨ 주요 기능

- 💸 **지출 기록** — 금액·날짜·카테고리·메모로 지출을 추가/수정/삭제
- 🍩 **홈 대시보드** — 이번 달 총 지출을 도넛 차트로, 카테고리별 비중을 한눈에 확인
- 📅 **달력 보기** — 월별 달력에서 지출이 있는 날짜를 표시하고, 날짜를 클릭하면 그날의 지출 내역을 카테고리 색으로 틴트된 카드로 확인. 카드를 드래그해서 다른 날짜에 놓으면 지출 날짜를 바로 옮길 수 있음
- ➕ **지출 추가 모달** — 홈 화면에서 바로 달력으로 날짜를 고르고 지출/카테고리를 추가
- 📊 **대시보드 통계** — 카테고리별 지출 막대 차트, 예산 대비 사용률, 최근 6개월 지출 추이, 고정비/변동비 분리
- 🎯 **예산 관리** — 월별 전체 예산과 카테고리별 예산을 설정하고 사용률 확인
- 🔁 **고정지출** — 월세·구독료처럼 매달 반복되는 지출을 한 번 등록해두면 매달 지정한 결제일에 지출 내역이 자동으로 기록됨
- 🏷️ **고정 카테고리 12종** — 식비·주거·교통 등 아이콘+색이 정해진 프리셋 카테고리(앱 안에서 추가 불가). 색상은 색맹 시뮬레이션까지 검증해 서로 헷갈리지 않도록 고른 팔레트
- 🤖 **AI 월간 리포트** — OpenRouter를 통해 무료 LLM 모델을 호출해 이번 달 소비 인사이트를 한국어 마크다운으로 생성
- 🌤️ 하늘·구름·해·달을 모티프로 한 라이트/다크 테마

## 🛠️ 기술 스택

- [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- [Prisma](https://www.prisma.io) + SQLite (`@prisma/adapter-better-sqlite3`)
- [OpenRouter](https://openrouter.ai) API를 통한 AI 리포트 생성

## 🚀 시작하기

### 1. 설치

```bash
npm install
```

### 2. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 만들고 아래 값을 채웁니다.

```bash
DATABASE_URL="file:./prisma/dev.db"
OPENROUTER_API_KEY="sk-or-v1-..."
```

`OPENROUTER_API_KEY`는 [openrouter.ai](https://openrouter.ai)에서 발급받을 수 있습니다 (AI 리포트 기능에만 필요).

### 3. 데이터베이스 마이그레이션 + 카테고리 시드

카테고리는 앱 안에서 직접 추가할 수 없는 고정 프리셋(12개)이라, 마이그레이션 후 반드시 시드를 실행해야 합니다.

```bash
npx prisma migrate dev
npm run db:seed
```

### 4. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다.

## 📁 프로젝트 구조

```
src/
├── app/
│   ├── page.tsx              # 홈 (도넛 차트, AI 요약, 달력)
│   ├── dashboard/             # 통계 대시보드
│   ├── expenses/               # 지출 목록/입력
│   ├── budgets/                # 예산 관리
│   ├── recurring/               # 고정지출 등록/관리
│   ├── reports/                 # AI 월간 리포트
│   ├── api/                    # REST API 라우트
│   └── _components/            # 홈 화면 전용 컴포넌트 (달력, 드래그&드롭, 도넛 차트, 지출 추가 모달)
├── lib/                        # 공용 유틸(날짜, 포맷, 고정지출 자동 생성, Prisma 클라이언트, OpenRouter 클라이언트 등)
└── generated/prisma/            # Prisma 클라이언트 (자동 생성)
```

## 📜 스크립트

| 명령어 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 |
| `npm run lint` | ESLint 검사 |
| `npx prisma studio` | DB GUI로 데이터 확인 |
