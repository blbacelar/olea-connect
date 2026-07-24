import * as React from "react";

import {
  sanitizeDecimalInput,
  sanitizeIntegerInput,
  sanitizePhoneInput,
} from "@/lib/input-validation";
import { cn } from "@/lib/utils";

type InputFormat = "phone" | "integer" | "decimal" | "currency";

type InputProps = React.ComponentProps<"input"> & {
  "data-format"?: InputFormat;
};

const Input = React.forwardRef<
  HTMLInputElement,
  InputProps
>(({ className, type, onChange, step, ...props }, ref) => {
  const format = props["data-format"];
  const inputFormat =
    format ??
    (type === "tel"
      ? "phone"
      : type === "number"
        ? String(step) === "1"
          ? "integer"
          : "decimal"
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
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
