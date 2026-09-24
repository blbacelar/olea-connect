"use client";

import Link from "next/link";
import { BadgePercent } from "lucide-react";

import { LocaleSelector } from "@/components/i18n/LocaleSelector";
import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { getPublicSiteCopy } from "@/lib/i18n/public-site-copy";

export function FoundingOfferBanner({ showSignupLink = true }: { showSignupLink?: boolean }) {
  const { locale } = useLocaleContext();
  const copy = getPublicSiteCopy(locale);

  return (
    <div
      data-testid="founding-offer-banner"
      className="bg-olea-dark px-4 py-2 text-center text-sm leading-5 text-white"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <BadgePercent aria-hidden="true" className="size-4 shrink-0" />
        <span>{copy.foundingBanner.message}</span>
        <span className="whitespace-nowrap">
          {copy.foundingBanner.codeLabel}{" "}
          <strong className="rounded border border-white/30 bg-white/10 px-1.5 py-0.5 font-mono text-amber-100">
            OLEAFOUNDING15
          </strong>
        </span>
        {showSignupLink ? (
          <Link
            href="/signup"
            className="font-semibold underline underline-offset-2 hover:text-amber-100 focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {copy.foundingBanner.signup}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function PublicHeader({
  minimal = false,
  showFoundingOffer = false,
}: {
  minimal?: boolean;
  showFoundingOffer?: boolean;
}) {
  const { locale } = useLocaleContext();
  const copy = getPublicSiteCopy(locale);

  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
      {showFoundingOffer ? <FoundingOfferBanner showSignupLink={!minimal} /> : null}
      <div className="mx-auto flex h-[68px] max-w-7xl items-center px-4 md:px-8">
        <Logo
          href="/"
          ariaLabel={copy.logo.ariaLabel}
          tagline={copy.logo.tagline}
          hideTaglineOnMobile={showFoundingOffer}
        />
        <div className="flex-1" />
        {minimal ? (
          <div className="flex items-center gap-3">
            <LocaleSelector locale={locale} labels={copy.localeSelector} />
            <p className="whitespace-nowrap text-sm text-slate-500">
              <span className="hidden sm:inline">{copy.nav.alreadyMember}{" "}</span>
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
            <Button asChild className={showFoundingOffer ? "hidden sm:inline-flex" : undefined}>
              <Link href="/signup">{copy.nav.getStarted}</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}
