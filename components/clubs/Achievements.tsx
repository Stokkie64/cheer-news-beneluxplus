import { Trophy } from "lucide-react";

/**
 * Notable club results as a Trophy-marked list (e.g. "NK 2024 — 1st place
 * Senior Coed"). Renders nothing when empty — the caller gates the section.
 */
export function Achievements({ achievements }: { achievements: string[] }) {
  if (achievements.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2.5">
      {achievements.map((item, i) => (
        <li key={`${item}:${i}`} className="flex items-start gap-2.5">
          <Trophy
            className="mt-0.5 size-4 shrink-0 text-[var(--accent)]"
            aria-hidden
          />
          <span className="text-sm text-[var(--ink)]">{item}</span>
        </li>
      ))}
    </ul>
  );
}
