# 해커톤 아레나 (Hackathon Arena)

해커톤 현장에서 **관객 투표 · 심사위원 평가 · 경품 추첨**을 한 번에 진행하는 웹앱입니다.
관객은 QR로 접속해 익명으로 투표하고 추첨에 응모하며, 심사위원은 개별 코드로 입장해
루브릭 기반으로 점수를 매깁니다. 관리자는 행사 진행 상태를 제어하고 결과를 집계합니다.

- **스택**: Next.js 15 (App Router) · Supabase (Postgres + Auth) · Vercel · Tailwind CSS
- **언어**: 한국어 UI

---

## 화면 구성

| 경로 | 대상 | 설명 |
| --- | --- | --- |
| `/vote` | 관객 | 이름 입력(추첨 응모) → 팀 목록에서 최대 N표 투표 |
| `/judge` | 심사위원 | 개별 코드 입장 → 항목별 점수·코멘트 평가(임시저장/제출) |
| `/display` | 프로젝터 | 대형 화면용 참여 QR + “지금 발표 중” 표시 |
| `/reveal` | 관객 | 투표 종료 후 **인기상**과 관객 투표 순위 공개 |
| `/admin` | 관리자 | 진행 상태 제어·참가팀/심사기준/심사위원 관리·결과·추첨 |

## 핵심 설계

- **구조적 무기명 투표**: 투표는 `vote_token`, 추첨 신원은 `raffle_token` 으로 분리된
  두 개의 독립 토큰을 사용합니다. 두 토큰을 잇는 외래키가 없어, 어떤 표가 누구의
  것인지 데이터 구조상 추적할 수 없습니다.
- **별도 시상**: 관객 인기상(1팀)과 심사위원상(대상1·최우수2·우수2)을 분리 집계합니다.
  심사 결과는 **관리자에게만** 보이며, 관객 리빌에는 인기 투표만 공개됩니다.
- **서버 권한 분리**: 모든 민감한 읽기/쓰기는 Next.js 서버 액션에서 **service role**
  키로 수행합니다. 브라우저에는 anon 키만 노출되며 RLS가 백스톱으로 동작합니다.

자세한 의사결정과 데이터 모델은 [`SPEC.md`](./SPEC.md) 참고.

---

## 빠른 시작 (로컬)

### 1) Supabase 준비

1. [supabase.com](https://supabase.com) 에서 프로젝트 생성
2. SQL Editor에서 다음 순서로 실행
   - `supabase/migrations/0001_init.sql` (스키마 + RLS)
   - `supabase/seed.sql` (기본 심사기준 + 데모 데이터, 선택)
3. **Project Settings → API** 에서 아래 값 확인
   - Project URL
   - `anon` (publishable) key
   - `service_role` key (서버 전용, 절대 노출 금지)

### 2) 환경 변수

`.env.example` 를 `.env.local` 로 복사하고 채웁니다.

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci... (또는 sb_publishable_...)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
ADMIN_EMAILS=you@example.com          # 쉼표로 여러 명 가능
NEXT_PUBLIC_SITE_URL=                  # 로컬은 비워두면 됨
```

> ⚠️ `ADMIN_EMAILS` 가 비어 있으면 **아무도 관리자 로그인할 수 없습니다**(기본 차단).

### 3) 실행

```bash
npm install
npm run dev      # http://localhost:3000
```

---

## Vercel 배포

1. 이 저장소를 Vercel 프로젝트로 import
2. **Environment Variables** 에 위 5개 변수를 모두 등록
   (`NEXT_PUBLIC_*` 는 빌드 시 인라인되므로 반드시 빌드 전에 등록)
3. Deploy

### Supabase Auth 설정 (관리자 매직 링크)

Supabase 대시보드 **Authentication → URL Configuration** 에서:

- **Site URL**: 배포 도메인 (예: `https://your-app.vercel.app`)
- **Redirect URLs**: `https://your-app.vercel.app/auth/callback` 추가

기본 이메일 템플릿이면 그대로 동작합니다. (PKCE `code` / `token_hash` 둘 다 처리)

---

## 운영 가이드 (행사 당일)

1. **준비(draft)** — 관리자에서 참가팀·심사기준·심사위원을 등록. 관객 화면은 대기 상태.
   심사위원에게는 각자 코드와 `/judge` 링크를 전달.
2. **투표 시작(voting)** — 대시보드에서 상태를 `투표 진행 중` 으로 변경.
   `/display` 를 프로젝터에 띄워 QR로 참여 유도. “지금 발표 중” 팀을 바꿔가며 진행.
3. **투표 마감(closed)** — 투표를 닫고 집계. 심사도 `심사 마감` 으로 잠글 수 있음.
4. **결과 공개(revealed)** — 관객용 `/reveal` 에 인기상 공개.
   심사위원상은 관리자 **결과** 탭에서 확인 후 시상식에서 발표.
5. **추첨** — 관리자 **추첨** 탭에서 참여자 대상으로 무작위 추첨(seed 기록) + CSV 내보내기.

---

## 명령어

```bash
npm run dev        # 개발 서버
npm run build      # 프로덕션 빌드
npm run start      # 빌드 결과 실행
npm run typecheck  # 타입 검사
npm run lint       # 린트
```
