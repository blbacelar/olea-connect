"use client";

import * as React from "react";

import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SurveyResponseSelect({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: "true" | "false";
}) {
  const { locale } = useLocaleContext();
  const [value, setValue] = React.useState(defaultValue);
  const labels =
    locale === "fr-CA" ? { yes: "Oui", no: "Non" } : { yes: "Yes", no: "No" };

  return (
    <>
      <Select
        value={value}
        onValueChange={(nextValue) => {
          if (nextValue === "true" || nextValue === "false") {
            setValue(nextValue);
          }
        }}
      >
        <SelectTrigger className="w-28" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">{labels.yes}</SelectItem>
          <SelectItem value="false">{labels.no}</SelectItem>
        </SelectContent>
      </Select>
      <input type="hidden" name={name} value={value} />
    </>
  );
}
