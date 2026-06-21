import Link from "next/link";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export function OnboardingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[68px] max-w-7xl items-center px-4 md:px-8">
        <Logo href="/dashboard" />
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/help">Help</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
