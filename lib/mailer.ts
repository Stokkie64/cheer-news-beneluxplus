/**
 * Maintainer notification email (SERVER ONLY).
 *
 * Sends a "new submission" email to every address in ADMIN_EMAILS via Gmail
 * SMTP. Configured through env:
 *   - GMAIL_USER           — the Gmail address to send from / authenticate as
 *   - GMAIL_APP_PASSWORD   — a Gmail app password (requires 2FA on the account)
 *
 * Contract: if either env var is unset, `sendSubmissionNotification` is a no-op
 * that logs a warning — so dev / un-configured environments keep working. It
 * NEVER throws; callers can `await` it without risking the request.
 */
import "server-only";
import nodemailer from "nodemailer";
import { adminEmails } from "@/lib/auth";
import { SUBMISSION_KIND_LABEL } from "@/lib/submitSchema";
import type { SubmissionKind } from "@/lib/types";

export interface SubmissionNotification {
  kind: SubmissionKind;
  payload: Record<string, unknown>;
  submittedByEmail: string | null;
  id?: string;
}

/** Lazily build the transport; null when env is incomplete. */
function buildTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

/** Render the payload's key fields as "Label: value" lines (skips empties). */
function payloadLines(payload: Record<string, unknown>): string[] {
  return Object.entries(payload)
    .filter(([, val]) => val !== undefined && val !== null && String(val).trim() !== "")
    .map(([key, val]) => `${key}: ${String(val)}`);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Email each maintainer about a new submission. No-op (with warning) when Gmail
 * env is unset; swallows all errors so it can never fail the caller.
 */
export async function sendSubmissionNotification(
  submission: SubmissionNotification,
): Promise<void> {
  const transport = buildTransport();
  if (!transport) {
    console.warn(
      "[mailer] GMAIL_USER / GMAIL_APP_PASSWORD not set — skipping submission notification.",
    );
    return;
  }

  const recipients = adminEmails();
  if (recipients.length === 0) {
    console.warn("[mailer] ADMIN_EMAILS is empty — no one to notify.");
    return;
  }

  const kindLabel = SUBMISSION_KIND_LABEL[submission.kind] ?? submission.kind;
  const subject = `Nieuwe inzending: ${kindLabel} — Cheer News`;
  const submitter = submission.submittedByEmail ?? "onbekend";
  const lines = payloadLines(submission.payload);

  const text = [
    `Nieuwe inzending (${kindLabel}) op Cheer News BeneluxPlus.`,
    ``,
    `Type: ${kindLabel}`,
    `Ingezonden door: ${submitter}`,
    ``,
    `Gegevens:`,
    ...(lines.length ? lines.map((l) => `  ${l}`) : ["  (geen velden)"]),
    ``,
    `Bekijk in de review queue: /admin`,
  ].join("\n");

  const html = [
    `<p>Nieuwe inzending (<strong>${escapeHtml(kindLabel)}</strong>) op Cheer News BeneluxPlus.</p>`,
    `<p><strong>Type:</strong> ${escapeHtml(kindLabel)}<br/>`,
    `<strong>Ingezonden door:</strong> ${escapeHtml(submitter)}</p>`,
    `<p><strong>Gegevens:</strong></p>`,
    lines.length
      ? `<ul>${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>`
      : `<p>(geen velden)</p>`,
    `<p>Bekijk in de review queue: <code>/admin</code></p>`,
  ].join("\n");

  try {
    await transport.sendMail({
      from: process.env.GMAIL_USER,
      to: recipients.join(", "),
      subject,
      text,
      html,
    });
  } catch (err) {
    console.error("[mailer] failed to send submission notification:", err);
  }
}
