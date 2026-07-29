import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { AppShell } from "@/components/AppShell";
import { SessionProvider } from "@/hooks/use-session";
import { RegistrationProvider } from "@/hooks/use-registration";
import { getOptionalMemberContext } from "@/lib/data/member-context";
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

  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider initialSession={session}>
          <RegistrationProvider>
            <AppShell>{children}</AppShell>
          </RegistrationProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
