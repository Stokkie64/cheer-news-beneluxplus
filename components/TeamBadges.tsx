import { Badge } from "@/components/ui/Badge";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils";
import type { Level, Team, TeamSummary } from "@/lib/types";

/** Stable display order for levels (numeric tiers first, then named tiers). */
const LEVEL_ORDER: Level[] = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "elite",
  "prep",
  "recreational",
];

function sortLevels(levels: Iterable<Level>): Level[] {
  const present = new Set(levels);
  return LEVEL_ORDER.filter((l) => present.has(l));
}

interface TeamBadgesProps {
  /** Either denormalized summaries (club doc) or full team docs. */
  teams: TeamSummary[] | Team[];
  /** Active dictionary for the taxonomy labels + empty text. */
  t: Dictionary;
  /**
   * "levels" (default): one badge per distinct level — compact, for cards.
   * "full": one badge per distinct level+division+age combination.
   */
  variant?: "levels" | "full";
  /** Cap the number of badges; remainder collapses into a "+N" pill. */
  max?: number;
  className?: string;
}

/**
 * Renders a club's offerings as compact badges. Dedupes across teams so a club
 * with many same-level teams shows one badge per distinct value.
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
      ? sortLevels(teams.map((tm) => tm.level)).map((l) => t.level[l])
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

/** Distinct "Level · Division · Age" combinations, in a sensible order. */
function dedupeFullLabels(teams: TeamSummary[] | Team[], t: Dictionary): string[] {
  const seen = new Map<string, { level: Level; label: string }>();
  for (const tm of teams) {
    const key = `${tm.level}|${tm.division}|${tm.ageGroup}`;
    if (seen.has(key)) continue;
    seen.set(key, {
      level: tm.level,
      label: `${t.level[tm.level]} · ${t.division[tm.division]} · ${t.ageGroup[tm.ageGroup]}`,
    });
  }
  const order = sortLevels([...seen.values()].map((v) => v.level));
  const orderIndex = new Map(order.map((l, i) => [l, i]));
  return [...seen.values()]
    .sort(
      (a, b) =>
        (orderIndex.get(a.level) ?? 0) - (orderIndex.get(b.level) ?? 0) ||
        a.label.localeCompare(b.label),
    )
    .map((v) => v.label);
}
