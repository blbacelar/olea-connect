"use client";

import {
  Bell,
  ChevronDown,
  FileText,
  Gift,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { GlobalCommandPalette } from "@/components/global-search/GlobalCommandPalette";
import { Logo } from "@/components/Logo";
import { navigationGroups } from "@/components/navigation";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { useRegistration } from "@/hooks/use-registration";
import { signOut } from "@/lib/auth";
import { useRouter } from "next/navigation";

const notifications = [
  {
    title: "New template available",
    body: "Board Meeting Agenda was added to your library.",
    time: "2 hours ago",
    icon: FileText,
    tone: "bg-olea-light text-olea-green",
  },
  {
    title: "Grant applications open",
    body: "Q3 Olea Gives applications are now open.",
    time: "Yesterday",
    icon: Gift,
    tone: "bg-amber-50 text-amber-600",
  },
];

export function Header() {
  const router = useRouter();
  const session = useSession();
  const member = session?.member;
  const { resetRegistration } = useRegistration();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials = (member?.name ?? "Member")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="relative z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-white px-4 md:gap-4 md:px-6">
      <div className="lg:hidden">
        <Logo compact />
      </div>

      <GlobalCommandPalette />
      <div className="flex-1" />

      <div className="relative">
        <Button
          variant="outline"
          size="icon"
          className="relative rounded-lg"
          aria-label="Notifications"
          onClick={() => {
            setNotificationsOpen((open) => !open);
            setUserOpen(false);
          }}
        >
          <Bell className="size-[18px]" />
          <span className="absolute -right-1.5 -top-1.5 inline-flex size-[18px] items-center justify-center rounded-full border-2 border-white bg-olea-orange text-[10px] font-bold leading-none text-white">
            2
          </span>
        </Button>
        {notificationsOpen ? (
          <div className="absolute right-0 top-12 w-[calc(100vw-2rem)] max-w-[340px] overflow-hidden rounded-xl border bg-white shadow-elevated">
            <div className="flex items-center justify-between border-b px-4 py-3.5">
              <span className="font-semibold">Notifications</span>
              <button className="text-xs font-semibold text-olea-green">
                Mark all read
              </button>
            </div>
            {notifications.map((notification) => {
              const Icon = notification.icon;
              return (
                <div
                  key={notification.title}
                  className="flex gap-3 border-b border-slate-100 px-4 py-3"
                >
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-lg ${notification.tone}`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold">
                      {notification.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-slate-500">
                      {notification.body}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {notification.time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="relative">
        <button
          onClick={() => {
            setUserOpen((open) => !open);
            setNotificationsOpen(false);
          }}
          className="flex h-10 items-center gap-2 rounded-full border bg-white py-1 pl-1 pr-2 transition hover:bg-slate-50"
        >
          <span className="grid size-[30px] place-items-center rounded-full bg-gradient-to-br from-olea-green to-olea-dark text-xs font-bold text-white">
            {initials}
          </span>
          <span className="hidden text-[13.5px] font-semibold text-slate-800 sm:inline">
            {member?.firstName ?? "Member"}
          </span>
          <ChevronDown className="size-4 text-slate-400" />
        </button>
        {userOpen ? (
          <div className="absolute right-0 top-12 w-[230px] rounded-xl border bg-white p-1.5 shadow-elevated">
            <div className="mb-1.5 border-b px-3 py-2">
              <p className="font-semibold">{member?.name ?? "Member"}</p>
              <p className="text-xs text-slate-500">{member?.email ?? ""}</p>
            </div>
            {[
              ["Brand settings", "/settings/brand"],
              ["Team", "/team"],
              ["Help", "/help"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="block rounded-lg px-3 py-2 text-[13.5px] text-slate-600 hover:bg-slate-100"
              >
                {label}
              </Link>
            ))}
            <div className="mt-1.5 border-t pt-1.5">
              <button
                onClick={async () => {
                  await signOut();
                  resetRegistration();
                  setUserOpen(false);
                  router.replace("/login");
                  router.refresh();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13.5px] font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Open navigation"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="size-5" />
      </Button>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-900/30"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-[280px] bg-white p-4 shadow-elevated">
            <div className="flex items-center justify-between border-b pb-4">
              <Logo />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
              >
                <X className="size-5" />
              </Button>
            </div>
            <nav className="mt-3">
              {navigationGroups.map((group, groupIndex) => (
                <div
                  key={groupIndex}
                  className="space-y-1 border-b border-slate-100 py-2 last:border-0"
                >
                  {group.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={item.href.startsWith("/api/") ? false : undefined}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-olea-light hover:text-olea-dark"
                      >
                        <Icon className="size-5" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}
