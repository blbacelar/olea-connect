"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  supportedLocales,
  type Locale,
} from "@/lib/i18n/locales";

import { useLocaleContext } from "./LocaleProvider";

export type LocaleSelectorLabels = {
  ariaLabel: string;
  english: string;
  french: string;
};

const localeLabels: Record<Locale, keyof Omit<LocaleSelectorLabels, "ariaLabel">> = {
  "en-CA": "english",
  "fr-CA": "french",
};

export function LocaleSelector({
  locale,
  labels,
}: {
  locale?: Locale;
  labels?: LocaleSelectorLabels;
}) {
  const router = useRouter();
  const context = useLocaleContext();
  const currentLocale = locale ?? context.locale;
  const currentLabels = labels ?? context.labels;
  const [selectedLocale, setSelectedLocale] = useState(currentLocale);
  const [isPending, startTransition] = useTransition();
  const latestRequestedLocale = useRef(currentLocale);

  useEffect(() => {
    setSelectedLocale(currentLocale);
    latestRequestedLocale.current = currentLocale;
  }, [currentLocale]);

  function handleLocaleChange(nextLocale: Locale) {
    setSelectedLocale(nextLocale);
    latestRequestedLocale.current = nextLocale;

    startTransition(async () => {
      let response: Response;

      try {
        response = await fetch("/api/locale", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ locale: nextLocale }),
        });
      } catch {
        setSelectedLocale(currentLocale);
        return;
      }

      if (!response.ok || latestRequestedLocale.current !== nextLocale) {
        setSelectedLocale(currentLocale);
        return;
      }

      context.setLocale(nextLocale);
      document.documentElement.lang = nextLocale;
      router.refresh();
    });
  }

  return (
    <Select
      value={selectedLocale}
      onValueChange={(value) => handleLocaleChange(value as Locale)}
      disabled={isPending}
    >
      <SelectTrigger
        data-testid="locale-selector"
        aria-label={currentLabels.ariaLabel}
        aria-busy={isPending}
        className="h-10 w-[122px] gap-2 bg-white text-xs font-semibold text-slate-700"
      >
        <Languages className="size-4 text-olea-green" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {supportedLocales.map((item) => (
          <SelectItem key={item} value={item}>
            {currentLabels[localeLabels[item]]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
