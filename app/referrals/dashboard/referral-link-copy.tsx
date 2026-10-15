"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ReferralLinkCopy({
  copy,
  referralUrl,
}: {
  copy: {
    copied: string;
    copyLink: string;
    copyFailed: string;
  };
  referralUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopyFailed(false);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyFailed(true);
    }
  }

  return (
    <div className="rounded-2xl border bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 select-all overflow-hidden text-ellipsis rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-slate-700">
          {referralUrl}
        </code>
        <Button type="button" onClick={handleCopy}>
          {copied ? (
            <>
              <Check className="size-4" /> {copy.copied}
            </>
          ) : (
            <>
              <Copy className="size-4" /> {copy.copyLink}
            </>
          )}
        </Button>
      </div>
      {copyFailed ? <p role="status" className="mt-2 text-sm text-slate-600">{copy.copyFailed}</p> : null}
    </div>
  );
}
