"use client";

import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword } from "@/lib/auth";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const valid = password.length >= 8 && password === confirmation;

  const submit = () => {
    startTransition(async () => {
      try {
        setError("");
        await updatePassword(password);
        router.replace("/dashboard");
        router.refresh();
      } catch (updateError) {
        setError(
          updateError instanceof Error
            ? updateError.message
            : "Unable to update your password.",
        );
      }
    });
  };

  return (
    <AuthCard
      title="Choose a new password"
      description="Use at least 8 characters for your new password."
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="newPassword">New password</Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && valid) submit();
            }}
          />
        </div>
        {confirmation && password !== confirmation ? (
          <p className="text-sm text-red-600">Passwords do not match.</p>
        ) : null}
        {error ? (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <Button
          className="w-full"
          disabled={!valid || isPending}
          onClick={submit}
        >
          {isPending ? "Updating..." : "Update password"}
        </Button>
      </div>
    </AuthCard>
  );
}
