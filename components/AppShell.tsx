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
import { Sidebar } from "@/components/Sidebar";
import { cn } from "@/lib/utils";

const publicRoutes = [
  "/",
  "/sponsorship",
  "/login",
  "/reset-password",
  "/update-password",
  "/signup",
  "/verify-email",
  "/auth",
  "/onboarding",
];

const sidebarStorageKey = "olea-connects-sidebar-collapsed";
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function isPublicRoute(pathname: string) {
  return publicRoutes.some((route) =>
    route === "/" ? pathname === "/" : pathname.startsWith(route),
  );
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
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-100">
      <Sidebar
        collapsed={isSidebarCollapsed}
        onCollapsedChange={handleSidebarCollapsedChange}
      />
      <div
        className={cn(
          "flex h-full min-w-0 flex-col transition-[margin] duration-200",
          isSidebarCollapsed ? "lg:ml-20" : "lg:ml-60",
        )}
      >
        <Header />
        <Breadcrumbs />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="mx-auto max-w-[1280px] p-4 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
