import { Dumbbell, MapPin } from "lucide-react";
import { EmptyState } from "@/components/home/EmptyState";
import { formatNlDateTimeRange } from "@/components/clubs/dateFormat";
import type { OpenGymOccurrence } from "@/lib/types";

/** Upcoming open-gym occurrences (already expanded from RRULE), NL-formatted. */
export function OpenGymsList({
  occurrences,
}: {
  occurrences: OpenGymOccurrence[];
}) {
  if (occurrences.length === 0) {
    return (
      <EmptyState
        icon={Dumbbell}
        title="Nog geen open gyms bekend"
        hint="Terugkerende open-gym tijden verschijnen hier zodra ze bekend zijn."
      />
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-[var(--border)]">
      {occurrences.map((occ, i) => (
        <li
          key={`${occ.openGymId}:${i}`}
          className="py-3 first:pt-0 last:pb-0"
        >
          <p className="font-medium text-[var(--ink)]">
            {formatNlDateTimeRange(occ.startsAt, occ.endsAt)}
          </p>
          {occ.locationText && (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-[var(--muted)]">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{occ.locationText}</span>
            </p>
          )}
          {occ.notes && (
            <p className="mt-0.5 text-sm text-[var(--muted)]">{occ.notes}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
