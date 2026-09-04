import { Archive } from "lucide-react";

import { archiveKpiDefinition } from "@/app/modules/kpi-dashboard/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import type { KpiDefinition } from "@/lib/data/kpi-dashboard";
import {
  decimalNumberPattern,
  positiveDecimalNumberPattern,
  type QuarterNumber,
} from "@/lib/kpi-dashboard/domain";

import { FieldHint, HiddenDashboard } from "./kpi-dashboard-ui";

export function KpiDefinitionFields({ kpi }: { kpi?: KpiDefinition }) {
  const textFields = getKpiTextFields(kpi);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {textFields.map((field) => (
        <KpiTextField key={field.name} {...field} />
      ))}
      <TargetNumberField defaultValue={kpi?.targetNumber ?? ""} />
      <BaselineNumberField defaultValue={kpi?.baselineNumber ?? ""} />
    </div>
  );
}

export function ArchiveKpiDefinitionDialog({
  dashboardId,
  kpi,
  quarter,
}: {
  dashboardId: string;
  kpi: KpiDefinition;
  quarter: QuarterNumber;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          aria-label={`Archive KPI ${kpi.name}`}
          size="icon"
          title="Archive KPI"
          variant="outline"
        >
          <Archive className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Archive this KPI?</DialogTitle>
          <DialogDescription>
            &quot;{kpi.name}&quot; will be removed from all quarter tracker tabs
            and board reporting calculations. Existing historical records stay
            in the database for audit purposes.
          </DialogDescription>
        </DialogHeader>
        <form action={archiveKpiDefinition} className="flex flex-wrap gap-3">
          <HiddenDashboard dashboardId={dashboardId} />
          <input type="hidden" name="kpiId" value={kpi.id} />
          <input type="hidden" name="quarter" value={quarter} />
          <SubmitButton pendingText="Archiving..." variant="destructive">
            Archive KPI
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function KpiTextField({
  defaultValue,
  maxLength,
  minLength,
  name,
  placeholder,
  required = false,
  title,
}: {
  defaultValue: string;
  maxLength: number;
  minLength?: number;
  name: string;
  placeholder: string;
  required?: boolean;
  title: string;
}) {
  return (
    <label className="block text-sm font-semibold">
      {title}
      <Input
        className="mt-2"
        defaultValue={defaultValue}
        maxLength={maxLength}
        minLength={minLength}
        name={name}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

function TargetNumberField({ defaultValue }: { defaultValue: number | string }) {
  return (
    <label className="block text-sm font-semibold">
      Target as number
      <Input
        className="mt-2"
        defaultValue={defaultValue}
        inputMode="decimal"
        name="targetNumber"
        pattern={positiveDecimalNumberPattern}
        placeholder="70 or 1500000"
        required
        title="Enter a number greater than zero, with up to 2 decimal places."
      />
      <FieldHint>Number greater than zero, up to 2 decimals. No currency symbols.</FieldHint>
    </label>
  );
}

function BaselineNumberField({ defaultValue }: { defaultValue: number | string }) {
  return (
    <label className="block text-sm font-semibold">
      Baseline number
      <Input
        className="mt-2"
        defaultValue={defaultValue}
        inputMode="decimal"
        name="baselineNumber"
        pattern={decimalNumberPattern}
        placeholder="Optional"
        title="Enter numbers only, with up to 2 decimal places."
      />
    </label>
  );
}

function getKpiTextFields(kpi: KpiDefinition | undefined) {
  return [
    {
      defaultValue: kpi?.domain ?? "",
      maxLength: 80,
      minLength: 2,
      name: "domain",
      placeholder: "Programs, Finance, People...",
      required: true,
      title: "Domain",
    },
    {
      defaultValue: kpi?.name ?? "",
      maxLength: 140,
      minLength: 2,
      name: "name",
      placeholder: "Client satisfaction",
      required: true,
      title: "KPI name",
    },
    {
      defaultValue: kpi?.owner ?? "",
      maxLength: 100,
      name: "owner",
      placeholder: "Executive Director",
      title: "Owner",
    },
    {
      defaultValue: kpi?.outcomeArea ?? "",
      maxLength: 120,
      name: "outcomeArea",
      placeholder: "Strategic goal or funder report",
      title: "Outcome/funder tag",
    },
    {
      defaultValue: kpi?.targetDisplay ?? "",
      maxLength: 60,
      name: "targetDisplay",
      placeholder: ">= 70% or $1.5M",
      required: true,
      title: "Target as displayed",
    },
  ];
}
