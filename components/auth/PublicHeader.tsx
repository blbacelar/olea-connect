import Link from "next/link";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export function PublicHeader({ minimal = false }: { minimal?: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center px-4 md:px-8">
        <Logo href="/" />
        <div className="flex-1" />
        {minimal ? (
          <p className="text-sm text-slate-500">
            Already a member?{" "}
            <Link href="/login" className="font-semibold text-olea-green">
              Log in
            </Link>
          </p>
        ) : (
          <>
            <nav className="mr-5 hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
              <Link href="/#features">What you get</Link>
              <Link href="/#how-it-works">How it works</Link>
              <Link href="/#plans">Pricing</Link>
              <Link href="/#faq">FAQ</Link>
              <Link href="/sponsorship">Sponsorship</Link>
              <Link href="/login">Login</Link>
            </nav>
            <Button asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
