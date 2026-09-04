import { Download } from "lucide-react";

import type { getBillingSummary } from "@/lib/billing/server";

import { formatDate, formatMoney } from "./subscription-format";

type BillingSummary = NonNullable<Awaited<ReturnType<typeof getBillingSummary>>>;

export function BillingHistory({ billing }: { billing: BillingSummary }) {
  return (
    <>
      <h2 className="mb-3 text-base font-bold text-slate-800">
        Billing history
      </h2>
      <div className="overflow-hidden rounded-xl border bg-white shadow-soft">
        <div className="hidden grid-cols-[1fr_1fr_120px_100px] bg-slate-50 px-[22px] py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 md:grid">
          <span>Date</span>
          <span>Status</span>
          <span>Amount</span>
          <span className="text-right">Invoice</span>
        </div>
        {billing.invoices.length ? (
          billing.invoices.map((invoice) => (
            <InvoiceRow key={invoice.id} invoice={invoice} />
          ))
        ) : (
          <p className="px-[22px] py-8 text-center text-sm text-slate-500">
            No invoices are available yet.
          </p>
        )}
      </div>
    </>
  );
}

function InvoiceRow({ invoice }: { invoice: BillingSummary["invoices"][number] }) {
  return (
    <div className="grid gap-2 border-t border-slate-100 px-[22px] py-[15px] text-sm first:border-t-0 md:grid-cols-[1fr_1fr_120px_100px] md:items-center">
      <span>{formatDate(invoice.createdAt)}</span>
      <span className="capitalize text-slate-500">
        {invoice.status ?? "pending"}
      </span>
      <span className="font-mono">
        {formatMoney(invoice.amountCents, invoice.currency)}
      </span>
      {invoice.hostedUrl || invoice.pdfUrl ? (
        <a
          href={invoice.hostedUrl ?? invoice.pdfUrl ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-olea-green md:justify-end"
        >
          <Download className="size-3.5" />
          Invoice
        </a>
      ) : (
        <span className="text-slate-400 md:text-right">Unavailable</span>
      )}
    </div>
  );
}
