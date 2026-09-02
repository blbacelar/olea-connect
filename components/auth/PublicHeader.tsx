"use client";

import Link from "next/link";

import { LocaleSelector } from "@/components/i18n/LocaleSelector";
import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { getPublicSiteCopy } from "@/lib/i18n/public-site-copy";

export function PublicHeader({ minimal = false }: { minimal?: boolean }) {
  const { locale } = useLocaleContext();
  const copy = getPublicSiteCopy(locale);

  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center px-4 md:px-8">
        <Logo
          href="/"
          ariaLabel={copy.logo.ariaLabel}
          tagline={copy.logo.tagline}
        />
        <div className="flex-1" />
        {minimal ? (
          <div className="flex items-center gap-3">
            <LocaleSelector locale={locale} labels={copy.localeSelector} />
            <p className="text-sm text-slate-500">
              {copy.nav.alreadyMember}{" "}
              <Link href="/login" className="font-semibold text-olea-green">
                {copy.nav.login}
              </Link>
            </p>
          </div>
        ) : (
          <>
            <nav className="mr-5 hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
              <Link href="/#features">{copy.nav.whatYouGet}</Link>
              <Link href="/#how-it-works">{copy.nav.howItWorks}</Link>
              <Link href="/#plans">{copy.nav.pricing}</Link>
              <Link href="/#faq">{copy.nav.faq}</Link>
              <Link href="/sponsorship">{copy.nav.sponsorship}</Link>
              <Link href="/referrals">{copy.nav.referrals}</Link>
              <Link href="/login">{copy.nav.login}</Link>
            </nav>
            <div className="mr-3">
              <LocaleSelector locale={locale} labels={copy.localeSelector} />
            </div>
            <Button asChild>
              <Link href="/signup">{copy.nav.getStarted}</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
