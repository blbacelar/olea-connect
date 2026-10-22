"use client";

import * as React from "react";

import {
  formatCurrencyInput,
  formatEmailInput,
  formatPhoneInput,
  formatUrlInput,
  sanitizeDecimalInput,
  sanitizeIntegerInput,
  sanitizePhoneInput,
} from "@/lib/input-validation";
import { cn } from "@/lib/utils";

type InputFormat =
  | "phone"
  | "integer"
  | "decimal"
  | "currency"
  | "email"
  | "url";

type InputProps = React.ComponentProps<"input"> & {
  "data-format"?: InputFormat;
};

const Input = React.forwardRef<
  HTMLInputElement,
  InputProps
>(({ className, type, onBlur, onChange, step, ...props }, ref) => {
  const format = props["data-format"];
  const inputFormat =
    format ??
    (type === "tel"
      ? "phone"
      : type === "number"
        ? String(step) === "1"
          ? "integer"
          : "decimal"
        : type === "email"
          ? "email"
          : type === "url"
            ? "url"
        : undefined);

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const rawValue = event.currentTarget.value;
    const sanitizedValue =
      inputFormat === "phone"
        ? sanitizePhoneInput(rawValue)
        : inputFormat === "integer"
          ? sanitizeIntegerInput(rawValue)
          : inputFormat === "decimal" || inputFormat === "currency"
            ? sanitizeDecimalInput(rawValue)
            : rawValue;

    if (sanitizedValue !== rawValue) event.currentTarget.value = sanitizedValue;
    onChange?.(event);
  };

  const handleBlur: React.FocusEventHandler<HTMLInputElement> = (event) => {
    const rawValue = event.currentTarget.value;
    const formattedValue =
      inputFormat === "phone"
        ? formatPhoneInput(rawValue)
        : inputFormat === "currency"
          ? formatCurrencyInput(rawValue)
          : inputFormat === "email"
            ? formatEmailInput(rawValue)
            : inputFormat === "url"
              ? formatUrlInput(rawValue)
              : rawValue;

    if (formattedValue !== rawValue) {
      event.currentTarget.value = formattedValue;
      onChange?.(event as unknown as React.ChangeEvent<HTMLInputElement>);
    }
    onBlur?.(event);
  };

  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-md border border-input bg-white px-3.5 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50",
        className,
      )}
      ref={ref}
      step={step}
      onChange={handleChange}
      onBlur={handleBlur}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
