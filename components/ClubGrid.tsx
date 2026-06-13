"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { ClubCard } from "@/components/ClubCard";
import { EmptyState } from "@/components/home/EmptyState";
import { Users } from "lucide-react";
import {
  AGE_GROUP_LABEL,
  DIVISION_LABEL,
  LEVEL_LABEL,
} from "@/components/TeamBadges";
import type { AgeGroup, ClubClient, Division, Level } from "@/lib/types";
import { cn } from "@/lib/utils";

const LEVEL_OPTIONS: Level[] = [
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
const DIVISION_OPTIONS: Division[] = ["all_girl", "coed", "all_boy"];
const AGE_OPTIONS: AgeGroup[] = ["mini", "youth", "junior", "senior", "open"];

interface ClubGridProps {
  clubs: ClubClient[];
}

/**
 * Searchable, filterable directory grid. All filtering is in-memory over the
 * server-provided list: free-text on name/city plus level / division / age /
 * province facets (province derived from each club's `region`).
 */
export function ClubGrid({ clubs }: ClubGridProps) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<Level | "">("");
  const [division, setDivision] = useState<Division | "">("");
  const [age, setAge] = useState<AgeGroup | "">("");
  const [province, setProvince] = useState("");

  // Provinces present in the dataset, sorted NL-style for the dropdown.
  const provinces = useMemo(
    () =>
      [
        ...new Set(
          clubs.map((c) => c.region).filter((r): r is string => Boolean(r)),
        ),
      ].sort((a, b) => a.localeCompare(b, "nl")),
    [clubs],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clubs.filter((c) => {
      if (q) {
        const haystack = `${c.name} ${c.city}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (province && c.region !== province) return false;
      const summary = c.teamsSummary ?? [];
      if (level && !summary.some((t) => t.level === level)) return false;
      if (division && !summary.some((t) => t.division === division))
        return false;
      if (age && !summary.some((t) => t.ageGroup === age)) return false;
      return true;
    });
  }, [clubs, query, province, level, division, age]);

  const hasActive =
    query !== "" ||
    level !== "" ||
    division !== "" ||
    age !== "" ||
    province !== "";

  function reset() {
    setQuery("");
    setLevel("");
    setDivision("");
    setAge("");
    setProvince("");
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Search */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zoek op clubnaam of plaats…"
          aria-label="Zoek clubs"
          className="h-11 w-full rounded-full border border-[var(--border)] bg-[var(--surface)] pl-10 pr-4 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)]">
          <SlidersHorizontal className="size-4" aria-hidden />
          Filter
        </span>

        <FilterSelect
          label="Niveau"
          value={level}
          onChange={(v) => setLevel(v as Level | "")}
          options={LEVEL_OPTIONS.map((l) => [l, LEVEL_LABEL[l]])}
        />
        <FilterSelect
          label="Divisie"
          value={division}
          onChange={(v) => setDivision(v as Division | "")}
          options={DIVISION_OPTIONS.map((d) => [d, DIVISION_LABEL[d]])}
        />
        <FilterSelect
          label="Leeftijd"
          value={age}
          onChange={(v) => setAge(v as AgeGroup | "")}
          options={AGE_OPTIONS.map((a) => [a, AGE_GROUP_LABEL[a]])}
        />
        <FilterSelect
          label="Provincie"
          value={province}
          onChange={setProvince}
          options={provinces.map((p) => [p, p])}
        />

        {hasActive && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"
          >
            <X className="size-3" aria-hidden />
            Wissen
          </button>
        )}
      </div>

      {/* Result count */}
      <p className="text-sm text-[var(--muted)]" aria-live="polite">
        <span className="font-semibold tabular-nums text-[var(--ink)]">
          {filtered.length}
        </span>{" "}
        {filtered.length === 1 ? "club" : "clubs"}
        {hasActive && clubs.length !== filtered.length
          ? ` van ${clubs.length}`
          : ""}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border)]">
          <EmptyState
            icon={Users}
            title={
              clubs.length === 0
                ? "Nog geen clubs bekend"
                : "Geen clubs gevonden"
            }
            hint={
              clubs.length === 0
                ? "Zodra clubs zijn toegevoegd verschijnen ze hier."
                : "Pas je zoekopdracht of filters aan."
            }
          />
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((club) => (
            <li key={club.id}>
              <ClubCard club={club} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  const active = value !== "";
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className={cn(
        "h-9 rounded-full border px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
        active
          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]"
          : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink)]",
      )}
    >
      <option value="">{label}: alle</option>
      {options.map(([val, lbl]) => (
        <option key={val} value={val}>
          {lbl}
        </option>
      ))}
    </select>
  );
}
