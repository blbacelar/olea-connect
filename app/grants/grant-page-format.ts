import {
  grantStatusLabels,
  type GrantApplicationStatus,
} from "@/lib/grants/domain";

export function formatMoney(amountCents: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

export function formatDate(value: string | null) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function statusLabel(status: string) {
  return grantStatusLabels[status as GrantApplicationStatus] ?? status;
}

export function statusClass(status: string) {
  if (["approved", "paid"].includes(status)) return "bg-emerald-50 text-emerald-700";
  if (status === "declined") return "bg-red-50 text-red-700";
  if (status === "withdrawn") return "bg-slate-100 text-slate-500";
  if (status === "shortlisted") return "bg-amber-50 text-amber-800";
  return "bg-olea-light text-olea-green";
}
