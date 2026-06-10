-- Detailed "key features" field for participants (주요 기능).
-- `tagline` = 한 줄 소개, `description` = 상세 소개, `features` = 주요 기능.
alter table public.participants add column if not exists features text;
