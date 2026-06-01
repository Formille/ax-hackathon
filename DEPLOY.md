# 배포 가이드 (이 프로젝트 전용)

Supabase 프로젝트는 **이미 생성·마이그레이션·시드까지 완료**되어 있습니다.
남은 일은 Vercel에 연결하고 환경변수를 넣는 것뿐입니다.

## 1. Supabase (완료됨)

| 항목 | 값 |
| --- | --- |
| 프로젝트 | `hackathon-arena` (리전: ap-northeast-2 / 서울) |
| Project Ref | `dnotpyyehjgznotlzikw` |
| API URL | `https://dnotpyyehjgznotlzikw.supabase.co` |
| 대시보드 | https://supabase.com/dashboard/project/dnotpyyehjgznotlzikw |

스키마(테이블 8개 + RLS + `vote_counts` 뷰)와 시드(기본 심사기준 4개, 데모 팀 3개,
데모 심사위원 2명)가 적용되어 있습니다.

## 2. Vercel에 배포

이 환경에는 Vercel 인증 토큰이 없어 자동 배포가 불가합니다. 아래 한 번의 import로 연결하세요.

1. https://vercel.com/new → 깃허브 저장소 **`Formille/ax-hackathon`** 선택 (Import)
2. **Production Branch**를 `claude/keen-sagan-FJRcm` 로 지정
   (또는 이 브랜치를 기본 브랜치로 머지 후 그대로 진행)
3. Framework는 **Next.js** 로 자동 감지됨 — 빌드 설정 변경 불필요
4. **Environment Variables** 에 아래 5개를 추가 (3번 항목 값은 대시보드에서 복사)
5. **Deploy**

### 환경변수

```
NEXT_PUBLIC_SUPABASE_URL=https://dnotpyyehjgznotlzikw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRub3RweXllaGpnem5vdGx6aWt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNDczNzAsImV4cCI6MjA5NTgyMzM3MH0.xbGCe0wDqflV4UXigZrJ-xQuCaqMdaMeZsKJYP82-8I
SUPABASE_SERVICE_ROLE_KEY=<대시보드에서 복사>
ADMIN_PASSCODE=<원하는 관리자 비밀번호>
NEXT_PUBLIC_SITE_URL=
```

- **`SUPABASE_SERVICE_ROLE_KEY`** (서버 전용 비밀키)은 보안상 코드/저장소에 두지 않습니다.
  여기서 복사하세요 → **Settings → API → `service_role`**
  https://supabase.com/dashboard/project/dnotpyyehjgznotlzikw/settings/api
- `NEXT_PUBLIC_SITE_URL` 은 비워둬도 됩니다(요청 도메인 자동 감지). 커스텀 도메인을
  쓰면 그 값을 넣으세요.

## 3. 관리자 로그인 (패스코드)

관리자는 매직 링크 대신 **패스코드**로 로그인합니다 — Supabase Auth URL 설정이
필요 없습니다. `ADMIN_PASSCODE` 환경변수에 넣은 비밀번호를 `/admin` 로그인 화면에
입력하면 됩니다. 값을 바꾸면 기존 로그인 세션은 자동 무효화됩니다.

## 4. 첫 실행 체크리스트

- `/admin` 접속 → `ADMIN_PASSCODE` 비밀번호 입력 → 대시보드 진입
- **참가팀 / 심사기준 / 심사위원** 탭에서 데모 데이터를 실제 데이터로 교체
- 심사위원에게 코드 + `/judge` 링크 전달 (데모 코드: `JUDGE-ALPHA`, `JUDGE-BRAVO`)
- 행사 시작 시 대시보드에서 상태를 **투표 진행 중**으로, `/display` 를 프로젝터에 띄우기

## 5. (선택) 로컬 실행

```bash
cp .env.example .env.local   # 위 값 + service_role 채우기
npm install
npm run dev
```
