"use client";

import { usePathname } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Header } from "@/components/Header";
import { FrenchRuntimeTranslator } from "@/components/i18n/FrenchRuntimeTranslator";
import { Sidebar } from "@/components/Sidebar";
import { cn } from "@/lib/utils";

const publicRouteMatchers = [
  (pathname: string) => pathname === "/",
  (pathname: string) => pathname === "/ref",
  (pathname: string) => pathname.startsWith("/ref/"),
  (pathname: string) => pathname === "/referrals",
  (pathname: string) => pathname === "/sponsorship",
  (pathname: string) => pathname === "/login",
  (pathname: string) => pathname === "/reset-password",
  (pathname: string) => pathname === "/update-password",
  (pathname: string) => pathname.startsWith("/signup"),
  (pathname: string) => pathname === "/verify-email",
  (pathname: string) => pathname.startsWith("/auth"),
  (pathname: string) => pathname.startsWith("/onboarding"),
  (pathname: string) => pathname.startsWith("/legal"),
  (pathname: string) => pathname === "/team/invitations/accept",
];

const sidebarStorageKey = "olea-connects-sidebar-collapsed";
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function isPublicRoute(pathname: string) {
  return publicRouteMatchers.some((matches) => matches(pathname));
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useIsomorphicLayoutEffect(() => {
    try {
      const savedValue = window.localStorage.getItem(sidebarStorageKey);
      setIsSidebarCollapsed(savedValue === "true");
    } catch {
      setIsSidebarCollapsed(false);
    }
  }, []);

  function handleSidebarCollapsedChange(nextValue: boolean) {
    setIsSidebarCollapsed(nextValue);
    try {
      window.localStorage.setItem(sidebarStorageKey, String(nextValue));
    } catch {
      // The sidebar still works for this session if browser storage is blocked.
    }
  }

  if (isPublicRoute(pathname)) {
    return <FrenchRuntimeTranslator>{children}</FrenchRuntimeTranslator>;
  }

  return (
    <FrenchRuntimeTranslator>
      <div className="min-h-screen overflow-x-clip bg-slate-100">
        <Sidebar
          collapsed={isSidebarCollapsed}
          onCollapsedChange={handleSidebarCollapsedChange}
        />
        <div
          className={cn(
            "flex min-h-screen min-w-0 flex-col transition-[margin] duration-200",
            isSidebarCollapsed ? "lg:ml-20" : "lg:ml-60",
          )}
        >
          <Header />
          <Breadcrumbs />
          <main
            data-testid="app-main"
            className="min-w-0 flex-1 overflow-x-clip"
          >
            <div className="mx-auto max-w-[1280px] p-4 md:p-8">{children}</div>
          </main>
        </div>
      </div>
    </FrenchRuntimeTranslator>
  );
}
