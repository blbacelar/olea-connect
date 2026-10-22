import { grantAwardStatuses } from "@/lib/grants/domain";
import {
  parseFormBoolean,
  parseStrictDecimal,
  parseStrictInteger,
} from "@/lib/input-validation";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

const adminRoles = ["super_admin", "grants_admin"] as const;

export function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function getBoolean(formData: FormData, key: string) {
  return parseFormBoolean(formData.get(key), key);
}

export function getMoneyCents(formData: FormData, key: string) {
  const amount = parseStrictDecimal(getText(formData, key), key, 0);
  return Math.round(amount * 100);
}

export function assertGrantAwardStatus(value: string) {
  assertEnum(grantAwardStatuses, value, "Choose a supported award status.");
}

export async function requireGrantsAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Sign in before managing grants.");

  const admin = createAdminClient();
  const { data: role, error } = await admin
    .from("platform_user_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", [...adminRoles])
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!role) throw new Error("Only grants administrators can manage decisions.");

  return { admin, userId: user.id };
}

export function parseScore(formData: FormData) {
  const score = parseStrictInteger(getText(formData, "score"), "Score", 1);
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw new Error("Score must be between 1 and 5.");
  }
  return score;
}

function assertEnum<T extends readonly string[]>(
  values: T,
  value: string,
  message: string,
): asserts value is T[number] {
  if (!values.includes(value)) throw new Error(message);
}
