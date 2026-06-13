"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { clientAuth } from "@/lib/firebase";

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * Renders an "Admin" nav link ONLY when the signed-in Google account is an
 * allowlisted admin. The /admin page + API still enforce the allowlist
 * server-side; this just hides the link from everyone else.
 */
export function AdminNavLink() {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(
    () =>
      onAuthStateChanged(clientAuth, (u) => {
        setIsAdmin(!!u?.email && ADMIN_EMAILS.includes(u.email.toLowerCase()));
      }),
    [],
  );
  if (!isAdmin) return null;
  return (
    <Link
      href="/admin"
      className="rounded-full px-3 py-1.5 font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)]"
    >
      Admin
    </Link>
  );
}
