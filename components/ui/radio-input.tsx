"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

const RadioInput = React.forwardRef<HTMLInputElement, Omit<React.ComponentProps<"input">, "type">>(
  ({ className, ...props }, ref) => (
    <input ref={ref} type="radio" className={cn("peer sr-only", className)} {...props} />
  ),
);
RadioInput.displayName = "RadioInput";

export { RadioInput };
