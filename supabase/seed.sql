-- =====================================================================
--  Seed data — safe to edit/delete from the admin UI after first run.
--  Run AFTER 0001_init.sql.
-- =====================================================================

-- Settings singleton
-- max_votes_per_voter = 0 → 1인 투표 수 무제한
insert into public.settings (id, event_name, phase, max_votes_per_voter, popularity_award_label)
values (1, 'AX 해커톤 2026', 'draft', 0, '인기상')
on conflict (id) do nothing;

-- Default rubric (편집 가능)
insert into public.criteria (display_order, label, description, max_score, weight) values
  (1, '혁신성',   '아이디어의 독창성과 새로움',        10, 1.0),
  (2, '완성도',   '구현 수준과 동작 안정성',          10, 1.0),
  (3, '실용성',   '문제 해결력과 시장/현업 적용성',    10, 1.0),
  (4, '발표력',   '전달력과 데모 구성',               10, 0.5)
on conflict do nothing;

-- Demo participants (실제 운영 시 관리자에서 교체)
insert into public.participants (display_order, team_name, project_name, tagline, description, members) values
  (1, '팀 알파',   'QuickClaim',  '보험 청구를 60초로',       '사진 한 장으로 보험 청구서를 자동 작성해 주는 모바일 서비스.', '김하늘, 이준호'),
  (2, '팀 베타',   'GreenRoute',  '탄소를 줄이는 길찾기',     '이동 경로의 탄소배출량을 비교해 가장 친환경적인 경로를 추천.',   '박서연, 정우진, 최민지'),
  (3, '팀 감마',   'StudyBuddy',  'AI 스터디 메이트',         '학습 자료를 넣으면 퀴즈와 복습 일정을 만들어 주는 AI 튜터.',     '한지민, 오세훈')
on conflict do nothing;

-- Demo judges (실제 운영 시 관리자에서 발급/교체)
insert into public.judges (name, code) values
  ('심사위원 A', 'JUDGE-ALPHA'),
  ('심사위원 B', 'JUDGE-BRAVO')
on conflict (code) do nothing;
