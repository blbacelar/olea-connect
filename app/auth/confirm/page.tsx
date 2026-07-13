import type { EmailOtpType } from "@supabase/supabase-js";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";

const allowedTypes = new Set<EmailOtpType>([
  "email",
  "magiclink",
  "recovery",
  "invite",
  "email_change",
]);

function getSafeNextPath(value: string | string[] | undefined) {
  const next = Array.isArray(value) ? value[0] : value;
  return next?.startsWith("/") && !next.startsWith("//")
    ? next
    : "/dashboard";
}

function getSafeType(value: string | string[] | undefined) {
  const type = Array.isArray(value) ? value[0] : value;
  return type && allowedTypes.has(type as EmailOtpType)
    ? (type as EmailOtpType)
    : null;
}

async function confirmEmail(formData: FormData) {
  "use server";

  const tokenHash = String(formData.get("token_hash") ?? "");
  const type = getSafeType(String(formData.get("type") ?? ""));
  const next = getSafeNextPath(String(formData.get("next") ?? ""));

  if (!tokenHash || !type) {
    redirect("/login?error=This authentication link is invalid or has expired.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    redirect("/login?error=This authentication link is invalid or has expired.");
  }

  redirect(next);
}

export default function AuthConfirmPage({
  searchParams,
}: {
  searchParams: {
    token_hash?: string | string[];
    type?: string | string[];
    next?: string | string[];
  };
}) {
  const tokenHash = Array.isArray(searchParams.token_hash)
    ? searchParams.token_hash[0]
    : searchParams.token_hash;
  const type = getSafeType(searchParams.type);
  const next = getSafeNextPath(searchParams.next);
  const validLink = Boolean(tokenHash && type);

  return (
    <AuthCard
      title="Confirm this secure link"
      description="For your protection, we verify password reset links only after you confirm this action."
    >
      {validLink ? (
        <form action={confirmEmail} className="space-y-5">
          <input type="hidden" name="token_hash" value={tokenHash} />
          <input type="hidden" name="type" value={type ?? ""} />
          <input type="hidden" name="next" value={next} />
          <Button className="w-full" type="submit">
            Continue
          </Button>
          <p className="text-center text-sm text-slate-500">
            If you did not request this, you can safely close this page.
          </p>
        </form>
      ) : (
        <div className="space-y-4 text-center">
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            This authentication link is invalid or has expired.
          </p>
          <Button asChild variant="outline">
            <Link href="/reset-password">Request a new link</Link>
          </Button>
        </div>
      )}
    </AuthCard>
  );
}
