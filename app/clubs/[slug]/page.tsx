/**
 * Club profile (Server Component, dynamic route).
 *
 * Loads the club by slug (→ notFound on miss), then its teams, upcoming
 * events, and open gyms in parallel. Open gyms are expanded into concrete
 * occurrences over a 90-day window. All reads are wrapped so a missing/empty
 * Firestore degrades to intentional empty states rather than crashing.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  AtSign,
  CalendarDays,
  Dumbbell,
  Globe,
  MapPin,
  Music2,
  Share2,
  Users,
} from "lucide-react";
import {
  getClubBySlug,
  getClubTeams,
  getPublishedEvents,
  getPublishedOpenGyms,
} from "@/lib/queries";
import { expandOpenGym } from "@/lib/recurrence";
import type {
  ClubClient,
  EventClient,
  OpenGymOccurrence,
  Team,
} from "@/lib/types";
import { TeamBadges } from "@/components/TeamBadges";
import { EventsList } from "@/components/clubs/EventsList";
import { OpenGymsList } from "@/components/clubs/OpenGymsList";

export const dynamic = "force-dynamic";

const HORIZON_DAYS = 90;

function initials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  let club: ClubClient | null = null;
  try {
    club = await getClubBySlug(slug);
  } catch {
    club = null;
  }
  if (!club) {
    return { title: "Club niet gevonden" };
  }
  const title = club.city ? `${club.name} — ${club.city}` : club.name;
  const description =
    club.blurb ??
    `Cheerleadingclub ${club.name}${club.city ? ` uit ${club.city}` : ""}: teams, evenementen en open gyms.`;
  return { title, description };
}

export default async function ClubProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let club: ClubClient | null = null;
  try {
    club = await getClubBySlug(slug);
  } catch (err) {
    console.error("[club] lookup failed:", err);
    club = null;
  }
  if (!club) notFound();

  const now = new Date();
  const horizon = new Date(now.getTime() + HORIZON_DAYS * 24 * 60 * 60 * 1000);

  let teams: Team[] = [];
  let events: EventClient[] = [];
  let gymOccurrences: OpenGymOccurrence[] = [];

  try {
    const [teamList, eventList, gymList] = await Promise.all([
      getClubTeams(club.id),
      getPublishedEvents({ clubId: club.id, from: now }),
      getPublishedOpenGyms({ clubId: club.id }),
    ]);
    teams = teamList.filter((t) => t.status === "active");
    events = eventList;
    gymOccurrences = gymList
      .flatMap((gym) => expandOpenGym(gym, now, horizon))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  } catch (err) {
    console.error("[club] related data load failed:", err);
  }

  // Prefer full team docs; fall back to the denormalized summary on the club.
  const teamData = teams.length > 0 ? teams : club.teamsSummary;
  const osmUrl =
    club.lat != null && club.lng != null
      ? `https://www.openstreetmap.org/?mlat=${club.lat}&mlon=${club.lng}#map=15/${club.lat}/${club.lng}`
      : club.address
        ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${club.address}, ${club.city}`)}`
        : null;

  const socials = [
    club.websiteUrl && {
      href: club.websiteUrl,
      label: "Website",
      icon: Globe,
    },
    club.instagramUrl && {
      href: club.instagramUrl,
      label: "Instagram",
      icon: AtSign,
    },
    club.tiktokUrl && {
      href: club.tiktokUrl,
      label: "TikTok",
      icon: Music2,
    },
    club.facebookUrl && {
      href: club.facebookUrl,
      label: "Facebook",
      icon: Share2,
    },
  ].filter(Boolean) as { href: string; label: string; icon: typeof Globe }[];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
      <nav className="mb-6 text-sm">
        <Link
          href="/clubs"
          className="text-[var(--muted)] hover:text-[var(--ink)]"
        >
          ← Terug naar clubgids
        </Link>
      </nav>

      {/* Header */}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
        {club.logoUrl ? (
          <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={club.logoUrl}
              alt=""
              className="size-full object-contain"
            />
          </span>
        ) : (
          <span
            aria-hidden
            className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-soft)] font-display text-xl font-extrabold text-[var(--accent)]"
          >
            {initials(club.name)}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-[var(--ink)]">
            {club.name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--muted)]">
            {club.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden />
                {club.city}
              </span>
            )}
            {club.foundedYear && <span>Opgericht in {club.foundedYear}</span>}
          </div>

          {socials.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {socials.map(({ href, label, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className="inline-flex size-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
                >
                  <Icon className="size-4" aria-hidden />
                </a>
              ))}
            </div>
          )}

          {club.blurb && (
            <p className="mt-4 max-w-2xl text-[var(--ink)]">{club.blurb}</p>
          )}
        </div>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_18rem]">
        {/* Main column */}
        <div className="flex flex-col gap-10">
          <Section icon={Users} title="Teams">
            <TeamBadges teams={teamData} variant="full" />
          </Section>

          <Section icon={CalendarDays} title="Aankomende evenementen">
            <EventsList events={events} />
          </Section>

          <Section icon={Dumbbell} title="Open gyms">
            <OpenGymsList occurrences={gymOccurrences} />
          </Section>
        </div>

        {/* Sidebar: location */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Section icon={MapPin} title="Locatie">
            {club.address || club.city ? (
              <address className="not-italic text-sm text-[var(--ink)]">
                {club.address && <span className="block">{club.address}</span>}
                {club.city && (
                  <span className="block text-[var(--muted)]">{club.city}</span>
                )}
              </address>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Locatie nog niet bekend
              </p>
            )}
            {osmUrl && (
              <a
                href={osmUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--secondary)] hover:underline"
              >
                <MapPin className="size-3.5" aria-hidden />
                Bekijk op de kaart
              </a>
            )}
          </Section>
        </aside>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Globe;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-[var(--ink)]">
        <Icon className="size-4.5 text-[var(--muted)]" aria-hidden />
        {title}
      </h2>
      {children}
    </section>
  );
}
