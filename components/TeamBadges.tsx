import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { AgeGroup, Division, Level, Team, TeamSummary } from "@/lib/types";

/** NL display label per level. */
export const LEVEL_LABEL: Record<Level, string> = {
  "1": "Level 1",
  "2": "Level 2",
  "3": "Level 3",
  "4": "Level 4",
  "5": "Level 5",
  "6": "Level 6",
  elite: "Elite",
  prep: "Prep",
  recreational: "Recreational",
};

/** NL display label per division. */
export const DIVISION_LABEL: Record<Division, string> = {
  all_girl: "All Girl",
  coed: "Coed",
  all_boy: "All Boy",
};

/** NL display label per age group. */
export const AGE_GROUP_LABEL: Record<AgeGroup, string> = {
  mini: "Mini",
  youth: "Youth",
  junior: "Junior",
  senior: "Senior",
  open: "Open",
};

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
 * Renders a club's offerings as compact NL badges. Dedupes across teams so a
 * club with many same-level teams shows one badge per distinct value.
 */
export function TeamBadges({
  teams,
  variant = "levels",
  max,
  className,
}: TeamBadgesProps) {
  if (!teams || teams.length === 0) {
    return (
      <span className="text-xs text-[var(--muted)]">Nog geen teams bekend</span>
    );
  }

  const labels =
    variant === "levels"
      ? sortLevels(teams.map((t) => t.level)).map((l) => LEVEL_LABEL[l])
      : dedupeFullLabels(teams);

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
function dedupeFullLabels(teams: TeamSummary[] | Team[]): string[] {
  const seen = new Map<string, { level: Level; label: string }>();
  for (const t of teams) {
    const key = `${t.level}|${t.division}|${t.ageGroup}`;
    if (seen.has(key)) continue;
    seen.set(key, {
      level: t.level,
      label: `${LEVEL_LABEL[t.level]} · ${DIVISION_LABEL[t.division]} · ${AGE_GROUP_LABEL[t.ageGroup]}`,
    });
  }
  const order = sortLevels([...seen.values()].map((v) => v.level));
  const orderIndex = new Map(order.map((l, i) => [l, i]));
  return [...seen.values()]
    .sort(
      (a, b) =>
        (orderIndex.get(a.level) ?? 0) - (orderIndex.get(b.level) ?? 0) ||
        a.label.localeCompare(b.label, "nl"),
    )
    .map((v) => v.label);
}
