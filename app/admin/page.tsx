/**
 * Admin review queue (Client page).
 *
 * Firebase Auth (email/password) gates access. After sign-in we take the user's
 * ID token and call /api/admin/review with `Authorization: Bearer <token>`;
 * the server re-verifies the token AND checks the email allowlist, so the
 * client gate is convenience only — the server is the real boundary.
 */
"use client";

import * as React from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { LogOut, Loader2 } from "lucide-react";
import { clientAuth } from "@/lib/firebase";
import { Button } from "@/components/ui/Button";
import { ReviewQueue } from "@/components/admin/ReviewQueue";

export default function AdminPage() {
  const [user, setUser] = React.useState<User | null>(null);
  const [authReady, setAuthReady] = React.useState(false);

  React.useEffect(() => {
    const unsub = onAuthStateChanged(clientAuth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  if (!authReady) {
    return (
      <main className="mx-auto flex max-w-md items-center justify-center px-4 py-24">
        <Loader2 className="size-6 animate-spin text-[var(--muted)]" aria-hidden />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-sm px-4 py-16">
        <SignInForm />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Review queue
          </h1>
          <p className="text-sm text-[var(--muted)]">{user.email}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => signOut(clientAuth)}>
          <LogOut className="size-4" aria-hidden /> Uitloggen
        </Button>
      </div>
      <ReviewQueue user={user} />
    </main>
  );
}

function SignInForm() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(clientAuth, email.trim(), password);
    } catch (err) {
      // Don't leak which factor was wrong; also covers "auth not configured".
      console.error("[admin] sign-in failed:", err);
      setError("Inloggen mislukt. Controleer je e-mailadres en wachtwoord.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "h-11 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Beheer</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Log in om inzendingen te beoordelen.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          E-mailadres
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Wachtwoord
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          required
        />
      </div>
      {error && (
        <p className="rounded-[var(--radius)] border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-sm">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        Inloggen
      </Button>
    </form>
  );
}
