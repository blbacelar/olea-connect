type EmailData = {
  email_action_type: string;
  redirect_to: string;
  site_url: string;
};

export function supabaseVerifyType(actionType: string) {
  return actionType === "signup" ? "email" : actionType;
}

function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

export function appConfirmUrl(data: EmailData, tokenHash: string) {
  const fallback = data.site_url || "http://localhost:3000";
  const redirectTo = data.redirect_to || fallback;
  const redirectUrl = new URL(redirectTo, fallback);
  const url = new URL("/auth/confirm", redirectUrl.origin);

  url.searchParams.set("token_hash", tokenHash);
  url.searchParams.set("type", supabaseVerifyType(data.email_action_type));
  url.searchParams.set("next", safeNextPath(redirectUrl.searchParams.get("next")));

  return url.toString();
}
