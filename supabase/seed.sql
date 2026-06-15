-- =====================================================================
--  Seed data — safe to edit/delete from the admin UI after first run.
--  Run AFTER 0001_init.sql.
-- =====================================================================

-- Settings singleton
-- max_votes_per_voter = 0 → 1인 투표 수 무제한
insert into public.settings (id, event_name, phase, max_votes_per_voter, popularity_award_label)
values (1, 'AX 해커톤 2026', 'draft', 0, '인기상')
on conflict (id) do nothing;

-- 해커톤 트랙 심사 기준 (편집 가능). weight = % 비중.
insert into public.criteria (display_order, label, max_score, weight, level_low, level_mid, level_high) values
  (1, '업무 적용성',      10, 30,
      '시나리오가 가상·실업무와 거리 있음',
      '일부 부서·일부 상황에 적용 가능',
      '즉시 현업 도입 가능, 절감 시간·범위가 정량 가시화'),
  (2, '기술 적용 깊이',   10, 20,
      '단순 LLM 호출·복붙 수준',
      '의도적 프롬프트·RAG·도구 호출 등 적절히 활용',
      '기술 선택과 설계 의도 명확, LLM 한계를 보완하는 구조'),
  (3, '발표·시연 완결성', 10, 20,
      '시연 불가, 핵심 기능 동작 X',
      '핵심 흐름까지는 시연 가능, 일부 미완',
      '실제 동작 + 청중이 즉시 이해 가능한 수준의 발표'),
  (4, '확산 가능성',      10, 30,
      '1회성·해당 팀에서만 의미',
      '일부 모듈·로직은 재사용 가능',
      '타 부서·타 업무로 즉시 이식 가능, 자산화 가능한 구조')
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
