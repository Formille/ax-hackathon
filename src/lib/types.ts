export type Phase = "draft" | "voting" | "closed" | "revealed";

export interface Settings {
  id: number;
  event_name: string;
  phase: Phase;
  current_participant_id: string | null;
  max_votes_per_voter: number;
  judging_open: boolean;
  popularity_award_label: string;
  updated_at: string;
}

export interface Participant {
  id: string;
  display_order: number;
  team_name: string;
  project_name: string;
  tagline: string | null;
  description: string | null;
  features: string | null;
  thumbnail_url: string | null;
  demo_url: string | null;
  members: string | null;
  published: boolean;
  code: string | null;
  created_at: string;
}

export interface Screenshot {
  id: string;
  participant_id: string;
  storage_path: string;
  caption: string | null;
  display_order: number;
  created_at: string;
}

/** A screenshot ready for display (public URL resolved). */
export interface ScreenshotView {
  id: string;
  url: string;
  caption: string | null;
}

export interface Judge {
  id: string;
  name: string;
  code: string;
  active: boolean;
  weight: number;
  created_at: string;
}

export interface Criterion {
  id: string;
  display_order: number;
  label: string;
  description: string | null;
  max_score: number;
  weight: number;
  created_at: string;
}

export interface RaffleEntry {
  id: string;
  raffle_token: string;
  name: string;
  affiliation: string | null;
  participated: boolean;
  is_winner: boolean;
  created_at: string;
}

export interface Evaluation {
  id: string;
  judge_id: string;
  participant_id: string;
  comment: string | null;
  submitted: boolean;
  updated_at: string;
}

export interface EvaluationScore {
  id: string;
  evaluation_id: string;
  criterion_id: string;
  score: number;
  comment: string | null;
}

export const PHASE_LABELS: Record<Phase, string> = {
  draft: "준비 중",
  voting: "투표 진행 중",
  closed: "투표 마감",
  revealed: "결과 공개",
};
