import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { AppShell } from "@/components/AppShell";
import { SessionProvider } from "@/hooks/use-session";
import { RegistrationProvider } from "@/hooks/use-registration";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Olea Connects",
  description: "Branded governance tools for Canadian nonprofits.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          <RegistrationProvider>
            <AppShell>{children}</AppShell>
          </RegistrationProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
