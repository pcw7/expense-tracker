# ☁️ 가계부 (Expense Tracker)

지출을 기록하고, 카테고리별·기간별 통계를 확인하고, AI가 만들어주는 월간 소비 리포트를 받아보는 개인용 가계부 웹 애플리케이션입니다.

> 로그인·다중 사용자 개념이 없는 1인용 로컬 앱입니다. 데이터는 로컬 SQLite 파일(`prisma/dev.db`)에 저장되므로 Vercel 같은 서버리스 환경에는 그대로 배포되지 않습니다. 배포된 데모는 없고, 아래 스크린샷과 «시작하기»의 로컬 실행 절차로 확인해 주세요.

![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat&logo=sqlite&logoColor=white)
![OpenRouter](https://img.shields.io/badge/AI-OpenRouter-8A5CF5?style=flat)

<p>
  <img src="docs/screenshots/home-light.png?v=3" width="49%" alt="홈 화면 (라이트 모드) — 도넛 차트, AI 요약, 달력, 선택한 날짜의 지출 카드" />
  <img src="docs/screenshots/dashboard-dark.png?v=4" width="49%" alt="대시보드 (다크 모드) — 이번 달 메모, 카테고리별 지출, 지출 히트맵" />
</p>

## ✨ 주요 기능

- 💸 **지출 기록** — 금액·날짜·카테고리·메모로 지출을 추가하고, `/expenses`에서 날짜 내림차순 목록을 보며 각 항목을 그 자리에서 인라인 수정·삭제. 목록은 최근 500건까지 한 번에 불러오며, 기간·카테고리 필터와 페이지네이션은 아직 없음
- 🍩 **홈 화면**(`/`) — 이번 달 예산 사용률 막대(80% 미만 정상 → 80~100% 경고 → 초과 위험으로 색 전환), 카테고리별 지출 도넛 차트(상위 7개, 나머지는 '기타'로 합산), 이번 달 AI 리포트의 '이번 달 요약'을 구름 캐릭터가 말풍선으로 읽어주는 위젯
- 📅 **달력 보기** — 월별 달력에 지출이 있는 날짜를 점으로 표시하고, 날짜를 클릭하면 그날의 지출을 카테고리 색이 옅게 깔린 카드로 보여줌. 카드를 드래그해 다른 날짜 칸에 놓으면 지출 날짜가 곧바로 그 날짜로 바뀜(다시 입력할 필요 없음)
- ➕ **지출 추가 모달** — 홈 화면을 벗어나지 않고 바로 달력에서 날짜를 고르고, 금액·카테고리·메모를 입력해 지출을 추가
- 📊 **통계 대시보드**(`/dashboard`) — 이번 달 총 지출과 전월 대비 증감, 고정비·변동비 분리 집계, 카테고리별 지출 막대 차트, 예산 대비 사용률 게이지, 최근 6개월 지출 추이 꺾은선 그래프
- 🎯 **예산 관리** — 월별 전체 예산과 카테고리별 예산을 각각 설정하고, 현재까지 사용한 비율과 초과 여부를 확인
- 🔥 **지출 히트맵** — 이번 달 지출을 달력 형태(주×요일)로 배치하고 금액이 클수록 진하게 표시. 칸에 마우스를 올리면 날짜·요일·금액이 툴팁으로 뜸. 일요일과 공휴일은 날짜 숫자를 빨간색으로 표시하며, 공휴일은 음력 공휴일(설날·추석·부처님오신날)과 대체공휴일 규정까지 직접 계산함
- 📝 **이번 달 메모** — 블록 에디터(BlockNote)로 목표·다짐·체크리스트를 자유롭게 기록. `/`(슬래시) 명령으로 제목·목록·체크박스 블록을 바로 삽입할 수 있고, 노션처럼 언제나 편집 상태이며 입력을 멈추면 1초 뒤 자동으로 저장됨(별도 저장 버튼 없음)
- 🔁 **고정지출** — 월세·구독료처럼 매달 반복되는 지출을 한 번 등록해두면, 앱에 접속할 때 이번 달 몫이 아직 없으면 자동으로 지출 내역이 만들어짐(별도 cron 없이 루트 레이아웃에서 지연 생성). 31일처럼 그 달에 없는 날짜는 말일로 보정되고, 이미 생성된 내역은 금액·메모를 고쳐도 덮어쓰지 않으며, 통계에서는 이 금액이 '고정비'로 집계됨. 다만 처리 대상은 접속 시점의 '현재 달'뿐이라 한 달 내내 앱을 열지 않으면 그 달 분은 소급 생성되지 않고, 같은 달 안에서 자동 생성분을 삭제하면 다음 접속 때 다시 만들어짐
- 🏷️ **기본 카테고리 12종** — 식비·주거·교통처럼 아이콘과 색이 미리 정해진 기본 카테고리(앱에서는 추가할 수 없어 카테고리가 무분별하게 늘어나지 않음). 색은 색각 이상 시뮬레이션까지 거쳐 차트에서 서로 헷갈리지 않는 값으로 골랐음
- 🤖 **AI 월간 리포트** — 최근 12개월 중 원하는 달을 골라 OpenRouter 무료 모델(`nvidia/nemotron-3-super-120b-a12b:free`)로 '이번 달 요약 / 카테고리별 분석 / 전월 대비 / 다음 달 제안' 4개 섹션의 한국어 마크다운 리포트를 생성. 리포트는 월당 1건만 저장되어 다시 생성하면 덮어씀
- 🗓️ **월 단위 조회** — 홈 달력, 통계 대시보드, 예산, AI 리포트 모두 월을 바꿔가며 과거 데이터를 확인 가능(대시보드는 이번 달보다 미래로는 이동 불가)
- 🌤️ **하늘 테마** — 하늘·구름·해·달을 모티프로 한 라이트/다크 화면. 별도 토글 없이 OS 설정을 따라 자동 전환

## 🛠️ 기술 스택

- [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- [Prisma](https://www.prisma.io) + SQLite (`@prisma/adapter-better-sqlite3`)
- [OpenRouter](https://openrouter.ai) API를 통한 AI 리포트 생성
- [BlockNote](https://www.blocknotejs.org)를 이용한 블록 기반 메모 에디터
- `korean-lunar-calendar`로 직접 계산하는 한국 공휴일·대체공휴일 로직

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

카테고리는 앱 안에서 직접 추가할 수 없는 기본 카테고리 12종이라, 마이그레이션 후 반드시 시드를 실행해야 합니다.

```bash
npm run db:migrate
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
│   ├── page.tsx          # 홈 (예산 카드, 도넛 차트, AI 요약, 달력)
│   ├── layout.tsx        # 루트 레이아웃 (요청 시 이번 달 고정지출 자동 생성)
│   ├── _components/      # 홈 전용 (달력, 드래그&드롭, 도넛, 예산 막대, AI 요약, 추가 모달)
│   ├── dashboard/        # 통계 대시보드
│   │   └── _components/  # 카테고리 막대·히트맵·추이 차트, 이번 달 메모 에디터
│   ├── expenses/         # 지출 목록/입력
│   ├── budgets/          # 예산 관리
│   ├── recurring/        # 고정지출 등록/관리
│   ├── reports/          # AI 월간 리포트
│   └── api/              # REST API 라우트 (9개)
├── components/nav.tsx    # 전 페이지 공통 sticky 헤더
├── lib/                  # 날짜·포맷·통계·고정지출 생성·한국 공휴일·Prisma·OpenRouter
└── generated/prisma/     # Prisma 클라이언트 (npm install 시 자동 생성, git 미추적)
```

## 📜 스크립트

| 명령어 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 (마이그레이션이 적용된 `prisma/dev.db`가 미리 있어야 합니다) |
| `npm run lint` | ESLint 검사 |
| `npm run db:migrate` | 마이그레이션 생성·적용 (`prisma migrate dev`) |
| `npm run db:seed` | 기본 카테고리 12종 시드 (멱등, 여러 번 실행 가능) |
| `npm run db:studio` | Prisma Studio로 DB 확인 |

`npm install` 시 `postinstall`이 `prisma generate`를 자동 실행해 `src/generated/prisma`를 만듭니다(git에는 추적되지 않습니다).