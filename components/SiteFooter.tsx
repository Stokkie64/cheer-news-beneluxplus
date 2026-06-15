import Link from "next/link";
import { getDictionary } from "@/lib/i18n/server";

export async function SiteFooter() {
  const t = await getDictionary();
  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
        <p>{t.footer.tagline}</p>
        <nav className="flex gap-4">
          <Link href="/over" className="hover:text-[var(--ink)]">
            {t.footer.about}
          </Link>
          <Link href="/submit" className="hover:text-[var(--ink)]">
            {t.footer.contribute}
          </Link>
          <Link href="/privacy" className="hover:text-[var(--ink)]">
            {t.footer.privacy}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
