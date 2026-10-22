"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useRef } from "react";

import { AuthCard } from "@/components/auth/AuthCard";
import { parseImplicitAuthCallback } from "@/lib/auth/implicit-callback";
import { createClient } from "@/utils/supabase/client";

const invalidLinkPath =
  "/login?error=This%20authentication%20link%20is%20invalid%20or%20has%20expired.";

export default function CompleteAuthPage() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const callback = parseImplicitAuthCallback(
      window.location.search,
      window.location.hash,
    );
    window.history.replaceState(null, "", window.location.pathname + window.location.search);

    if (!callback) {
      window.location.replace(invalidLinkPath);
      return;
    }

    const { accessToken, refreshToken, next } = callback;

    async function complete() {
      const supabase = createClient();
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        window.location.replace(invalidLinkPath);
        return;
      }

      const { data, error: userError } = await supabase.auth.getUser();
      window.location.replace(
        !userError && data.user ? next : invalidLinkPath,
      );
    }

    void complete().catch(() => window.location.replace(invalidLinkPath));
  }, []);

  return (
    <AuthCard
      title="Confirming your email"
      description="Finishing your secure sign-in. You will continue automatically."
    >
      <p className="flex items-center justify-center gap-2 text-sm text-slate-600" role="status">
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        Verifying your link…
      </p>
    </AuthCard>
  );
}
