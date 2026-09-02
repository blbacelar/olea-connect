export const supportedLocales = ["en-CA", "fr-CA"] as const;

export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = "en-CA";
export const localeCookieName = "olea_locale";

const localeAliases: Record<string, Locale> = {
  en: "en-CA",
  "en-ca": "en-CA",
  "en-us": "en-CA",
  fr: "fr-CA",
  "fr-ca": "fr-CA",
  "fr-fr": "fr-CA",
};

export function isSupportedLocale(value: unknown): value is Locale {
  return supportedLocales.includes(value as Locale);
}

export function normalizeLocale(value: string | null | undefined): Locale | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return localeAliases[normalized] ?? localeAliases[normalized.split("-")[0]] ?? null;
}

export function resolveRequestLocale({
  localeCookie,
  country,
  region,
  acceptLanguage,
}: {
  localeCookie?: string | null;
  country?: string | null;
  region?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  const manualLocale = normalizeLocale(localeCookie);
  if (manualLocale) return manualLocale;

  if (
    country?.toUpperCase() === "CA" &&
    ["QC", "QUEBEC"].includes(region?.toUpperCase() ?? "")
  ) {
    return "fr-CA";
  }

  return resolveAcceptLanguage(acceptLanguage) ?? defaultLocale;
}

export function localeToHtmlLang(locale: Locale) {
  return locale;
}

function resolveAcceptLanguage(value: string | null | undefined) {
  if (!value) return null;

  const preferred = value
    .split(",")
    .map((entry, index) => {
      const [tag, ...params] = entry.split(";").map((part) => part.trim());
      const locale = normalizeLocale(tag);
      const qParam = params.find((param) =>
        param.toLowerCase().startsWith("q="),
      );
      const parsedQ = qParam ? Number.parseFloat(qParam.slice(2)) : 1;

      return {
        index,
        locale,
        q: Number.isFinite(parsedQ) ? parsedQ : 0,
      };
    })
    .filter(
      (entry): entry is { index: number; locale: Locale; q: number } =>
        Boolean(entry.locale) && entry.q > 0,
    )
    .sort((a, b) => b.q - a.q || a.index - b.index);

  return preferred[0]?.locale ?? null;
}
