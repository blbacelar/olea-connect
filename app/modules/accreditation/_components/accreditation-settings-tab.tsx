"use client";

import { Save, Settings } from "lucide-react";
import { useState, useTransition } from "react";

import {
  saveAccreditationSettingsAction,
  type AccreditationActionResult,
} from "@/app/modules/accreditation/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { AccreditationWorkspaceData } from "@/lib/accreditation/types";

import {
  Field,
  fieldError,
  teamRoleOptions,
} from "./accreditation-workspace-utils";

export function SettingsTab({
  data,
  onSaved,
}: {
  data: AccreditationWorkspaceData;
  onSaved: () => void;
}) {
  const [state, setState] = useState<AccreditationActionResult>({ ok: true });
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setState({ ok: true });
    startTransition(async () => {
      const result = await saveAccreditationSettingsAction(formData);
      setState(result);
      if (result.ok) onSaved();
    });
  }

  return (
    <Card>
      <CardContent className="p-5">
        <SettingsHeader />
        <form action={submit} className="mt-6 space-y-5" noValidate>
          <SettingsFields data={data} state={state} />
          <TeamRoleFields data={data} />
          {!state.ok ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
              {state.error}
            </div>
          ) : null}
          <Button disabled={pending} type="submit">
            <Save className="size-4" />
            {pending ? "Saving..." : "Save settings"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SettingsHeader() {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-11 place-items-center rounded-xl bg-olea-light text-olea-green">
        <Settings className="size-5" />
      </span>
      <div>
        <h2 className="text-2xl font-bold text-slate-950">
          Accreditation settings
        </h2>
        <p className="mt-1 text-slate-600">
          This is intentionally the last tab, but a first-time workspace opens
          here so the submission context is configured before document work
          begins.
        </p>
      </div>
    </div>
  );
}

function SettingsFields({
  data,
  state,
}: {
  data: AccreditationWorkspaceData;
  state: AccreditationActionResult;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field error={fieldError(state, "organizationName")} label="Organization name">
        <Input
          aria-label="Organization name"
          defaultValue={data.settings.organizationName}
          name="organizationName"
          placeholder="BoraPost Community Services"
        />
      </Field>
      <Field error={fieldError(state, "charityNumber")} label="CRA charity number">
        <Input
          aria-label="CRA charity number"
          defaultValue={data.settings.charityNumber}
          name="charityNumber"
          placeholder="123456789RR0001"
        />
      </Field>
      <Field error={fieldError(state, "targetDate")} label="Target accreditation date">
        <Input
          aria-label="Target accreditation date"
          defaultValue={data.settings.targetDate}
          name="targetDate"
          type="date"
        />
      </Field>
      <Field error={fieldError(state, "leadName")} label="Accreditation lead">
        <Input
          aria-label="Accreditation lead"
          defaultValue={data.settings.leadName}
          name="leadName"
          placeholder="Full name"
        />
      </Field>
      <Field error={fieldError(state, "leadEmail")} label="Lead email">
        <Input
          aria-label="Lead email"
          defaultValue={data.settings.leadEmail}
          name="leadEmail"
          placeholder="lead@example.org"
          type="email"
        />
      </Field>
    </div>
  );
}

function TeamRoleFields({ data }: { data: AccreditationWorkspaceData }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-slate-900">
        Team roles involved
      </legend>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {teamRoleOptions.map((role) => (
          <label
            key={role}
            className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            <input
              defaultChecked={data.settings.teamRoles.includes(role)}
              name="teamRoles"
              type="checkbox"
              value={role}
            />
            {role}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
