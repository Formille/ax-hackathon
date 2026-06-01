"use client";

// Two INDEPENDENT random tokens kept in the browser. They are never sent
// together in a way that links them, which is what makes voting structurally
// anonymous: the ballot (vote_token) cannot be traced back to the raffle
// identity (raffle_token).
const VOTE_KEY = "ha_vote_token";
const RAFFLE_KEY = "ha_raffle_token";

function getOrCreate(key: string): string {
  if (typeof window === "undefined") return "";
  let value = window.localStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID();
    window.localStorage.setItem(key, value);
  }
  return value;
}

export const getVoteToken = () => getOrCreate(VOTE_KEY);
export const getRaffleToken = () => getOrCreate(RAFFLE_KEY);

const JUDGE_KEY = "ha_judge_code";
export function getJudgeCode(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(JUDGE_KEY) ?? "";
}
export function setJudgeCode(code: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(JUDGE_KEY, code);
}
export function clearJudgeCode() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(JUDGE_KEY);
}
