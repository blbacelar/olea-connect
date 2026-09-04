"use client";

import { ChevronDown, LogOut } from "lucide-react";
import Link from "next/link";

import { signOut } from "@/lib/auth";
import type { Member } from "@/lib/types";

type UserMenuCopy = {
  brandSettings: string;
  help: string;
  member: string;
  signOut: string;
  team: string;
};

type HeaderRouter = {
  refresh: () => void;
  replace: (href: string) => void;
};

export function HeaderUserMenu({
  copy,
  initials,
  member,
  onNotificationsClose,
  onOpenChange,
  open,
  resetRegistration,
  router,
}: {
  copy: UserMenuCopy;
  initials: string;
  member: Member | undefined;
  onNotificationsClose: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  resetRegistration: () => void;
  router: HeaderRouter;
}) {
  return (
    <div className="relative">
      <button
        onClick={() => {
          onOpenChange(!open);
          onNotificationsClose();
        }}
        className="flex h-10 items-center gap-2 rounded-full border bg-white py-1 pl-1 pr-2 transition hover:bg-slate-50"
      >
        <span className="grid size-[30px] place-items-center rounded-full bg-gradient-to-br from-olea-green to-olea-dark text-xs font-bold text-white">
          {initials}
        </span>
        <span className="hidden text-[13.5px] font-semibold text-slate-800 sm:inline">
          {member?.firstName ?? copy.member}
        </span>
        <ChevronDown className="size-4 text-slate-400" />
      </button>
      {open ? (
        <UserPopover
          copy={copy}
          member={member}
          resetRegistration={resetRegistration}
          router={router}
          setOpen={onOpenChange}
        />
      ) : null}
    </div>
  );
}

function UserPopover({
  copy,
  member,
  resetRegistration,
  router,
  setOpen,
}: {
  copy: UserMenuCopy;
  member: Member | undefined;
  resetRegistration: () => void;
  router: HeaderRouter;
  setOpen: (open: boolean) => void;
}) {
  const links = [
    [copy.brandSettings, "/settings/brand"],
    [copy.team, "/team"],
    [copy.help, "/help"],
  ];

  return (
    <div className="absolute right-0 top-12 w-[230px] rounded-xl border bg-white p-1.5 shadow-elevated">
      <div className="mb-1.5 border-b px-3 py-2">
        <p className="font-semibold">{member?.name ?? copy.member}</p>
        <p className="text-xs text-slate-500">{member?.email ?? ""}</p>
      </div>
      {links.map(([label, href]) => (
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
            setOpen(false);
            router.replace("/login");
            router.refresh();
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13.5px] font-medium text-red-600 hover:bg-red-50"
        >
          <LogOut className="size-4" />
          {copy.signOut}
        </button>
      </div>
    </div>
  );
}
