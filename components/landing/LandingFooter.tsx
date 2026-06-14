import Link from "next/link";

import { Logo } from "@/components/Logo";

export function LandingFooter() {
  return (
    <footer className="border-t bg-slate-50 px-4 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-center">
        <div>
          <Logo href="/" />
          <p className="mt-3 max-w-sm text-xs leading-5 text-slate-500">
            A membership platform by Olive Social Impact Inc., an independent
            Canadian social enterprise.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-600 md:ml-auto">
          <Link href="/#features">What you get</Link>
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#plans">Pricing</Link>
          <Link href="/#faq">FAQ</Link>
          <Link href="/login">Member login</Link>
        </nav>
      </div>
      <div className="mx-auto mt-8 flex max-w-7xl flex-col gap-2 border-t pt-6 text-xs text-slate-600 sm:flex-row sm:justify-between">
        <span>© 2026 Olive Social Impact Inc.</span>
        <span>All prices in CAD.</span>
      </div>
    </footer>
  );
}
