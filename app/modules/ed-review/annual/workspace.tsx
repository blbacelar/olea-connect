"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FocusEvent } from "react";
import { Download, Plus, Save, Trash2 } from "lucide-react";

import { assignAnnualReviewRole, revokeAnnualReviewRole, saveAnnualReviewSection } from "./actions";
import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormSelect } from "@/components/ui/form-select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { getAnnualDocumentData } from "@/lib/data/ed-annual-document";
import { annualCompensationSchema, annualGeneralSchema, annualReviewDefaults, calculateAnnualReview,
  type AnnualCompetency, type AnnualReviewSection } from "@/lib/ed-review/annual-document";
import { annualFieldValue, annualText } from "@/lib/ed-review/annual-copy";
import { parseStandaloneEdReviewArchive } from "@/lib/ed-review/annual-html-import";

type Data = Awaited<ReturnType<typeof getAnnualDocumentData>>;
const sections = [
  { id: "cover", label: "Cover & Setup" }, { id: "self", label: "ED Self-Assessment" },
  { id: "chair", label: "Board Chair Assessment" }, { id: "summary", label: "Scoring Summary" },
  { id: "comp", label: "Compensation & Bonuses" }, { id: "dev", label: "Professional Development" },
  { id: "future", label: "Future Remuneration" }, { id: "signoff", label: "Agreed Actions & Sign-off" },
] as const;
const ratings = [{ value: "none", label: "Not rated" }, ...[1, 2, 3, 4, 5].map((value) =>
  ({ value: String(value), label: `${value} / 5` }))];
const currency = (cents: number, locale = "en-CA") =>
  new Intl.NumberFormat(locale, { style: "currency", currency: "CAD" }).format(cents / 100);
const emptyNarrative = { strengths: "", development: "", kpis: "", summary: "" };

function Field({ label, value, onChange, disabled, maxLength = 500, type = "text", hint }: {
  label: string; value: string; onChange: (value: string) => void; disabled: boolean;
  maxLength?: number; type?: string; hint?: string;
}) {
  const { locale } = useLocaleContext();
  return <label className="block space-y-1 text-sm font-medium">{annualText(locale, label)}
    <Input type={type} value={value} maxLength={maxLength} disabled={disabled}
      onChange={(event) => onChange(event.target.value)} placeholder={annualText(locale, hint || label)} />
    {hint ? <span className="block text-xs font-normal text-slate-500">{annualText(locale, hint)}</span> : null}
  </label>;
}

function Area({ label, value, onChange, disabled, hint, sourceDefault }: {
  label: string; value: string; onChange: (value: string) => void; disabled: boolean; hint?: string;
  sourceDefault?: string;
}) {
  const { locale } = useLocaleContext();
  return <label className="block space-y-1 text-sm font-medium">{annualText(locale, label)}
    <Textarea value={annualFieldValue(locale, value, sourceDefault)} maxLength={3000} disabled={disabled} onChange={(event) => onChange(event.target.value)}
      placeholder={annualText(locale, hint || label)} />
    {hint ? <span className="block text-xs font-normal text-slate-500">{annualText(locale, hint)}</span> : null}
  </label>;
}

function MoneyField({ label, cents, onChange, disabled }: {
  label: string; cents: number; onChange: (cents: number) => void; disabled: boolean;
}) {
  const { locale } = useLocaleContext();
  const [draft, setDraft] = useState((cents / 100).toFixed(2));
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setDraft((cents / 100).toFixed(2));
      setError(false);
    }
  }, [cents]);
  return <label className="block space-y-1 text-sm font-medium">{annualText(locale, label)} (CAD)
    <Input ref={inputRef} type="text" inputMode="decimal" value={draft} disabled={disabled} aria-invalid={error}
      data-currency-field="true" placeholder="0.00" onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        const valid = /^\d*(?:[.,]\d{0,2})?$/.test(next) && Number(next.replace(",", ".") || 0) <= 1_000_000_000;
        setError(!valid);
        if (valid) onChange(Math.round(Number(next.replace(",", ".") || 0) * 100));
      }} onBlur={() => { if (!error) setDraft((Number(draft.replace(",", ".") || 0)).toFixed(2)); }} />
    <span className={`block text-xs font-normal ${error ? "text-red-700" : "text-slate-500"}`}>
      {locale === "fr-CA" ? "Entrez un montant CAD positif avec au plus deux décimales, par exemple 1250,00." :
        "Enter a nonnegative CAD amount with at most two decimal places, such as 1250.00."}</span>
  </label>;
}

export function AnnualReviewWorkspace({ data }: { data: Data }) {
  const { locale } = useLocaleContext();
  const t = (value: string) => annualText(locale, value);
  const router = useRouter();
  const [active, setActive] = useState<AnnualReviewSection>("cover");
  const [cover, setCover] = useState(data.view.cover);
  const [competencies, setCompetencies] = useState(data.view.competencies);
  const [selfNarrative, setSelfNarrative] = useState(data.view.selfNarrative ?? emptyNarrative);
  const [chairNarrative, setChairNarrative] = useState(data.view.chairNarrative ?? emptyNarrative);
  const [development, setDevelopment] = useState(data.view.development);
  const [signoff, setSignoff] = useState(data.view.signoff);
  const [compensation, setCompensation] = useState(data.view.compensation);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [generalRevision, setGeneralRevision] = useState(data.generalRevision);
  const [compensationRevision, setCompensationRevision] = useState(data.compensationRevision);
  const [accessUser, setAccessUser] = useState("");
  const [accessRole, setAccessRole] = useState("ed");
  const [accessAssignments, setAccessAssignments] = useState(data.accessAssignments);
  const importInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mode = data.modes[active];
  const editable = mode === "edit" && active !== "summary";
  const currentSection = sections.find((section) => section.id === active)!;
  const defaultGeneral = annualReviewDefaults().general;
  const summary = data.role === "cfo" ? data.summary : calculateAnnualReview({ ...defaultGeneral,
    competencies, development: development ?? defaultGeneral.development }, compensation);
  const canShareFinance = (data.role === "chair" || data.role === "full") && Boolean(compensation);
  const financeLink = "/modules/ed-review/annual";

  function updateCompetency(id: string, patch: Partial<AnnualCompetency>) {
    setCompetencies((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  async function save() {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    if (!editable) return;
    const invalidMoney = document.querySelector<HTMLInputElement>('[data-currency-field="true"][aria-invalid="true"]');
    if (invalidMoney) {
      invalidMoney.focus();
      setMessage(locale === "fr-CA" ? "Corrigez le montant CAD surligné avant l’enregistrement." :
        "Correct the highlighted CAD amount before saving.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const section = active;
      const payload: Record<string, unknown> = {
        cover, self: { competencies: competencies.map(({ chairRating: _chairRating, chairEvidence: _chairEvidence, ...item }) => item),
          narrative: selfNarrative },
        chair: { ratings: competencies.map(({ id, chairRating, chairEvidence }) => ({ id, chairRating, chairEvidence })),
          narrative: chairNarrative },
        dev: development, signoff, comp: compensation,
        future: compensation ? { futureRemunerationEnabled: compensation.futureRemunerationEnabled,
          future: compensation.future } : null,
      };
      const revision = section === "comp" || section === "future"
        ? compensationRevision : generalRevision;
      const result = await saveAnnualReviewSection({ section, revision, data: payload[section] });
      setMessage(t(result.message));
      if (result.status === "success") {
        if (section === "comp" || section === "future") setCompensationRevision(result.revision);
        else setGeneralRevision(result.revision);
      }
    } catch (error) { setMessage(error instanceof Error ? t(error.message) : t("Could not save this section.")); }
    finally { setSaving(false); }
  }

  function scheduleAutoSave(event: FocusEvent<HTMLDivElement>) {
    if (!editable || saving) return;
    if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget as Node)) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    const saveCurrentSection = save;
    autoSaveTimerRef.current = setTimeout(() => void saveCurrentSection(), 1_000);
  }

  async function importArchive(file: File) {
    if (data.role !== "full") return;
    if (file.size > 1_000_000 || !file.name.toLowerCase().endsWith(".json")) {
      setMessage(locale === "fr-CA" ? "Choisissez une archive JSON de moins de 1 Mo." :
        "Choose a JSON archive smaller than 1 MB.");
      return;
    }
    setSaving(true);
    try {
      const decoded: unknown = JSON.parse(await file.text());
      if (!decoded || typeof decoded !== "object" || !("_type" in decoded) ||
        decoded._type !== "ed-review") {
        throw new Error("This file is not an ED annual review archive.");
      }
      const imported = "store" in decoded ? parseStandaloneEdReviewArchive(decoded) :
        "version" in decoded && decoded.version === 1 && "general" in decoded && "compensation" in decoded ?
          { general: annualGeneralSchema.parse(decoded.general),
            compensation: annualCompensationSchema.parse(decoded.compensation) } : null;
      if (!imported) throw new Error("This file is not an ED annual review archive.");
      const { general, compensation: importedCompensation } = imported;
      let nextGeneralRevision = generalRevision;
      for (const item of [
        { section: "cover" as const, data: general.cover },
        { section: "self" as const, data: { competencies: general.competencies.map(
          ({ chairRating: _chairRating, chairEvidence: _chairEvidence, ...competency }) => competency),
          narrative: general.selfNarrative } },
        { section: "chair" as const, data: { ratings: general.competencies.map(
          ({ id, chairRating, chairEvidence }) => ({ id, chairRating, chairEvidence })),
          narrative: general.chairNarrative } },
        { section: "dev" as const, data: general.development },
        { section: "signoff" as const, data: general.signoff },
      ]) {
        const result = await saveAnnualReviewSection({ ...item, revision: nextGeneralRevision });
        if (result.status !== "success") throw new Error(result.message);
        nextGeneralRevision = result.revision;
      }
      const compResult = await saveAnnualReviewSection({ section: "comp", revision: compensationRevision,
        data: importedCompensation });
      if (compResult.status !== "success") throw new Error(compResult.message);
      setCover(general.cover);
      setCompetencies(general.competencies);
      setSelfNarrative(general.selfNarrative);
      setChairNarrative(general.chairNarrative);
      setDevelopment(general.development);
      setSignoff(general.signoff);
      setCompensation(importedCompensation);
      setGeneralRevision(nextGeneralRevision);
      setCompensationRevision(compResult.revision);
      setMessage(locale === "fr-CA" ? "Archive importée et enregistrée. Vérifiez les sections." :
        "Archive imported and saved. Review the sections.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? t(error.message) : t("Could not import this archive."));
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return <main className="mx-auto min-w-0 max-w-[1400px] space-y-5 p-4 md:p-8">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><Button asChild variant="link" className="px-0"><Link href="/modules/ed-review">{locale === "fr-CA" ? "Retour à l’évaluation de la direction" : "Back to ED Review"}</Link></Button>
        <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-olea-green">{locale === "fr-CA" ? "Document annuel confidentiel" : "Confidential annual document"}</p>
        <h1 className="mt-1 text-3xl font-semibold">{locale === "fr-CA" ? "Évaluation annuelle de la direction générale" : "ED / CEO Annual Evaluation"}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {locale === "fr-CA" && data.cycle.title === "ED/CEO annual review"
            ? "Évaluation annuelle de la direction générale"
            : data.cycle.title} · {data.cycle.review_year} · {locale === "fr-CA"
            ? data.role === "full" ? "accès complet" : `accès : ${t(data.role)}`
            : `${t(data.role)} access`}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {data.previewing ? <Button asChild variant="outline"><Link href={financeLink}>
          {locale === "fr-CA" ? "Revenir à la vue de modification" : "Return to edit view"}</Link></Button> : null}
        <Button asChild variant="outline"><Link href={`/api/ed-review/annual/export${data.previewing ? "?preview=cfo" : ""}`} target="_blank" rel="noopener noreferrer">
          <Download className="size-4" />{locale === "fr-CA" ? "Télécharger le PDF à l’image de marque" : "Download branded PDF"}</Link></Button>
        <Button asChild variant="outline"><Link href={`/api/ed-review/annual/export?format=json${data.previewing ? "&preview=cfo" : ""}`} target="_blank"
          rel="noopener noreferrer"><Download className="size-4" />{locale === "fr-CA" ? "Télécharger le rapport JSON" : "Download report JSON"}</Link></Button>
        {data.role === "full" ? <>
          <Button asChild variant="outline"><Link href="/api/ed-review/annual/export?format=archive" target="_blank"
            rel="noopener noreferrer"><Download className="size-4" />{locale === "fr-CA" ? "Exporter l’archive JSON" : "Export editable JSON"}</Link></Button>
          <Input ref={importInputRef} type="file" accept=".json,application/json" className="hidden"
            aria-label={locale === "fr-CA" ? "Importer une archive JSON de l’évaluation" : "Import ED review JSON archive"}
            onChange={(event) => { const file = event.target.files?.[0]; event.target.value = "";
              if (file) void importArchive(file); }} />
          <Button type="button" variant="outline" disabled={saving} onClick={() => importInputRef.current?.click()}>
            {locale === "fr-CA" ? "Importer une archive" : "Import archive"}</Button>
        </> : null}
        {editable ? <Button type="button" disabled={saving} onClick={() => void save()}><Save className="size-4" />
          {saving ? (locale === "fr-CA" ? "Enregistrement..." : "Saving...") :
            locale === "fr-CA" ? `Enregistrer : ${t(currentSection.label)}` : `Save ${currentSection.label}`}</Button> : null}
      </div>
    </div>
    {message ? <p role="status" className="rounded-lg border bg-white p-3 text-sm">{message}</p> : null}
    <p className="text-xs text-slate-600">{locale === "fr-CA"
      ? "Le PDF contient les sections auxquelles vous avez accès et les dernières modifications enregistrées."
      : "The PDF includes your permitted sections and the latest saved changes."}</p>
    {data.role === "chair" || data.role === "full" ? <Card><CardHeader><CardTitle className="text-base">{locale === "fr-CA" ? "Accès au document" : "Document access"}</CardTitle></CardHeader>
      <CardContent className="space-y-4"><p className="text-sm text-slate-600">{locale === "fr-CA"
        ? "Attribuez un rôle à un membre actif. Les finances ne peuvent lire que les sections rémunération et rémunération future."
        : "Assign an active workspace member to the ED, administrator, finance, or template editor view. Finance can read only the compensation and future remuneration sections."}</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <FormSelect name="annual-access-user" value={accessUser} onValueChange={setAccessUser}
            ariaLabel={t("Member to assign")} placeholder={t("Choose a member")}
            options={data.availableMembers.map((item) => ({ value: item.userId, label: item.name }))} />
          <FormSelect name="annual-access-role" value={accessRole} onValueChange={setAccessRole}
            ariaLabel={t("Annual review role")} placeholder={t("Choose role")} options={[
              { value: "ed", label: t("Executive Director") }, { value: "admin", label: t("Board Administrator") },
              { value: "hr", label: t("Director, HR / People & Culture") },
              { value: "cfo", label: t("Finance / CFO") }, { value: "full", label: t("Full template editor") },
            ]} />
          <Button type="button" disabled={!accessUser} onClick={async () => {
            try { const result = await assignAnnualReviewRole({ userId: accessUser,
              role: accessRole as "ed" | "admin" | "hr" | "cfo" | "full" });
              setMessage(t(result.message));
              const memberName = data.availableMembers.find((item) => item.userId === accessUser)?.name ?? accessUser;
              setAccessAssignments((current) => [...current.filter((item) => item.userId !== accessUser),
                { userId: accessUser, role: accessRole, name: memberName }]);
              setAccessUser(""); }
            catch (error) { setMessage(error instanceof Error ? t(error.message) : t("Could not update access.")); }
          }}>{locale === "fr-CA" ? "Attribuer l’accès" : "Assign access"}</Button>
        </div>
        {accessAssignments.length ? <div className="flex flex-wrap gap-2">
          {accessAssignments.map((item) => <div key={item.userId} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
            <span>{item.name} · {item.role}</span>
            <Button type="button" size="sm" variant="ghost" onClick={async () => {
              try { const result = await revokeAnnualReviewRole(item.userId); setMessage(t(result.message));
                setAccessAssignments((current) => current.filter((assignment) => assignment.userId !== item.userId)); }
              catch (error) { setMessage(error instanceof Error ? t(error.message) : t("Could not remove access.")); }
            }}>{t("Remove")}</Button>
          </div>)}
        </div> : null}
      </CardContent></Card> : null}
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
      <nav aria-label={t("Annual review sections")} className="flex min-w-0 flex-col gap-1 self-start rounded-xl border bg-white p-2 lg:sticky lg:top-5">
        {sections.filter((section) => data.modes[section.id] !== "hide").map((section) =>
          <Button key={section.id} type="button" variant={active === section.id ? "secondary" : "ghost"}
            className="justify-start whitespace-normal text-left" onClick={() => { setActive(section.id); setMessage(""); }}>
            {t(section.label)}</Button>)}
      </nav>
      <Card className="min-w-0"><CardHeader className="flex flex-row items-center justify-between gap-2">
      <CardTitle>{t(currentSection.label)}</CardTitle>{mode === "read" ? <Badge variant="outline">{t("Read-only")}</Badge> : null}
      </CardHeader><CardContent className="min-w-0 space-y-5" onBlurCapture={scheduleAutoSave}>
        {active === "cover" && cover ? <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Organization" value={cover.organization} disabled={!editable}
            onChange={(value) => setCover({ ...cover, organization: value })} />
          <Field label="Executive Director / CEO" value={cover.edName} disabled={!editable}
            onChange={(value) => setCover({ ...cover, edName: value })} />
          <Field label="Board Chair" value={cover.chairName} disabled={!editable}
            onChange={(value) => setCover({ ...cover, chairName: value })} />
          <Field label="Review period" value={cover.period} disabled={!editable}
            onChange={(value) => setCover({ ...cover, period: value })} hint="For example: January–December 2026" />
          <Field label="Review date" type="date" value={cover.reviewDate} disabled={!editable}
            onChange={(value) => setCover({ ...cover, reviewDate: value })}
            hint="Choose the date of the review." />
          <Field label="Years in role" type="number" value={cover.yearsInRole === null ? "" : String(cover.yearsInRole)}
            disabled={!editable} onChange={(value) => setCover({ ...cover, yearsInRole: value === "" ? null : Number(value) })}
            hint="Enter a number from 0 to 100, such as 2.5." />
          <div className="space-y-2"><p className="text-sm font-medium">{t("360° feedback sources")}</p>
            {(["self", "board", "staff", "partners", "stakeholders"] as const).map((source) =>
              <label key={source} className="flex items-center gap-2 text-sm capitalize"><Checkbox disabled={!editable}
                checked={cover.sources.includes(source)} onChange={(event) => setCover({ ...cover,
                  sources: event.target.checked ? [...cover.sources, source] : cover.sources.filter((value) => value !== source) })} />
                {t(source === "self" ? "ED self-assessment" : source === "board" ? "Board / directors" :
                  source === "staff" ? "Staff survey" : source === "partners" ? "Partners / funders" : "Stakeholders / community")}</label>)}
          </div>
          <div className="sm:col-span-2"><Area label="360° themes" value={cover.themes} disabled={!editable}
            onChange={(value) => setCover({ ...cover, themes: value })} /></div>
        </div> : null}
        {active === "self" ? <div className="space-y-5">
          <p className="text-sm text-slate-600">{locale === "fr-CA"
            ? "Définissez les compétences et les preuves. Sans pondération, les compétences évaluées ont un poids égal."
            : "Define competencies and evidence. If no weight is entered, rated competencies share equal weight."}</p>
          {competencies.map((item, index) => <Card key={item.id}><CardHeader className="flex flex-row justify-between gap-2">
            <CardTitle className="text-base">{t(`Competency ${index + 1}`)}</CardTitle>
            {editable && competencies.length > 1 ? <Button type="button" size="sm" variant="ghost"
              onClick={() => setCompetencies(competencies.filter((other) => other.id !== item.id))}>
              <Trash2 className="size-4" />{t("Remove")}</Button> : null}
          </CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Competency name" value={item.name} disabled={!editable}
              onChange={(value) => updateCompetency(item.id, { name: value })} />
            <Field label="Weight %" value={item.weight === null ? "" : String(item.weight)}
              type="number" disabled={!editable} onChange={(value) => updateCompetency(item.id,
                { weight: value === "" ? null : Number(value) })} hint="0–100; leave all blank for equal weights" />
            <Area label="Description" value={item.description} disabled={!editable}
              onChange={(value) => updateCompetency(item.id, { description: value })} />
            <Area label="Linked KPIs" value={item.kpis} disabled={!editable}
              onChange={(value) => updateCompetency(item.id, { kpis: value })} />
            <label className="text-sm font-medium">{t("ED rating")}
              <FormSelect name={`self-rating-${item.id}`} disabled={!editable} value={item.selfRating === null ? "none" : String(item.selfRating)}
                onValueChange={(value) => updateCompetency(item.id, { selfRating: value === "none" ? null : Number(value) })}
                ariaLabel={`${t("ED rating for")} ${item.name || `${t("Competency")} ${index + 1}`}`} placeholder={t("Not rated")}
                options={ratings.map((rating) => ({ ...rating, label: t(rating.label) }))} />
            </label>
            <Area label="ED evidence" value={item.selfEvidence} disabled={!editable}
              onChange={(value) => updateCompetency(item.id, { selfEvidence: value })} />
          </CardContent></Card>)}
          {editable ? <Button type="button" variant="outline" onClick={() => setCompetencies([...competencies, {
            id: crypto.randomUUID(), name: "", description: "", kpis: "", weight: null,
            selfRating: null, selfEvidence: "", chairRating: null, chairEvidence: "",
          }])}><Plus className="size-4" />{t("Add competency")}</Button> : null}
          <NarrativeFields value={selfNarrative} disabled={!editable} onChange={setSelfNarrative} />
        </div> : null}
        {active === "chair" ? <div className="space-y-5">
          {competencies.map((item, index) => <Card key={item.id}><CardContent className="grid gap-4 p-5 sm:grid-cols-2">
            <div><h3 className="font-semibold">{item.name || `Competency ${index + 1}`}</h3>
              <p className="text-sm text-slate-600">{t("Weight")} {item.weight === null ? t("Equal") : `${item.weight}%`}</p>
              <p className="mt-2 text-sm">{item.kpis}</p></div>
            <label className="text-sm font-medium">{t("Chair rating")}
              <FormSelect name={`chair-rating-${item.id}`} disabled={!editable} value={item.chairRating === null ? "none" : String(item.chairRating)}
                onValueChange={(value) => updateCompetency(item.id, { chairRating: value === "none" ? null : Number(value) })}
                ariaLabel={`${t("Chair rating for")} ${item.name || `${t("Competency")} ${index + 1}`}`} placeholder={t("Not rated")}
                options={ratings.map((rating) => ({ ...rating, label: t(rating.label) }))} />
            </label>
            <div className="sm:col-span-2"><Area label="Chair evidence" value={item.chairEvidence} disabled={!editable}
              onChange={(value) => updateCompetency(item.id, { chairEvidence: value })} /></div>
          </CardContent></Card>)}
          <NarrativeFields value={chairNarrative} disabled={!editable} onChange={setChairNarrative} />
        </div> : null}
        {active === "summary" ? <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3"><Score label="ED weighted score" value={summary.selfScore} />
            <Score label="Chair weighted score" value={summary.chairScore} />
            <Score label="Overall gap" value={summary.gap} /></div>
          {summary.weightWarning ? <p className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
            {locale === "fr-CA" ? `La pondération totalise ${summary.weightTotal} %. Une somme de 100 % est recommandée.` :
              `Weights total ${summary.weightTotal}%. Review the weighting; a total of 100% is recommended.`}</p> : null}
          <div className="overflow-x-auto"><Table className="min-w-[680px]"><TableHeader><TableRow>
            <TableHead>{t("Competency")}</TableHead><TableHead>{t("Weight")}</TableHead><TableHead>ED</TableHead>
            <TableHead>{t("Chair")}</TableHead><TableHead>{t("Gap")}</TableHead><TableHead>{t("Interpretation")}</TableHead></TableRow></TableHeader><TableBody>
            {competencies.map((item, index) => {
              const row = summary.gaps.find((gap) => gap.id === item.id);
              return <TableRow key={item.id} className={row?.highlight ? "bg-orange-50" : ""}>
                <TableCell>{item.name || `Competency ${index + 1}`}</TableCell>
                <TableCell>{summary.anyWeightSet ? `${summary.effectiveWeights[index]}%` : t("Equal")}</TableCell>
                <TableCell>{item.selfRating ?? "—"}</TableCell><TableCell>{item.chairRating ?? "—"}</TableCell>
                <TableCell>{row?.gap ?? "—"}</TableCell><TableCell>{row?.gap === null || row?.gap === undefined ? "—" :
                  row.gap === 0 ? t("Fully aligned.") : Math.abs(row.gap) < 1 ?
                    row.gap > 0 ? t("Chair rates slightly higher.") : t("ED rates slightly higher.") :
                    row.gap > 0 ? t("Chair rates notably higher — ED may be underselling. Discuss.") :
                      t("ED rates notably higher — align on evidence. Discuss.")}</TableCell>
              </TableRow>;
            })}</TableBody></Table></div>
        </div> : null}
        {active === "comp" && compensation ? <CompensationFields value={compensation} disabled={!editable}
          score={summary.chairScore} activeBand={summary.activeBand} onChange={setCompensation} /> : null}
        {active === "comp" && canShareFinance && compensation ? <div className="flex flex-wrap gap-2 rounded-lg border p-4">
          <Button asChild variant="outline"><Link href={`${financeLink}?preview=cfo`} target="_blank">
            {locale === "fr-CA" ? "Prévisualiser la vue finances" : "Preview CFO view"}</Link></Button>
          <Button type="button" variant="outline" onClick={async () => {
            try {
              await navigator.clipboard.writeText(`${window.location.origin}${financeLink}`);
              setMessage(locale === "fr-CA" ? "Lien de la vue finances copié." : "CFO view link copied.");
            } catch {
              setMessage(locale === "fr-CA" ? "Impossible de copier le lien. Copiez l’adresse de cette page." :
                "Could not copy the link. Copy this page address instead.");
            }
          }}>{locale === "fr-CA" ? "Copier le lien finances" : "Copy CFO link"}</Button>
          <Button type="button" variant="outline" disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(compensation.cfoEmail)}
            onClick={() => {
              const subject = encodeURIComponent(locale === "fr-CA"
                ? `Rémunération à approuver — ${cover?.edName || "Direction générale"}`
                : `Compensation review for approval — ${cover?.edName || "Executive Director"}`);
              const body = encodeURIComponent(locale === "fr-CA"
                ? `La section de rémunération de l’évaluation annuelle de la direction générale est prête pour votre examen et son archivage.\n\nOuvrez votre vue (rémunération seulement) :\n${window.location.origin}${financeLink}\n\nL’accès exige votre connexion Olea Connects et l’attribution du rôle Finances.`
                : `The compensation section of the ED/CEO performance review is ready for your review and filing.\n\nOpen your view (compensation only):\n${window.location.origin}${financeLink}\n\nAccess requires your Olea Connects login and an assigned Finance/CFO role.`);
              window.location.href = `mailto:${encodeURIComponent(compensation.cfoEmail)}?subject=${subject}&body=${body}`;
            }}>{locale === "fr-CA" ? "Envoyer le lien aux finances" : "Email CFO their link"}</Button>
          <p className="w-full text-xs text-slate-600">{locale === "fr-CA"
            ? "Attribuez d’abord le rôle finances au membre. Le lien exige une connexion; il ne donne aucun accès à lui seul."
            : "Assign the Finance/CFO role to the member first. The link requires sign-in and grants no access by itself."}</p>
        </div> : null}
        {active === "dev" && development ? <DevelopmentFields value={development} disabled={!editable}
          competencies={competencies} onChange={setDevelopment} /> : null}
        {active === "future" && compensation ? <FutureFields value={compensation} disabled={!editable}
          onChange={setCompensation} /> : null}
        {active === "signoff" && signoff ? <SignoffFields value={signoff} disabled={!editable}
          onChange={setSignoff} /> : null}
        {active === "signoff" && (data.role === "chair" || data.role === "full") ?
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-slate-50 p-4">
            <div><h3 className="font-semibold">{t("Board in-camera pack")}</h3>
              <p className="text-sm text-slate-600">{t("Export the complete evaluation for the confidential Board session.")}</p></div>
            <Button asChild><Link href="/api/ed-review/annual/export" target="_blank" rel="noopener noreferrer">
              <Download className="size-4" />{t("Export full evaluation PDF")}</Link></Button>
          </div> : null}
      </CardContent></Card>
    </div>
  </main>;
}

function NarrativeFields({ value, onChange, disabled }: {
  value: typeof emptyNarrative; onChange: (value: typeof emptyNarrative) => void; disabled: boolean;
}) {
  const { locale } = useLocaleContext();
  return <div className="grid gap-4 sm:grid-cols-2">
    {(["strengths", "development", "kpis", "summary"] as const).map((key) =>
      <Area key={key} label={annualText(locale, key === "kpis" ? "KPI commentary" : key[0].toUpperCase() + key.slice(1))}
        value={value[key]} disabled={disabled} onChange={(text) => onChange({ ...value, [key]: text })} />)}
  </div>;
}

function Score({ label, value }: { label: string; value: number | null }) {
  const { locale } = useLocaleContext();
  return <div className="rounded-lg border p-4"><p className="text-xs text-slate-500">{annualText(locale, label)}</p>
    <p className="mt-1 text-2xl font-semibold">{value === null ? "—" : value.toFixed(2)}</p></div>;
}

function CompensationFields({ value, onChange, disabled, score, activeBand }: {
  value: NonNullable<Data["view"]["compensation"]>;
  onChange: (value: NonNullable<Data["view"]["compensation"]>) => void;
  disabled: boolean; score: number | null; activeBand: string | null;
}) {
  const { locale } = useLocaleContext();
  const t = (value: string) => annualText(locale, value);
  const newSalary = Math.round(value.currentSalaryCents * (1 + value.recommendedPercent / 100));
  return <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2">
      <MoneyField label="Current salary" cents={value.currentSalaryCents} disabled={disabled}
        onChange={(cents) => onChange({ ...value, currentSalaryCents: cents })} />
      <Field label="Last salary review date" type="date" value={value.lastReviewDate} disabled={disabled}
        onChange={(text) => onChange({ ...value, lastReviewDate: text })} hint="Choose the most recent salary review date." />
      <Field label="Last adjustment amount" value={value.lastAdjustment} disabled={disabled}
        onChange={(text) => onChange({ ...value, lastAdjustment: text })} hint="For example: 4% or CA$4,800." />
      <MoneyField label="Current total package" cents={value.totalPackageCents} disabled={disabled}
        onChange={(cents) => onChange({ ...value, totalPackageCents: cents })} />
      <div className="rounded-lg border p-4"><p className="text-xs text-slate-500">{t("Chair performance score")}</p>
        <p className="text-xl font-semibold">{score?.toFixed(2) ?? "—"} / 5</p></div>
      <Field label="Recommended adjustment %" type="number" value={String(value.recommendedPercent)}
        disabled={disabled} onChange={(text) => onChange({ ...value, recommendedPercent: Number(text) })}
        hint="Enter a percentage from -100 to 1000." />
    </div>
    <div className="rounded-lg border p-4"><p className="text-sm font-medium">{t("Recommended new salary")}</p>
      <p className="mt-1 text-2xl font-semibold">{currency(newSalary, locale)}</p></div>
    <div className="space-y-3"><h3 className="font-semibold">{t("Salary band matrix")}</h3>
      {value.bands.map((band) => <div key={band.id} className={`grid gap-2 rounded-lg border p-3 sm:grid-cols-3 ${band.id === activeBand ? "border-olea-green bg-olea-light" : ""}`}>
        <div className="space-y-1 text-sm"><p className="font-medium">{t("Score range")}</p><p>{band.range}</p></div>
        <div className="space-y-1 text-sm"><p className="font-medium">{t("Level")}</p><p>{t(band.label)}</p></div>
        <Field label="Suggested adjustment" value={band.adjustment} disabled={disabled}
          onChange={(text) => onChange({ ...value, bands: value.bands.map((item) =>
            item.id === band.id ? { ...item, adjustment: text } : item) })} />
      </div>)}
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Effective date" type="date" value={value.effectiveDate} disabled={disabled}
        onChange={(text) => onChange({ ...value, effectiveDate: text })} hint="Date the recommended adjustment starts." />
      <Area label="Rationale" value={value.rationale} disabled={disabled}
        onChange={(text) => onChange({ ...value, rationale: text })}
        hint="Board Chair's rationale for the recommended adjustment." />
      <Field label="Board approval date" type="date" value={value.boardApprovalDate} disabled={disabled}
        onChange={(text) => onChange({ ...value, boardApprovalDate: text })} hint="Choose the date of Board approval." />
      <Field label="Approved by (Chair)" value={value.approvedBy} disabled={disabled}
        onChange={(text) => onChange({ ...value, approvedBy: text })} />
      <Field label="Board minute reference #" value={value.minuteReference} disabled={disabled}
        onChange={(text) => onChange({ ...value, minuteReference: text })} />
      <Field label="CFO / Finance name" value={value.cfoName} disabled={disabled}
        onChange={(text) => onChange({ ...value, cfoName: text })} />
      <Field label="CFO / Finance email" type="email" value={value.cfoEmail} disabled={disabled}
        onChange={(text) => onChange({ ...value, cfoEmail: text })} hint="A valid email address is required before sharing access." />
    </div>
    <label className="flex items-center gap-2 text-sm"><Checkbox checked={value.milestoneBonusesEnabled} disabled={disabled}
      onChange={(event) => onChange({ ...value, milestoneBonusesEnabled: event.target.checked })} />{t("Milestone bonuses")}</label>
    {value.milestoneBonusesEnabled ? <div className="space-y-3">
      {value.milestoneBonuses.map((item, index) => <div key={item.id} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-4">
        {!disabled ? <Button type="button" variant="ghost" size="sm" className="sm:col-span-3 justify-self-end"
          onClick={() => onChange({ ...value, milestoneBonuses: value.milestoneBonuses.filter((row) => row.id !== item.id) })}>
          <Trash2 className="size-4" />{t("Remove milestone")}</Button> : null}
        <Field label={`Milestone ${index + 1}`} value={item.title} disabled={disabled}
          onChange={(text) => onChange({ ...value, milestoneBonuses: value.milestoneBonuses.map((row) =>
            row.id === item.id ? { ...row, title: text } : row) })} />
        <Field label="Target" value={item.target} disabled={disabled}
          onChange={(text) => onChange({ ...value, milestoneBonuses: value.milestoneBonuses.map((row) =>
            row.id === item.id ? { ...row, target: text } : row) })} hint="For example: Q2 2027." />
        <MoneyField label="Amount" cents={item.amountCents} disabled={disabled}
          onChange={(cents) => onChange({ ...value, milestoneBonuses: value.milestoneBonuses.map((row) =>
            row.id === item.id ? { ...row, amountCents: cents } : row) })} />
        <label className="text-sm font-medium">{t("Status")}<FormSelect name={`milestone-${item.id}`} disabled={disabled} value={item.status}
          onValueChange={(status) => onChange({ ...value, milestoneBonuses: value.milestoneBonuses.map((row) =>
            row.id === item.id ? { ...row, status: status as typeof item.status } : row) })}
          ariaLabel={`${t("Status for milestone")} ${index + 1}`} placeholder={t("Choose status")} options={[
            { value: "not_started", label: t("Not started") }, { value: "in_progress", label: t("In progress") },
            { value: "pending", label: t("Pending") }, { value: "achieved", label: t("Achieved") },
            { value: "paid", label: t("Paid") }]} /></label>
      </div>)}
      <p className="rounded-lg bg-olea-light p-3 text-sm font-semibold">{t("Total achieved / paid this year")}: {currency(
        value.milestoneBonuses.filter((item) => item.status === "achieved" || item.status === "paid")
          .reduce((sum, item) => sum + item.amountCents, 0), locale)}</p>
      {!disabled ? <Button type="button" variant="outline" onClick={() => onChange({ ...value,
        milestoneBonuses: [...value.milestoneBonuses, { id: crypto.randomUUID(), title: "", target: "", amountCents: 0, status: "not_started" }] })}>
        <Plus className="size-4" />{t("Add milestone")}</Button> : null}
    </div> : null}
  </div>;
}

function DevelopmentFields({ value, onChange, disabled, competencies }: {
  value: NonNullable<Data["view"]["development"]>;
  onChange: (value: NonNullable<Data["view"]["development"]>) => void;
  disabled: boolean; competencies: AnnualCompetency[];
}) {
  const { locale } = useLocaleContext();
  const t = (value: string) => annualText(locale, value);
  return <div className="space-y-6">
    {(["smartGoals", "growthGoals"] as const).map((list) => <section key={list} className="space-y-3">
      <h3 className="font-semibold">{t(list === "smartGoals" ? "SMART goals" : "Growth goals")}</h3>
      {value[list].map((goal, index) => <Card key={goal.id}><CardContent className="grid gap-4 p-4 sm:grid-cols-2">
        {!disabled ? <Button type="button" variant="ghost" size="sm" className="sm:col-span-2 justify-self-end"
          onClick={() => onChange({ ...value, [list]: value[list].filter((item) => item.id !== goal.id) })}>
          <Trash2 className="size-4" />{t("Remove goal")}</Button> : null}
        <Field label={`Goal ${index + 1}`} value={goal.goal} disabled={disabled}
          onChange={(text) => onChange({ ...value, [list]: value[list].map((item) => item.id === goal.id ? { ...item, goal: text } : item) })} />
        {list === "growthGoals" ? <Field label="Development area" value={goal.area} disabled={disabled}
          onChange={(text) => onChange({ ...value, [list]: value[list].map((item) => item.id === goal.id ? { ...item, area: text } : item) })} /> : null}
        <Field label="Due date" type="date" value={goal.dueOn} disabled={disabled}
          onChange={(text) => onChange({ ...value, [list]: value[list].map((item) => item.id === goal.id ? { ...item, dueOn: text } : item) })} />
        {list === "smartGoals" ? <>
          <Area label="Specific & Measurable" value={goal.measure} disabled={disabled}
            onChange={(text) => onChange({ ...value, [list]: value[list].map((item) => item.id === goal.id ? { ...item, measure: text } : item) })} />
          <Area label="Achievable & Relevant" value={goal.relevant} disabled={disabled}
            onChange={(text) => onChange({ ...value, [list]: value[list].map((item) => item.id === goal.id ? { ...item, relevant: text } : item) })} />
        </> : <Field label="How" value={goal.method} disabled={disabled}
          onChange={(text) => onChange({ ...value, [list]: value[list].map((item) => item.id === goal.id ? { ...item, method: text } : item) })} />}
        {list === "smartGoals" ? <><label className="text-sm font-medium">{t("Linked competency")}
          <FormSelect name={`goal-competency-${goal.id}`} disabled={disabled} value={goal.linkedCompetencyId || "none"}
            onValueChange={(selected) => onChange({ ...value, [list]: value[list].map((item) =>
              item.id === goal.id ? { ...item, linkedCompetencyId: selected === "none" ? "" : selected } : item) })}
            ariaLabel={`${t("Linked competency for goal")} ${index + 1}`} placeholder={t("Choose competency")}
            options={[{ value: "none", label: t("No competency") }, ...competencies.map((item) =>
              ({ value: item.id, label: item.name || item.id }))]} />
        </label>
        <Area label="Progress at next review" value={goal.progress} disabled={disabled}
          onChange={(text) => onChange({ ...value, [list]: value[list].map((item) => item.id === goal.id ? { ...item, progress: text } : item) })} />
        </> : null}
      </CardContent></Card>)}
      {!disabled ? <Button type="button" variant="outline" onClick={() => onChange({ ...value, [list]: [...value[list],
        { id: crypto.randomUUID(), goal: "", detail: "", linkedCompetencyId: "", dueOn: "", progress: "",
          area: "", method: "", measure: "", relevant: "" }] })}>
        <Plus className="size-4" />{t("Add goal")}</Button> : null}
    </section>)}
    <section className="space-y-3"><h3 className="font-semibold">{t("External development activities")}</h3>
      {value.external.map((item, index) => <div key={item.id} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
        {!disabled ? <Button type="button" variant="ghost" size="sm" className="sm:col-span-2 justify-self-end"
          onClick={() => onChange({ ...value, external: value.external.filter((row) => row.id !== item.id) })}>
          <Trash2 className="size-4" />{t("Remove activity")}</Button> : null}
        <Field label={`Activity ${index + 1}`} value={item.activity} disabled={disabled}
          onChange={(text) => onChange({ ...value, external: value.external.map((row) => row.id === item.id ? { ...row, activity: text } : row) })} />
        <Field label="Provider" value={item.provider} disabled={disabled}
          onChange={(text) => onChange({ ...value, external: value.external.map((row) => row.id === item.id ? { ...row, provider: text } : row) })} />
        <Field label="Dates" value={item.dates} disabled={disabled}
          onChange={(text) => onChange({ ...value, external: value.external.map((row) => row.id === item.id ? { ...row, dates: text } : row) })}
          hint="For example: January–March 2027." />
        <MoneyField label="Cost" cents={item.costCents} disabled={disabled}
          onChange={(cents) => onChange({ ...value, external: value.external.map((row) => row.id === item.id ? { ...row, costCents: cents } : row) })} />
        <label className="text-sm font-medium">{t("Approved")}
          <FormSelect name={`external-approved-${item.id}`} disabled={disabled} value={item.approved || "none"}
            onValueChange={(selected) => onChange({ ...value, external: value.external.map((row) =>
              row.id === item.id ? { ...row, approved: selected === "none" ? "" : selected as "yes" | "pending" } : row) })}
            ariaLabel={`${t("Approval for external activity")} ${index + 1}`} placeholder={t("Select approval")}
            options={[{ value: "none", label: t("Not set") }, { value: "yes", label: t("Yes") },
              { value: "pending", label: t("Pending") }]} />
        </label>
      </div>)}
      <p className="text-sm font-medium">{locale === "fr-CA" ? "Coût total" : "Total cost"}: {currency(value.external.reduce((sum, item) => sum + item.costCents, 0), locale)}</p>
      {!disabled ? <Button type="button" variant="outline" onClick={() => onChange({ ...value,
        external: [...value.external, { id: crypto.randomUUID(), activity: "", provider: "", dates: "",
          approved: "", costCents: 0 }] })}>
        <Plus className="size-4" />{t("Add activity")}</Button> : null}
    </section>
    <div className="grid gap-4 sm:grid-cols-2">
      {(["edReflection", "chairReflection", "commitments", "investment"] as const).map((key) =>
        <Area key={key} label={{ edReflection: "ED reflection", chairReflection: "Chair reflection",
          commitments: "Commitments", investment: "Investment" }[key]}
          value={value[key]} disabled={disabled} onChange={(text) => onChange({ ...value, [key]: text })} />)}
    </div>
  </div>;
}

function FutureFields({ value, onChange, disabled }: {
  value: NonNullable<Data["view"]["compensation"]>;
  onChange: (value: NonNullable<Data["view"]["compensation"]>) => void; disabled: boolean;
}) {
  const { locale } = useLocaleContext();
  const sourceDefaults = annualReviewDefaults().compensation.future;
  return <div className="space-y-4">
    <label className="flex items-center gap-2 text-sm"><Checkbox checked={value.futureRemunerationEnabled} disabled={disabled}
      onChange={(event) => onChange({ ...value, futureRemunerationEnabled: event.target.checked })} />
      {annualText(locale, "Include future remuneration")}</label>
    {value.futureRemunerationEnabled ? <div className="grid gap-4 sm:grid-cols-2">
      {(Object.keys(value.future) as Array<keyof typeof value.future>).map((key) =>
        <Area key={key} label={annualText(locale, key.replace(/([A-Z])/g, " $1"))}
          value={value.future[key]} sourceDefault={sourceDefaults[key]} disabled={disabled} onChange={(text) => onChange({ ...value,
            future: { ...value.future, [key]: text } })} />)}
    </div> : null}
  </div>;
}

function SignoffFields({ value, onChange, disabled }: {
  value: NonNullable<Data["view"]["signoff"]>;
  onChange: (value: NonNullable<Data["view"]["signoff"]>) => void; disabled: boolean;
}) {
  const { locale } = useLocaleContext();
  const t = (value: string) => annualText(locale, value);
  return <div className="space-y-5">
    <h3 className="font-semibold">{t("Agreed actions")}</h3>
    {value.actions.map((item, index) => <div key={item.id} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-3">
      {!disabled ? <Button type="button" variant="ghost" size="sm" className="sm:col-span-3 justify-self-end"
        onClick={() => onChange({ ...value, actions: value.actions.filter((row) => row.id !== item.id) })}>
        <Trash2 className="size-4" />{t("Remove action")}</Button> : null}
      <Field label={`Action ${index + 1}`} value={item.action} disabled={disabled}
        onChange={(text) => onChange({ ...value, actions: value.actions.map((row) => row.id === item.id ? { ...row, action: text } : row) })} />
      <Field label="Detail / expected outcome" value={item.detail} disabled={disabled}
        onChange={(text) => onChange({ ...value, actions: value.actions.map((row) => row.id === item.id ? { ...row, detail: text } : row) })} />
      <Field label="Owner" value={item.owner} disabled={disabled}
        onChange={(text) => onChange({ ...value, actions: value.actions.map((row) => row.id === item.id ? { ...row, owner: text } : row) })} />
      <Field label="Due date" type="date" value={item.dueOn} disabled={disabled}
        onChange={(text) => onChange({ ...value, actions: value.actions.map((row) => row.id === item.id ? { ...row, dueOn: text } : row) })} />
    </div>)}
    {!disabled ? <Button type="button" variant="outline" onClick={() => onChange({ ...value,
      actions: [...value.actions, { id: crypto.randomUUID(), action: "", detail: "", owner: "", dueOn: "" }] })}>
      <Plus className="size-4" />{t("Add action")}</Button> : null}
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Overall judgement" value={value.judgement} disabled={disabled}
        onChange={(text) => onChange({ ...value, judgement: text })} />
      <Area label="Key message" value={value.keyMessage} disabled={disabled}
        onChange={(text) => onChange({ ...value, keyMessage: text })} />
      <Area label="Priorities" value={value.priorities} disabled={disabled}
        onChange={(text) => onChange({ ...value, priorities: text })} />
      <Field label="Chair signature name" value={value.chairName} disabled={disabled}
        onChange={(text) => onChange({ ...value, chairName: text })} />
      <Field label="Chair signature date" type="date" value={value.chairDate} disabled={disabled}
        onChange={(text) => onChange({ ...value, chairDate: text })} />
      <Field label="ED signature name" value={value.edName} disabled={disabled}
        onChange={(text) => onChange({ ...value, edName: text })} />
      <Field label="ED signature date" type="date" value={value.edDate} disabled={disabled}
        onChange={(text) => onChange({ ...value, edDate: text })} />
    </div>
  </div>;
}
