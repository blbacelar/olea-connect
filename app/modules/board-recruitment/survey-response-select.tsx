"use client";

import * as React from "react";

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
  const [value, setValue] = React.useState(defaultValue);

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
          <SelectItem value="true">Yes</SelectItem>
          <SelectItem value="false">No</SelectItem>
        </SelectContent>
      </Select>
      <input type="hidden" name={name} value={value} />
    </>
  );
}
