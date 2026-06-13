/**
 * Zod schemas for public submissions (shared server + client).
 *
 * One schema per `SubmissionKind` payload, combined into a discriminated union
 * keyed on `kind`. The server (`/api/submit`) validates the parsed JSON body
 * against `submissionInputSchema`; the client form uses the same schemas /
 * inferred types so the contract can't drift.
 *
 * Kept dependency-light: only `zod` (v4). No imports from server-only modules
 * so this is safe to import from a Client Component.
 */
import { z } from "zod";
import type { SubmissionKind } from "@/lib/types";

// ---- Reusable field primitives ----

const trimmedString = z.string().trim();
const requiredString = (label: string, max = 200) =>
  trimmedString.min(1, `${label} is verplicht`).max(max, `${label} is te lang`);

const optionalString = (max = 2000) =>
  trimmedString.max(max, "Te lang").optional().or(z.literal("")).transform((v) => v || undefined);

/** Optional URL: accepts empty string (→ undefined) or a valid http(s) URL. */
const optionalUrl = z
  .string()
  .trim()
  .max(500, "URL is te lang")
  .url("Voer een geldige URL in (incl. https://)")
  .optional()
  .or(z.literal(""))
  .transform((v) => v || undefined);

/** The submission kinds, mirrored from `SubmissionKind` for the UI. */
export const SUBMISSION_KINDS = ["event", "gym", "club", "correction"] as const;

const EVENT_TYPES = [
  "competition",
  "open_gym",
  "clinic",
  "tryout",
  "showcase",
  "training",
  "other",
] as const;

/** Contact email is optional everywhere but validated when present. */
const contactEmail = z
  .string()
  .trim()
  .email("Voer een geldig e-mailadres in")
  .optional()
  .or(z.literal(""))
  .transform((v) => v || undefined);

// ---- Per-kind payload schemas ----

export const eventPayloadSchema = z.object({
  kind: z.literal("event"),
  title: requiredString("Titel"),
  type: z.enum(EVENT_TYPES),
  /** Local date, "YYYY-MM-DD" (from <input type="date">). */
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Kies een geldige datum"),
  /** Local time, "HH:mm" (optional; from <input type="time">). */
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Kies een geldige tijd")
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  location: optionalString(300),
  clubName: optionalString(200),
  url: optionalUrl,
  description: optionalString(2000),
  contactEmail,
});

export const gymPayloadSchema = z.object({
  kind: z.literal("gym"),
  clubName: requiredString("Naam van de club"),
  /** Recurring open-gym time description, free text (NL-first form). */
  schedule: requiredString("Dag en tijd", 300),
  location: optionalString(300),
  city: optionalString(120),
  url: optionalUrl,
  notes: optionalString(2000),
  contactEmail,
});

export const clubPayloadSchema = z.object({
  kind: z.literal("club"),
  name: requiredString("Naam"),
  city: requiredString("Plaats", 120),
  website: optionalUrl,
  instagram: optionalUrl,
  facebook: optionalUrl,
  tiktok: optionalUrl,
  blurb: optionalString(1000),
  contactEmail,
});

export const correctionPayloadSchema = z.object({
  kind: z.literal("correction"),
  /** Free-text description of what's wrong or missing (required). */
  description: trimmedString
    .min(5, "Geef een korte omschrijving (minstens 5 tekens)")
    .max(4000, "Omschrijving is te lang"),
  /** Optional link to the page/club/item the correction is about. */
  url: optionalUrl,
});

/** Discriminated union over `kind` — what `/api/submit` validates. */
export const submissionInputSchema = z.discriminatedUnion("kind", [
  eventPayloadSchema,
  gymPayloadSchema,
  clubPayloadSchema,
  correctionPayloadSchema,
]);

// ---- Inferred TS types ----

export type EventPayload = z.infer<typeof eventPayloadSchema>;
export type GymPayload = z.infer<typeof gymPayloadSchema>;
export type ClubPayload = z.infer<typeof clubPayloadSchema>;
export type CorrectionPayload = z.infer<typeof correctionPayloadSchema>;
export type SubmissionInput = z.infer<typeof submissionInputSchema>;

// Compile-time guard: the union's `kind` values must equal `SubmissionKind`.
type _AssertKinds = SubmissionInput["kind"] extends SubmissionKind
  ? SubmissionKind extends SubmissionInput["kind"]
    ? true
    : never
  : never;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _assertKinds: _AssertKinds = true;

/** Dutch labels per kind for the form picker. */
export const SUBMISSION_KIND_LABEL: Record<SubmissionKind, string> = {
  event: "Evenement",
  gym: "Open gym",
  club: "Club",
  correction: "Er klopt iets niet / iets ontbreekt",
};
