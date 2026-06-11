"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";

export function DemoActionButton({
  message,
  children,
  ...props
}: ButtonProps & { message: string }) {
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(false), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  return (
    <>
      <Button {...props} onClick={() => setToast(true)}>
        {children}
      </Button>
      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 flex max-w-sm items-center gap-2.5 rounded-[10px] bg-olea-green px-[18px] py-3.5 text-sm font-medium text-white shadow-elevated"
        >
          <Check className="size-4 shrink-0" />
          {message}
        </div>
      ) : null}
    </>
  );
}
