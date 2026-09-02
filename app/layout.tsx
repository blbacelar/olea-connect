import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { AppShell } from "@/components/AppShell";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { SessionProvider } from "@/hooks/use-session";
import { RegistrationProvider } from "@/hooks/use-registration";
import { getOptionalMemberContext } from "@/lib/data/member-context";
import { getPublicSiteCopy } from "@/lib/i18n/public-site-copy";
import { getRequestLocale } from "@/lib/i18n/server";
import { localeToHtmlLang } from "@/lib/i18n/locales";
import { buildSiteMetadata } from "@/lib/site-metadata";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = buildSiteMetadata();

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getOptionalMemberContext();
  const locale = getRequestLocale();
  const publicCopy = getPublicSiteCopy(locale);

  return (
    <html lang={localeToHtmlLang(locale)}>
      <body className={inter.className}>
        <SessionProvider initialSession={session}>
          <LocaleProvider
            initialLocale={locale}
            labels={publicCopy.localeSelector}
          >
            <RegistrationProvider>
              <AppShell>{children}</AppShell>
            </RegistrationProvider>
          </LocaleProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
