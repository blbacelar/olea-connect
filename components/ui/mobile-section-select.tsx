"use client";

import { Label } from "@/components/ui/label";
import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { translateFrenchUiText } from "@/lib/i18n/french-runtime-translations";

type SectionOption = { value: string; label: string };

export function MobileSectionSelect({
  label = "Section",
  onValueChange,
  options,
  value,
}: {
  label?: string;
  onValueChange: (value: string) => void;
  options: readonly SectionOption[];
  value: string;
}) {
  const { locale } = useLocaleContext();
  const translate = (text: string) =>
    locale === "fr-CA" ? translateFrenchUiText(text) : text;

  return (
    <div className="space-y-2 md:hidden">
      <Label htmlFor="mobile-section-select">{translate(label)}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id="mobile-section-select" className="w-full bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {translate(option.label)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
