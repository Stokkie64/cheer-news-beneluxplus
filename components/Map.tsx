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
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Globe, AtSign, Share2, MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";
import type { MapClub } from "@/components/home/types";

const NL_CENTER: [number, number] = [52.2, 5.3];
const NL_ZOOM = 7;

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
            onHover={onHover}
            onSelect={onSelect}
          />
        );
      })}
    </MapContainer>
  );
}

function ClubMarker({
  club,
  icon,
  onHover,
  onSelect,
}: {
  club: MapClub;
  icon: L.DivIcon;
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
      <Popup>
        <div className="flex min-w-44 flex-col gap-1">
          <span className="font-display text-sm font-bold text-[var(--ink)]">
            {club.name}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]">
            <MapPin className="size-3" aria-hidden />
            {club.city}
          </span>
          <Link
            href={`/clubs/${club.slug}`}
            className="mt-1 text-xs font-semibold text-[var(--accent)] hover:underline"
          >
            Bekijk clubprofiel →
          </Link>
          {socials.length > 0 && (
            <div className="mt-1 flex items-center gap-2">
              {socials.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
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
