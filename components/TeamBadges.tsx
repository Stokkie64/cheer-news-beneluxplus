import { Badge } from "@/components/ui/Badge";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";
import type { DanceStyle, Team, TeamSummary } from "@/lib/types";

type TeamLike = TeamSummary | Team;

/** Stable display order for performance-cheer dance styles. */
const DANCE_ORDER: DanceStyle[] = [
  "pom",
  "pom_doubles",
  "hip_hop",
  "hip_hop_doubles",
  "jazz",
  "kick",
];

/**
 * Resolve a team to a single classification token. A team's headline label is no
 * longer always its level: performance-cheer teams show their dance style, cheer
 * teams show their numeric level (rendered as the ICU word, e.g. "Median (L3)"),
 * and cheer teams with no level (prep/recreational) show their tier. Returns null
 * when there's nothing meaningful to show. `sort` orders cheer levels 1→7 first,
 * then prep/recreational, then performance-cheer styles.
 */
function classifyTeam(
  tm: TeamLike,
  t: Dictionary,
): { sort: number; label: string } | null {
  const discipline = tm.discipline ?? "cheer";
  if (discipline === "performance_cheer") {
    const style = tm.danceStyle ?? null;
    const idx = style ? DANCE_ORDER.indexOf(style) : -1;
    return {
      sort: 300 + (idx < 0 ? DANCE_ORDER.length : idx),
      label: style ? t.danceStyle[style] : t.discipline.performance_cheer,
    };
  }
  if (tm.level != null) {
    return { sort: Number(tm.level), label: t.level[tm.level] };
  }
  const tier = tm.tier ?? "competition";
  if (tier === "prep") return { sort: 200, label: t.tier.prep };
  if (tier === "recreational") return { sort: 201, label: t.tier.recreational };
  return null; // cheer + competition with no level: data anomaly, nothing to show
}

interface TeamBadgesProps {
  /** Either denormalized summaries (club doc) or full team docs. */
  teams: TeamSummary[] | Team[];
  /** Active dictionary for the taxonomy labels + empty text. */
  t: Dictionary;
  /**
   * "levels" (default): one badge per distinct classification token — compact,
   * for cards. "full": one badge per distinct token+division+age combination.
   */
  variant?: "levels" | "full";
  /** Cap the number of badges; remainder collapses into a "+N" pill. */
  max?: number;
  className?: string;
}

/**
 * Renders a club's offerings as compact badges. Dedupes across teams so a club
 * with many same-classification teams shows one badge per distinct value.
 */
export function TeamBadges({
  teams,
  t,
  variant = "levels",
  max,
  className,
}: TeamBadgesProps) {
  if (!teams || teams.length === 0) {
    return (
      <span className="text-xs text-[var(--muted)]">{t.clubs.noTeams}</span>
    );
  }

  const labels =
    variant === "levels"
      ? dedupeTokenLabels(teams, t)
      : dedupeFullLabels(teams, t);

  const shown = max != null ? labels.slice(0, max) : labels;
  const overflow = labels.length - shown.length;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {shown.map((label) => (
        <Badge key={label}>{label}</Badge>
      ))}
      {overflow > 0 && (
        <Badge className="text-[var(--muted)]">+{overflow}</Badge>
      )}
    </div>
  );
}

/** Distinct classification tokens (level / style / tier), in sorted order. */
function dedupeTokenLabels(teams: TeamLike[], t: Dictionary): string[] {
  const seen = new Map<string, number>(); // label -> sort weight
  for (const tm of teams) {
    const tok = classifyTeam(tm, t);
    if (!tok || seen.has(tok.label)) continue;
    seen.set(tok.label, tok.sort);
  }
  return [...seen.entries()]
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
    .map(([label]) => label);
}

/** Distinct "Token · Division · Age" combinations, in a sensible order. */
function dedupeFullLabels(teams: TeamLike[], t: Dictionary): string[] {
  const seen = new Map<string, { sort: number; label: string }>();
  for (const tm of teams) {
    const tok = classifyTeam(tm, t);
    if (!tok) continue;
    const key = `${tok.label}|${tm.division}|${tm.ageGroup}`;
    if (seen.has(key)) continue;
    seen.set(key, {
      sort: tok.sort,
      label: `${tok.label} · ${t.division[tm.division]} · ${t.ageGroup[tm.ageGroup]}`,
    });
  }
  return [...seen.values()]
    .sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label))
    .map((v) => v.label);
}
