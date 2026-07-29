"use client";

import { FileDown, Loader2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";

export function KpiDashboardExportButton() {
  const [isExporting, setIsExporting] = React.useState(false);
  const [error, setError] = React.useState("");

  async function handleExport() {
    setIsExporting(true);
    setError("");

    try {
      const response = await fetch("/api/kpi-dashboard/export", {
        credentials: "include",
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Unable to generate the KPI report right now.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const disposition = response.headers.get("content-disposition");
      const fileName = disposition?.match(/filename="([^"]+)"/)?.[1] ?? "kpi-dashboard-report.pdf";
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : "Unable to generate the KPI report right now.",
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        aria-label="Export KPI report as PDF"
        disabled={isExporting}
        onClick={handleExport}
        type="button"
        variant="outline"
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileDown className="h-4 w-4" />
        )}
        {isExporting ? "Preparing report..." : "Export PDF"}
      </Button>
      {error ? (
        <p aria-live="polite" className="max-w-xs text-right text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
