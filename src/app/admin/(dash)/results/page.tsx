import { getSettings } from "@/lib/data";
import {
  getAudienceResults,
  getJudgeResults,
  JUDGE_AWARD_TIERS,
} from "@/lib/results";
import AutoRefresh from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";

const TIER_STYLE: Record<string, string> = {
  대상: "border-gold/50 bg-gold/10 text-gold",
  최우수상: "border-brand/50 bg-brand/10 text-brand-soft",
  우수상: "border-accent/40 bg-accent/10 text-accent",
};

export default async function ResultsPage() {
  const [settings, audience, judge] = await Promise.all([
    getSettings(),
    getAudienceResults(),
    getJudgeResults(),
  ]);

  const popularity = audience[0] && audience[0].votes > 0 ? audience[0] : null;
  const judgeRanked = judge.rows.filter((r) => r.judgeCount > 0);
  const judgeAwards = judgeRanked
    .slice(0, JUDGE_AWARD_TIERS.length)
    .map((row, i) => ({ tier: JUDGE_AWARD_TIERS[i], row }));

  return (
    <div className="space-y-8">
      <AutoRefresh seconds={10} />
      <div>
        <h1 className="text-2xl font-bold">결과 · 시상</h1>
        <p className="text-sm text-white/50">
          심사 결과는 관리자에게만 표시됩니다. 관객 리빌에는 인기 투표만 공개됩니다.
        </p>
      </div>

      {/* awards */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-bold">🏆 {settings.popularity_award_label}</h2>
          {popularity ? (
            <div className="mt-3 rounded-xl border border-gold/40 bg-gold/10 p-4">
              <p className="text-xs text-white/50">{popularity.participant.team_name}</p>
              <p className="text-xl font-black">{popularity.participant.project_name}</p>
              <p className="mt-1 font-bold text-gold">{popularity.votes}표</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-white/40">아직 투표가 없습니다.</p>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-bold">⚖️ 심사위원상</h2>
          {judgeAwards.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {judgeAwards.map(({ tier, row }) => (
                <li
                  key={row.participant.id}
                  className={`flex items-center justify-between rounded-xl border px-4 py-2.5 ${TIER_STYLE[tier]}`}
                >
                  <div>
                    <span className="text-sm font-bold">{tier}</span>
                    <span className="ml-2 text-white">{row.participant.project_name}</span>
                    <span className="ml-2 text-xs text-white/40">
                      {row.participant.team_name}
                    </span>
                  </div>
                  <span className="font-bold tabular-nums">{row.pct.toFixed(1)}점</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-white/40">아직 제출된 심사가 없습니다.</p>
          )}
        </div>
      </section>

      {/* audience full ranking */}
      <section className="card p-5">
        <h2 className="font-bold">관객 투표 전체 순위</h2>
        <ul className="mt-3 space-y-1.5">
          {audience.map((r, i) => (
            <li key={r.participant.id} className="flex items-center gap-3 text-sm">
              <span className="w-5 text-right text-white/40">{i + 1}</span>
              <span className="flex-1 truncate">{r.participant.project_name}</span>
              <span className="tabular-nums text-white/60">{r.votes}표</span>
            </li>
          ))}
        </ul>
      </section>

      {/* judge full ranking */}
      <section className="card overflow-x-auto p-5">
        <h2 className="font-bold">심사 점수 상세</h2>
        <table className="mt-3 w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-white/50">
              <th className="py-2 pr-2">#</th>
              <th className="py-2 pr-2">프로젝트</th>
              <th className="py-2 pr-2 text-center">심사</th>
              {judge.criteria.map((c) => (
                <th key={c.id} className="py-2 pr-2 text-center">
                  {c.label}
                  <span className="block text-xs font-normal text-white/30">
                    /{c.max_score}·×{Number(c.weight)}
                  </span>
                </th>
              ))}
              <th className="py-2 pl-2 text-right">종합</th>
            </tr>
          </thead>
          <tbody>
            {judge.rows.map((r, i) => (
              <tr key={r.participant.id} className="border-b border-white/5">
                <td className="py-2 pr-2 text-white/40">{i + 1}</td>
                <td className="py-2 pr-2">
                  <span className="font-medium">{r.participant.project_name}</span>
                  <span className="block text-xs text-white/40">
                    {r.participant.team_name}
                  </span>
                </td>
                <td className="py-2 pr-2 text-center text-white/60">{r.judgeCount}명</td>
                {judge.criteria.map((c) => (
                  <td key={c.id} className="py-2 pr-2 text-center tabular-nums text-white/70">
                    {r.perCriterion[c.id]?.toFixed(1) ?? "-"}
                  </td>
                ))}
                <td className="py-2 pl-2 text-right font-bold tabular-nums">
                  {r.pct.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {judgeRanked.length === 0 && (
          <p className="mt-3 text-sm text-white/40">제출된 심사가 아직 없습니다.</p>
        )}
      </section>
    </div>
  );
}
