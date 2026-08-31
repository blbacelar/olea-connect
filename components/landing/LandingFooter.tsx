import Link from "next/link";

import { Logo } from "@/components/Logo";
import { getPublicSiteCopy } from "@/lib/i18n/public-site-copy";
import type { PublicSiteCopy } from "@/lib/i18n/public-site-copy";
import { getRequestLocale } from "@/lib/i18n/server";

type LandingFooterCopy = PublicSiteCopy["footer"];
type LandingFooterNav = PublicSiteCopy["nav"];
type LandingFooterLogo = PublicSiteCopy["logo"];

export function LandingFooter({
  copy,
  nav,
  logo,
}: {
  copy?: LandingFooterCopy;
  nav?: LandingFooterNav;
  logo?: LandingFooterLogo;
}) {
  const fallbackCopy =
    copy && nav && logo ? null : getPublicSiteCopy(getRequestLocale());
  const footerCopy = copy ?? fallbackCopy!.footer;
  const footerNav = nav ?? fallbackCopy!.nav;
  const footerLogo = logo ?? fallbackCopy!.logo;

  return (
    <footer className="border-t bg-slate-50 px-4 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-center">
        <div>
          <Logo
            href="/"
            ariaLabel={footerLogo.ariaLabel}
            tagline={footerLogo.tagline}
          />
          <p className="mt-3 max-w-sm text-xs leading-5 text-slate-500">
            {footerCopy.description}
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-600 md:ml-auto">
          <Link href="/#features">{footerNav.whatYouGet}</Link>
          <Link href="/#how-it-works">{footerNav.howItWorks}</Link>
          <Link href="/#plans">{footerNav.pricing}</Link>
          <Link href="/#faq">{footerNav.faq}</Link>
          <Link href="/sponsorship">{footerNav.sponsorship}</Link>
          <Link href="/referrals">{footerNav.referrals}</Link>
          <Link href="/login">{footerNav.memberLogin}</Link>
        </nav>
      </div>
      <div className="mx-auto mt-8 flex max-w-7xl flex-col gap-2 border-t pt-6 text-xs text-slate-600 sm:flex-row sm:justify-between">
        <span>{footerCopy.copyright}</span>
        <span>{footerCopy.prices}</span>
      </div>
    </footer>
  );
}
