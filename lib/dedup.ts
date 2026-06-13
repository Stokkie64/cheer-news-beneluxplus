/**
 * Deduplication of extracted events (pure functions).
 *
 * The same competition is often listed by both a federation source and a club
 * page, with slightly different titles. We cluster those into one canonical
 * event and assign a stable `canonicalEventId`.
 *
 * Match rule (`isSameEvent`): same calendar day (Europe/Amsterdam) AND
 * (geo proximity within ~500m OR same normalized location text) AND
 * title similarity >= ~0.6 (token Dice coefficient).
 */
import { createHash } from "node:crypto";
import { formatInTimeZone } from "date-fns-tz";
import type { ExtractedEvent } from "@/lib/types";

const TZ = "Europe/Amsterdam";
const TITLE_SIM_THRESHOLD = 0.6;
const PROXIMITY_METERS = 500;

// ---- normalization ----

/** Lowercase, strip diacritics + punctuation, collapse whitespace. */
export function normalizeText(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining marks
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tokenize normalized text into a set of word tokens. */
function tokenSet(input: string | null | undefined): Set<string> {
  const norm = normalizeText(input);
  if (!norm) return new Set();
  return new Set(norm.split(" ").filter((t) => t.length > 0));
}

/** Local (Europe/Amsterdam) calendar-day key YYYY-MM-DD for an event start. */
export function eventDayKey(e: ExtractedEvent): string {
  const d = new Date(e.start);
  if (!Number.isFinite(d.getTime())) return "invalid-date";
  return formatInTimeZone(d, TZ, "yyyy-MM-dd");
}

/**
 * Token Dice similarity in [0,1]: 2*|A∩B| / (|A|+|B|).
 * Returns 0 when either side is empty.
 */
export function titleSimilarity(a: string, b: string): number {
  const sa = tokenSet(a);
  const sb = tokenSet(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  return (2 * inter) / (sa.size + sb.size);
}

// ---- geo ----

/** Haversine distance in meters between two lat/lng points. */
function haversineMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function hasGeo(e: ExtractedEvent): boolean {
  return (
    typeof e.location.lat === "number" &&
    typeof e.location.lng === "number" &&
    Number.isFinite(e.location.lat) &&
    Number.isFinite(e.location.lng)
  );
}

/** Same place: geo within ~500m, OR matching normalized location text. */
function sameLocation(a: ExtractedEvent, b: ExtractedEvent): boolean {
  if (hasGeo(a) && hasGeo(b)) {
    const dist = haversineMeters(
      a.location.lat as number,
      a.location.lng as number,
      b.location.lat as number,
      b.location.lng as number
    );
    if (dist <= PROXIMITY_METERS) return true;
  }
  const an = normalizeText(a.location.name) || normalizeText(a.location.address);
  const bn = normalizeText(b.location.name) || normalizeText(b.location.address);
  if (an && bn && an === bn) return true;
  return false;
}

/**
 * True when two events are the same real-world event:
 * same local calendar day AND same location AND similar title.
 */
export function isSameEvent(a: ExtractedEvent, b: ExtractedEvent): boolean {
  if (eventDayKey(a) !== eventDayKey(b)) return false;
  if (!sameLocation(a, b)) return false;
  return titleSimilarity(a.title, b.title) >= TITLE_SIM_THRESHOLD;
}

/**
 * Canonical match key for quick same-bucket grouping (day only). Full identity
 * still requires `isSameEvent`. Exposed for callers that want a coarse key.
 */
export function eventMatchKey(e: ExtractedEvent): string {
  const loc = normalizeText(e.location.name) || normalizeText(e.location.address);
  return `${eventDayKey(e)}|${loc}`;
}

/** Stable canonical id for a cluster, hashed from its representative. */
function canonicalId(rep: ExtractedEvent): string {
  const loc =
    normalizeText(rep.location.name) ||
    normalizeText(rep.location.address) ||
    "";
  const basis = `${eventDayKey(rep)}|${loc}|${normalizeText(rep.title)}`;
  return createHash("sha256").update(basis).digest("hex").slice(0, 24);
}

/**
 * Pick a cluster representative deterministically: highest confidence, then
 * longest title (more descriptive), then lexicographically smallest title.
 */
function pickRepresentative(members: ExtractedEvent[]): ExtractedEvent {
  return [...members].sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    const la = a.title?.length ?? 0;
    const lb = b.title?.length ?? 0;
    if (lb !== la) return lb - la;
    return (a.title ?? "").localeCompare(b.title ?? "");
  })[0];
}

/**
 * Cluster duplicate events and assign each cluster a stable canonicalEventId.
 *
 * Single-linkage clustering via `isSameEvent`: an event joins the first
 * existing cluster any of whose members it matches.
 */
export function dedupeEvents(
  events: ExtractedEvent[]
): { canonicalEventId: string; members: ExtractedEvent[] }[] {
  const clusters: ExtractedEvent[][] = [];

  for (const e of events) {
    let placed = false;
    for (const cluster of clusters) {
      if (cluster.some((m) => isSameEvent(m, e))) {
        cluster.push(e);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push([e]);
  }

  return clusters.map((members) => {
    const rep = pickRepresentative(members);
    return { canonicalEventId: canonicalId(rep), members };
  });
}
