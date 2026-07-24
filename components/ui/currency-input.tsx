"use client";

import * as React from "react";

import { formatCurrencyInput, sanitizeDecimalInput } from "@/lib/input-validation";
import { Input } from "@/components/ui/input";

type CurrencyInputProps = Omit<React.ComponentProps<typeof Input>, "type" | "value" | "defaultValue"> & {
  defaultValue?: string | number;
};

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ defaultValue = "", name, onBlur, onChange, onFocus, ...props }, ref) => {
    const [rawValue, setRawValue] = React.useState(() =>
      sanitizeDecimalInput(String(defaultValue)),
    );
    const [focused, setFocused] = React.useState(false);

    return (
      <>
        <Input
          {...props}
          ref={ref}
          name={undefined}
          data-format="currency"
          inputMode="decimal"
          type="text"
          value={focused ? rawValue : formatCurrencyInput(rawValue)}
          onFocus={(event) => {
            setFocused(true);
            setRawValue(sanitizeDecimalInput(event.currentTarget.value));
            onFocus?.(event);
          }}
          onChange={(event) => {
            const nextValue = sanitizeDecimalInput(event.currentTarget.value);
            setRawValue(nextValue);
            if (nextValue !== event.currentTarget.value) {
              event.currentTarget.value = nextValue;
            }
            onChange?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            event.currentTarget.value = formatCurrencyInput(rawValue);
            onBlur?.(event);
          }}
        />
        {name ? <input name={name} type="hidden" value={rawValue} /> : null}
      </>
    );
  },
);

CurrencyInput.displayName = "CurrencyInput";
