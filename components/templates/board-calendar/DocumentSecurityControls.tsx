"use client";

import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { Checkbox } from "@/components/ui/checkbox";
import { getBoardCalendarSecurity } from "@/lib/template-renderer/board-calendar-security";
import type { FieldPath, TemplateFormData, TemplateValue } from "@/lib/template-renderer/types";

const controls = [
  ["requireAck", "Require acknowledgment before download", "Demander une confirmation avant le téléchargement", "Readers confirm that board documents are confidential before opening them.", "Les lecteurs confirment la confidentialité des documents du conseil avant de les ouvrir."],
  ["logAccess", "Log every download", "Journaliser chaque téléchargement", "Record who downloaded a board document or package and when.", "Consigner qui a téléchargé un document ou un dossier du conseil, et quand."],
  ["watermark", "Watermark exported PDFs", "Filigraner les PDF exportés", "Stamp the reader’s name on generated board meeting PDFs.", "Inscrire le nom du lecteur sur les PDF de réunion générés."],
] as const;

export function DocumentSecurityControls({ data, onChange }: {
  data: TemplateFormData;
  onChange: (path: FieldPath, value: TemplateValue) => void;
}) {
  const french = useLocaleContext().locale === "fr-CA";
  const security = getBoardCalendarSecurity(data);
  return <fieldset className="space-y-3 rounded-xl border p-4">
    <legend className="px-1 text-base font-semibold">{french ? "Sécurité des documents" : "Document security"}</legend>
    {controls.map(([key, enLabel, frLabel, enHelp, frHelp]) => (
      <label key={key} className="flex items-start gap-3 rounded-lg border bg-slate-50 p-3">
        <Checkbox
          aria-label={french ? frLabel : enLabel}
          checked={security[key]}
          onChange={(event) => onChange(["security", key], event.target.checked)}
        />
        <span><span className="block text-sm font-medium">{french ? frLabel : enLabel}</span>
          <span className="block text-xs leading-5 text-slate-600">{french ? frHelp : enHelp}</span></span>
      </label>
    ))}
  </fieldset>;
}
