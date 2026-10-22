"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  isWellFormedFoundingMemberCode,
  normalizeFoundingMemberCode,
} from "@/lib/founding-member";

interface FoundingMemberCodeFieldProps {
  help: string;
  invalidMessage: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

export function FoundingMemberCodeField({
  help,
  invalidMessage,
  label,
  onChange,
  placeholder,
  value,
}: FoundingMemberCodeFieldProps) {
  const invalid = Boolean(value) && !isWellFormedFoundingMemberCode(value);

  return (
    <div className="space-y-2 rounded-lg border border-olea-gold/30 bg-amber-50/60 p-4">
      <Label htmlFor="foundingMemberCode">{label}</Label>
      <Input
        id="foundingMemberCode"
        aria-describedby={
          invalid ? "foundingMemberCodeError" : "foundingMemberCodeHelp"
        }
        aria-errormessage={invalid ? "foundingMemberCodeError" : undefined}
        aria-invalid={invalid}
        autoCapitalize="characters"
        autoComplete="off"
        maxLength={32}
        placeholder={placeholder}
        spellCheck={false}
        value={value}
        onBlur={(event) => {
          const normalized = normalizeFoundingMemberCode(event.target.value);
          if (normalized !== null) onChange(normalized);
        }}
        onChange={(event) => onChange(event.target.value.toUpperCase())}
      />
      {invalid ? (
        <p
          id="foundingMemberCodeError"
          className="text-xs leading-5 text-red-700"
          role="alert"
        >
          {invalidMessage}
        </p>
      ) : (
        <p id="foundingMemberCodeHelp" className="text-xs leading-5 text-slate-600">
          {help}
        </p>
      )}
    </div>
  );
}
