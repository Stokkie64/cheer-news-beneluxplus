"use client";

/**
 * Leaflet map of club pins (Client Component).
 *
 * MUST be loaded via `dynamic(..., { ssr: false })` because Leaflet touches
 * `window` at import time. We avoid Leaflet's broken default icon URLs (they
 * 404 under a bundler) by building markers from inline SVG `divIcon`s, which
 * also lets us tint the selected/hovered pin with the spirit accent.
 *
 * Hover/select sync: hovering a pin calls `onHover`, clicking selects via
 * `onSelect`; the externally-controlled `hoveredClubId`/`selectedClubId` props
 * restyle the matching marker and pan the map to a club highlighted elsewhere
 * (e.g. from the agenda).
 */
import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { Globe, AtSign, Share2, Music2, MapPin, ArrowRight } from "lucide-react";
import "leaflet/dist/leaflet.css";
import type { MapClub } from "@/components/home/types";

const NL_CENTER: [number, number] = [52.2, 5.3];
const NL_ZOOM = 7;

/**
 * Theme Leaflet's tooltip/popup chrome with our design tokens. Injected once
 * (scoped by the `cheer-` class names we set on each Tooltip/Popup) so the
 * default white-box Leaflet styling doesn't clash with the surface/ink palette.
 */
const MAP_THEME_CSS = `
  .cheer-tooltip.leaflet-tooltip {
    background: var(--surface);
    color: var(--ink);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    padding: 4px 8px;
    font-weight: 600;
    font-size: 12px;
    line-height: 1.2;
    white-space: nowrap;
  }
  .cheer-tooltip .cheer-tooltip-city {
    display: block;
    color: var(--muted);
    font-weight: 500;
    font-size: 11px;
  }
  /* Selected pin's permanent label gets the accent treatment. */
  .cheer-tooltip--selected.leaflet-tooltip {
    background: var(--accent);
    border-color: var(--accent);
    color: #ffffff;
  }
  .cheer-tooltip--selected .cheer-tooltip-city {
    color: rgba(255, 255, 255, 0.85);
  }
  /* Neutralize Leaflet's directional tooltip arrow (we omit it for clarity). */
  .cheer-tooltip.leaflet-tooltip::before { display: none; }
`;

/** Build a teardrop pin as an inline-SVG divIcon, tinted by state. */
function pinIcon(state: "default" | "hover" | "selected"): L.DivIcon {
  const fill =
    state === "selected"
      ? "#ff2d6b"
      : state === "hover"
        ? "#0e7c7b"
        : "#17161b";
  const scale = state === "default" ? 1 : 1.18;
  const w = Math.round(26 * scale);
  const h = Math.round(34 * scale);
  const svg = `
    <svg width="${w}" height="${h}" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 0C5.82 0 0 5.82 0 13c0 9.2 11.1 19.7 12.2 20.7a1.2 1.2 0 0 0 1.6 0C14.9 32.7 26 22.2 26 13 26 5.82 20.18 0 13 0Z" fill="${fill}"/>
      <circle cx="13" cy="13" r="5" fill="#ffffff"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "cheer-pin",
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h + 6],
  });
}

/** Imperatively pans to a club selected/hovered from outside the map. */
function PanToHighlight({
  clubs,
  focusId,
}: {
  clubs: MapClub[];
  focusId: string | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!focusId) return;
    const club = clubs.find((c) => c.id === focusId);
    if (!club) return;
    map.panTo([club.lat, club.lng], { animate: true });
  }, [focusId, clubs, map]);
  return null;
}

interface MapProps {
  clubs: MapClub[];
  hoveredClubId: string | null;
  selectedClubId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
}

export default function Map({
  clubs,
  hoveredClubId,
  selectedClubId,
  onHover,
  onSelect,
}: MapProps) {
  // Memoize the three icon variants (cheap, but avoids re-creating per render).
  const icons = useMemo(
    () => ({
      default: pinIcon("default"),
      hover: pinIcon("hover"),
      selected: pinIcon("selected"),
    }),
    [],
  );

  // Focus = explicit selection wins over hover (used for panning).
  const focusId = selectedClubId ?? hoveredClubId;

  return (
    <>
      <style>{MAP_THEME_CSS}</style>
      <MapContainer
      center={NL_CENTER}
      zoom={NL_ZOOM}
      scrollWheelZoom
      className="h-full w-full bg-[var(--surface-2)]"
      // Keep the map below the sticky header (z-1000) and popups usable.
      style={{ zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <PanToHighlight clubs={clubs} focusId={focusId} />

      {clubs.map((club) => {
        const state =
          club.id === selectedClubId
            ? "selected"
            : club.id === hoveredClubId
              ? "hover"
              : "default";
        return (
          <ClubMarker
            key={club.id}
            club={club}
            icon={icons[state]}
            isSelected={club.id === selectedClubId}
            onHover={onHover}
            onSelect={onSelect}
          />
        );
      })}
      </MapContainer>
    </>
  );
}

function ClubMarker({
  club,
  icon,
  isSelected,
  onHover,
  onSelect,
}: {
  club: MapClub;
  icon: L.DivIcon;
  isSelected: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
}) {
  const markerRef = useRef<L.Marker>(null);

  // Leaflet doesn't re-key markers on icon prop change in react-leaflet v5
  // reliably for divIcons, so set it imperatively when it changes.
  useEffect(() => {
    markerRef.current?.setIcon(icon);
  }, [icon]);

  const socials: { href: string; label: string; Icon: typeof Globe }[] = [];
  if (club.websiteUrl)
    socials.push({ href: club.websiteUrl, label: "Website", Icon: Globe });
  if (club.instagramUrl)
    socials.push({ href: club.instagramUrl, label: "Instagram", Icon: AtSign });
  if (club.facebookUrl)
    socials.push({ href: club.facebookUrl, label: "Facebook", Icon: Share2 });
  if (club.tiktokUrl)
    socials.push({ href: club.tiktokUrl, label: "TikTok", Icon: Music2 });

  return (
    <Marker
      ref={markerRef}
      position={[club.lat, club.lng]}
      icon={icon}
      eventHandlers={{
        mouseover: () => onHover(club.id),
        mouseout: () => onHover(null),
        click: () => onSelect(club.id),
      }}
    >
      {/*
        Club identity label. The selected club's label is `permanent` so it
        stays readable during the pin↔agenda sync; all others show on hover.
        Re-keyed on selection so Leaflet rebuilds the tooltip with the right
        permanence/styling (it can't toggle `permanent` in place).
      */}
      <Tooltip
        key={isSelected ? "permanent" : "hover"}
        direction="top"
        offset={[0, -28]}
        opacity={1}
        permanent={isSelected}
        className={`cheer-tooltip${isSelected ? " cheer-tooltip--selected" : ""}`}
      >
        {club.name}
        <span className="cheer-tooltip-city">{club.city}</span>
      </Tooltip>

      <Popup>
        <div className="flex min-w-48 flex-col gap-1">
          <span className="font-display text-sm font-bold text-[var(--ink)]">
            {club.name}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]">
            <MapPin className="size-3" aria-hidden />
            {club.city}
          </span>
          <Link
            href={`/clubs/${club.slug}`}
            className="mt-2 inline-flex items-center justify-center gap-1 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          >
            Bekijk clubpagina
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
          {socials.length > 0 && (
            <div className="mt-2 flex items-center gap-3 border-t border-[var(--border)] pt-2">
              {socials.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${club.name} op ${label}`}
                  title={label}
                  className="text-[var(--muted)] hover:text-[var(--ink)]"
                >
                  <Icon className="size-4" aria-hidden />
                </a>
              ))}
            </div>
          )}
        </div>
      </Popup>
    </Marker>
  );
}
