"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";

const publicRoutes = [
  "/",
  "/login",
  "/reset-password",
  "/update-password",
  "/signup",
  "/verify-email",
  "/auth",
  "/onboarding",
];

function isPublicRoute(pathname: string) {
  return publicRoutes.some((route) =>
    route === "/" ? pathname === "/" : pathname.startsWith(route),
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (isPublicRoute(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-100">
      <Sidebar />
      <div className="flex h-full min-w-0 flex-col lg:ml-60">
        <Header />
        <Breadcrumbs />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1280px] p-4 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
