"use client";

import * as React from "react";
import { Check, Plus, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { RecruitmentData } from "@/lib/board-recruitment/types";

export function HiddenWorkspace({ data }: { data: RecruitmentData }) {
  return <input type="hidden" name="workspaceId" value={data.workspace.id} />;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-olea-green">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-1 text-2xl font-bold text-slate-900">{title}</h2>
        {description && (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function Field({
  label,
  hint,
  ...props
}: React.ComponentProps<typeof Input> & { label: string; hint?: string }) {
  return (
    <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      <Input {...props} />
      {hint && (
        <span className="block text-xs font-normal leading-5 text-slate-500">
          {hint}
        </span>
      )}
    </label>
  );
}

export function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "success" | "danger";
}) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-soft">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
        {label}
      </p>
      <p
        className={[
          "mt-2 text-3xl font-bold",
          tone === "success"
            ? "text-green-700"
            : tone === "danger"
              ? "text-red-700"
              : "text-slate-900",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

export function ModalForm({
  title,
  description,
  trigger,
  action,
  children,
  submitLabel = "Save",
}: {
  title: string;
  description?: string;
  trigger: React.ReactNode;
  action: (formData: FormData) => void | Promise<void>;
  children: React.ReactNode;
  submitLabel?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form action={action} className="space-y-4">
          {children}
          <DialogFooter>
            <SubmitButton>
              <Save className="size-4" />
              {submitLabel}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ConfirmAction({
  title,
  description,
  trigger,
  action,
  children,
  confirmLabel = "Confirm",
}: {
  title: string;
  description: string;
  trigger: React.ReactNode;
  action: (formData: FormData) => void | Promise<void>;
  children: React.ReactNode;
  confirmLabel?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          {children}
          <DialogFooter>
            <SubmitButton variant="destructive">{confirmLabel}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AddButton({
  children = "Add",
}: {
  children?: React.ReactNode;
}) {
  return (
    <Button type="button" className="min-h-11">
      <Plus className="size-4" />
      {children}
    </Button>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed bg-slate-50 p-8 text-center text-sm text-slate-600">
      {children}
    </div>
  );
}

export function CheckMark({ checked }: { checked: boolean }) {
  return checked ? (
    <Check className="size-4 text-green-700" aria-label="Yes" />
  ) : (
    <span className="text-slate-400" aria-label="No">
      -
    </span>
  );
}
