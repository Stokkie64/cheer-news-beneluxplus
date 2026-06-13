/**
 * Club directory (Server Component).
 *
 * Loads all active clubs and hands them to the `ClubGrid` client component,
 * which owns in-memory search + faceted filtering. Firestore may be empty or
 * unreachable in dev, so the read is wrapped and degrades to an empty grid.
 */
import type { Metadata } from "next";
import { getClubs } from "@/lib/queries";
import type { ClubClient } from "@/lib/types";
import { ClubGrid } from "@/components/ClubGrid";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Clubgids",
  description:
    "Alle cheerleadingclubs in Nederland: zoek op naam of plaats en filter op niveau, divisie en leeftijdscategorie.",
};

export default async function ClubsPage() {
  let clubs: ClubClient[] = [];
  try {
    clubs = await getClubs();
  } catch (err) {
    console.error("[clubs] data load failed, rendering empty state:", err);
    clubs = [];
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:py-10">
      <header className="mb-6 max-w-2xl">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-[var(--ink)] sm:text-4xl">
          Clubgids
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          Vind cheerleadingclubs in heel Nederland. Zoek op naam of plaats en
          filter op niveau, divisie en leeftijdscategorie.
        </p>
      </header>

      <ClubGrid clubs={clubs} />
    </div>
  );
}
