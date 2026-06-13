import { formatInTimeZone } from "date-fns-tz";
import { nl } from "date-fns/locale";

const TZ = "Europe/Amsterdam";

/** "ma 13 jun 2026" — short NL date in Amsterdam time. */
export function formatNlDate(iso: string): string {
  return formatInTimeZone(new Date(iso), TZ, "eee d MMM yyyy", { locale: nl });
}

/** "19:00" — NL wall-clock time in Amsterdam. */
export function formatNlTime(iso: string): string {
  return formatInTimeZone(new Date(iso), TZ, "HH:mm", { locale: nl });
}

/** "ma 13 jun 2026 · 19:00–21:00" (end optional). */
export function formatNlDateTimeRange(
  startIso: string,
  endIso: string | null,
): string {
  const date = formatNlDate(startIso);
  const start = formatNlTime(startIso);
  if (!endIso) return `${date} · ${start}`;
  return `${date} · ${start}–${formatNlTime(endIso)}`;
}
