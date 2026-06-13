"use client";

/**
 * Front-page orchestrator (Client Component).
 *
 * Owns ALL interaction state shared between the map and the calendar:
 *  - `filters`              — client-side filtering over the in-memory dataset.
 *  - `hoveredClubId`        — transient hover highlight (map ⇄ agenda).
 *  - `selectedClubId`       — sticky selection (click a pin or an agenda entry).
 *  - `tab`                  — mobile-only Kaart/Agenda switch.
 *
 * SIGNATURE INTERACTION — pin ⇄ agenda sync:
 *   Both <Map> and <Calendar> receive `hoveredClubId`/`selectedClubId` plus
 *   `onHover`/`onSelect`. Hovering a pin sets `hoveredClubId`, which the
 *   calendar uses to ring that club's events and dim the rest; hovering an
 *   agenda entry reports its `clubId` back, which the map uses to enlarge/tint
 *   the matching pin and pan to it. Clicks promote to a sticky selection.
 *
 * The map is dynamically imported with `{ ssr: false }` because Leaflet needs
 * `window`.
 */
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Map as MapIcon, CalendarDays, Loader2 } from "lucide-react";
import { Calendar } from "@/components/Calendar";
import { Filters } from "@/components/Filters";
import { EmptyState } from "@/components/home/EmptyState";
import { cn } from "@/lib/utils";
import type { CalendarItem, MapClub, HomeFilters } from "@/components/home/types";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[var(--surface-2)]">
      <Loader2 className="size-5 animate-spin text-[var(--muted)]" aria-hidden />
    </div>
  ),
});

const EMPTY_FILTERS: HomeFilters = {
  types: new Set(),
  city: null,
  from: null,
  to: null,
  openGymsOnly: false,
};

/** ISO instant → yyyy-MM-dd (local day, for date-range comparison). */
function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export function HomeView({
  clubs,
  items,
}: {
  clubs: MapClub[];
  items: CalendarItem[];
}) {
  const [filters, setFilters] = useState<HomeFilters>(EMPTY_FILTERS);
  const [hoveredClubId, setHoveredClubId] = useState<string | null>(null);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [tab, setTab] = useState<"map" | "calendar">("map");

  // Cities for the dropdown — union of club cities and item cities.
  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const c of clubs) if (c.city) set.add(c.city);
    for (const it of items) if (it.city) set.add(it.city);
    return [...set].sort((a, b) => a.localeCompare(b, "nl"));
  }, [clubs, items]);

  // Apply filters to the agenda items (small dataset → recompute each render).
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (filters.openGymsOnly && !it.isOpenGym) return false;
      if (filters.types.size > 0 && !filters.types.has(it.type)) return false;
      if (filters.city && it.city !== filters.city) return false;
      const d = dayKey(it.startsAt);
      if (filters.from && d < filters.from) return false;
      if (filters.to && d > filters.to) return false;
      return true;
    });
  }, [items, filters]);

  // Filter map pins to the city filter (event-type/date filters don't apply to
  // clubs themselves, but the city filter does so the two panels stay coherent).
  const filteredClubs = useMemo(() => {
    if (!filters.city) return clubs;
    return clubs.filter((c) => c.city === filters.city);
  }, [clubs, filters.city]);

  // Toggle selection off when clicking the already-selected club.
  function handleSelect(id: string | null) {
    setSelectedClubId((prev) => (prev === id ? null : id));
  }

  const hasClubs = clubs.length > 0;
  const hasItems = items.length > 0;

  const mapPanel = hasClubs ? (
    <Map
      clubs={filteredClubs}
      hoveredClubId={hoveredClubId}
      selectedClubId={selectedClubId}
      onHover={setHoveredClubId}
      onSelect={handleSelect}
    />
  ) : (
    <EmptyState
      icon={MapIcon}
      title="Nog geen clubs op de kaart"
      hint="Zodra clubs met een locatie zijn toegevoegd, verschijnen ze hier als pins."
    />
  );

  const calendarPanel = hasItems ? (
    <div className="flex h-full flex-col">
      <Filters
        filters={filters}
        onChange={setFilters}
        cities={cities}
        resultCount={filteredItems.length}
      />
      <div className="min-h-0 flex-1">
        <Calendar
          items={filteredItems}
          view={tab === "calendar" ? "listMonth" : "dayGridMonth"}
          hoveredClubId={hoveredClubId}
          selectedClubId={selectedClubId}
          onHover={setHoveredClubId}
          onSelect={handleSelect}
        />
      </div>
    </div>
  ) : (
    <EmptyState
      icon={CalendarDays}
      title="Nog geen evenementen"
      hint="Wedstrijden, open gyms en clinics verschijnen hier zodra ze bekend zijn."
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <StyleOverrides />

      {/* Mobile tab switcher */}
      <div className="flex border-b border-[var(--border)] bg-[var(--surface)] md:hidden">
        <TabButton
          active={tab === "map"}
          onClick={() => setTab("map")}
          icon={<MapIcon className="size-4" aria-hidden />}
          label="Kaart"
        />
        <TabButton
          active={tab === "calendar"}
          onClick={() => setTab("calendar")}
          icon={<CalendarDays className="size-4" aria-hidden />}
          label="Agenda"
        />
      </div>

      {/* Split-view. Fills viewport under the 3.5rem sticky header. */}
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[45%_1fr]">
        {/* Map panel */}
        <section
          className={cn(
            "relative min-h-0 border-[var(--border)] md:border-r",
            "h-[calc(100dvh-3.5rem-3rem)] md:h-[calc(100dvh-3.5rem)]",
            tab === "map" ? "block" : "hidden md:block",
          )}
          aria-label="Kaart van cheerleadingclubs"
        >
          {mapPanel}
        </section>

        {/* Calendar / agenda panel */}
        <section
          className={cn(
            "min-h-0 bg-[var(--bg)]",
            "h-[calc(100dvh-3.5rem-3rem)] md:h-[calc(100dvh-3.5rem)]",
            tab === "calendar" ? "block" : "hidden md:block",
          )}
          aria-label="Agenda van evenementen"
        >
          {calendarPanel}
        </section>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-12 flex-1 items-center justify-center gap-2 text-sm font-semibold transition-colors",
        active
          ? "border-b-2 border-[var(--accent)] text-[var(--ink)]"
          : "border-b-2 border-transparent text-[var(--muted)]",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

/**
 * Scoped style overrides for FullCalendar + the hover/select highlight. We
 * cannot edit globals.css, so inject them here (scoped by `.cheer-calendar` and
 * the focus/dim event classes set in Calendar.tsx). Tokens reference the same
 * CSS variables as the rest of the app.
 */
function StyleOverrides() {
  return (
    <style>{`
      .cheer-calendar { --fc-border-color: var(--border); --fc-page-bg-color: transparent; --fc-neutral-bg-color: var(--surface-2); --fc-today-bg-color: var(--accent-soft); }
      .cheer-calendar .fc { font-family: var(--font-sans), system-ui, sans-serif; }
      .cheer-calendar .fc .fc-toolbar-title { font-family: var(--font-display), system-ui, sans-serif; font-size: 1.05rem; font-weight: 700; letter-spacing: -0.01em; color: var(--ink); }
      .cheer-calendar .fc .fc-button { background: var(--surface); border: 1px solid var(--border); color: var(--ink); text-transform: none; font-weight: 600; font-size: 0.78rem; padding: 0.3rem 0.6rem; box-shadow: none; }
      .cheer-calendar .fc .fc-button:hover { background: var(--surface-2); }
      .cheer-calendar .fc .fc-button-primary:not(:disabled).fc-button-active,
      .cheer-calendar .fc .fc-button-primary:not(:disabled):active { background: var(--accent); border-color: var(--accent); color: var(--accent-fg); }
      .cheer-calendar .fc .fc-button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
      .cheer-calendar .fc .fc-col-header-cell-cushion,
      .cheer-calendar .fc .fc-daygrid-day-number { color: var(--muted); font-size: 0.75rem; text-decoration: none; }
      .cheer-calendar .fc .fc-daygrid-day.fc-day-today { background: var(--accent-soft); }
      .cheer-calendar .fc .fc-event { cursor: pointer; border-radius: 6px; border: none; transition: opacity 0.15s, box-shadow 0.15s, transform 0.15s; }
      .cheer-calendar .fc .fc-list-event:hover td { background: var(--surface-2); }
      .cheer-calendar .fc-event.cheer-event-dim { opacity: 0.28; }
      .cheer-calendar .fc-event.cheer-event-focus { box-shadow: 0 0 0 2px var(--accent); transform: translateY(-1px); z-index: 5; }
      .cheer-calendar .fc .fc-list-empty,
      .cheer-calendar .fc .fc-daygrid-body { background: transparent; }
      /* Leaflet popup chrome → match app surfaces. */
      .leaflet-popup-content-wrapper { border-radius: var(--radius); box-shadow: var(--shadow-md); }
      .leaflet-popup-content { margin: 0.6rem 0.75rem; }
      .leaflet-container a.leaflet-popup-close-button { color: var(--muted); }
      .cheer-pin { background: transparent; border: none; filter: drop-shadow(0 1px 2px rgb(23 22 27 / 0.25)); }
    `}</style>
  );
}
