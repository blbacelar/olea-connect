"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button, type ButtonProps } from "@/components/ui/button";

type SubmitButtonProps = Omit<ButtonProps, "disabled" | "type"> & {
  disabled?: boolean;
  pendingText?: React.ReactNode;
};

const SubmitButton = React.forwardRef<HTMLButtonElement, SubmitButtonProps>(
  ({ children, disabled, pendingText, ...props }, ref) => {
    const { pending } = useFormStatus();
    const isDisabled = disabled || pending;

    return (
      <Button
        {...props}
        aria-disabled={isDisabled}
        disabled={isDisabled}
        ref={ref}
        type="submit"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {pendingText ?? "Saving..."}
          </>
        ) : (
          children
        )}
      </Button>
    );
  },
);
SubmitButton.displayName = "SubmitButton";

export { SubmitButton };
