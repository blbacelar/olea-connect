"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { ClipboardCopy, Download, QrCode } from "lucide-react";

import { addStakeholderResultsToWorkbook, closeStakeholderSurvey, createStakeholderSurvey,
  reopenStakeholderSurvey, updateStakeholderSurvey,
  type SurveyActionState } from "@/app/modules/strategic-planning/survey/actions";
import { Badge } from "@/components/ui/badge";
import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { translateFrenchUiText } from "@/lib/i18n/french-runtime-translations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FormSelect } from "@/components/ui/form-select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { getStakeholderSurveyManagementData } from "@/lib/data/strategic-stakeholder-surveys";
import { questionsForAudience, stakeholderAudiences, stakeholderThemes } from "@/lib/strategic-planning/stakeholder-survey";

type Data = Awaited<ReturnType<typeof getStakeholderSurveyManagementData>>;
const idle: SurveyActionState = { status: "idle", message: "" };

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? "Saving..." : label}</Button>;
}

function Notice({ state }: { state: SurveyActionState }) {
  return state.message ? <p role={state.status === "error" ? "alert" : "status"}
    className="rounded-lg border bg-white p-3 text-sm">{state.message}</p> : null;
}

function CopyLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const href = `/modules/strategic-planning/survey/${token}`;
  return <div className="flex flex-wrap gap-2">
    <Input aria-label="Anonymous survey link" value={href} readOnly className="max-w-xl" />
    <Button type="button" variant="outline" onClick={async () => {
      try { await navigator.clipboard.writeText(`${window.location.origin}${href}`); setCopied(true); setError(""); }
      catch { setError("Could not copy the link. Select and copy it manually."); }
    }}><ClipboardCopy className="size-4" />{copied ? "Copied" : "Copy link"}</Button>
    <Button type="button" variant="outline" onClick={async () => {
      try {
        const { toDataURL } = await import("qrcode");
        const image = await toDataURL(`${window.location.origin}${href}`, { margin: 2, width: 512 });
        const link = document.createElement("a"); link.href = image; link.download = "stakeholder-survey-qr.png";
        link.click(); setError("");
      } catch { setError("Could not generate the QR code. Copy the link instead."); }
    }}><QrCode className="size-4" />Download QR code</Button>
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
  </div>;
}

function ChangeSurveyStatus({ id, status }: { id: string; status: "open" | "closed" }) {
  const [state, action] = useFormState(status === "open" ? closeStakeholderSurvey : reopenStakeholderSurvey, idle);
  return <form action={action} className="flex items-center gap-2">
    <Input type="hidden" name="surveyId" value={id} readOnly />
    <Submit label={status === "open" ? "Close survey" : "Reopen survey"} /><Notice state={state} />
  </form>;
}

function EditSurvey({ survey }: { survey: Data["surveys"][number] }) {
  const [state, action] = useFormState(updateStakeholderSurvey, idle);
  return <Dialog><DialogTrigger asChild><Button type="button" variant="outline" size="sm">Edit survey</Button></DialogTrigger>
    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>Edit survey</DialogTitle>
        <DialogDescription>Change the title, instructions, and question wording. The existing link and responses stay in place.</DialogDescription>
      </DialogHeader>
      <form action={action} className="space-y-4">
        <Input type="hidden" name="surveyId" value={survey.id} readOnly />
        <Notice state={state} />
        <label className="block text-sm font-medium">Survey title
          <Input name="title" defaultValue={survey.title} minLength={3} maxLength={160} required className="mt-1" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">Reply by
            <Input name="deadline" type="date" defaultValue={survey.details?.deadline || ""} className="mt-1" />
          </label>
          <label className="text-sm font-medium">Survey closes on
            <Input name="closesAt" type="date" defaultValue={survey.details?.closesAt || ""} className="mt-1" />
          </label>
          <label className="text-sm font-medium">Contact person
            <Input name="contact" defaultValue={survey.details?.contact || ""} maxLength={500} className="mt-1" />
          </label>
        </div>
        <label className="block text-sm font-medium">Introduction
          <Textarea name="intro" defaultValue={survey.details?.intro || ""} maxLength={3000} rows={3} className="mt-1" />
        </label>
        <label className="block text-sm font-medium">How people respond
          <Input name="returnInstructions" defaultValue={survey.details?.returnInstructions || ""} maxLength={500} className="mt-1" />
        </label>
        <label className="block text-sm font-medium">Anonymous responses notice
          <FormSelect name="anonymous" defaultValue={survey.details?.anonymous === false ? "off" : "on"}
            ariaLabel="Anonymous responses notice" placeholder="Choose notice"
            options={[{ value: "on", label: "Show anonymity notice" }, { value: "off", label: "Hide anonymity notice" }]} />
        </label>
        <p className="text-xs text-slate-600">Hosted responses never collect names or email addresses. This setting only shows or hides the privacy notice.</p>
        <h3 className="font-semibold">Question wording</h3>
        {survey.questions.map((question) => <label key={question.id} className="block text-sm font-medium">
          {question.id}<Input name={`questionText:${question.id}`} defaultValue={question.text}
            minLength={5} maxLength={500} required className="mt-1" /></label>)}
        <Submit label="Save survey changes" />
      </form>
    </DialogContent></Dialog>;
}

function SurveyInvitation({ survey }: { survey: Data["surveys"][number] }) {
  const { locale } = useLocaleContext();
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const greeting = stakeholderAudiences.find((item) => item.v === survey.audience)?.g || "Hello,";
  const link = `${origin}/modules/strategic-planning/survey/${survey.public_token}`;
  const invitation = locale === "fr-CA" ?
    `Bonjour,\n\nNous vous invitons à contribuer à notre plan stratégique en répondant au sondage « ${survey.title} ».\n\n${survey.details?.intro || "Vos commentaires nous aideront à choisir nos priorités pour les prochaines années."}\n\nRépondre au sondage : ${link}\n${survey.details?.deadline ? `Répondre avant le : ${survey.details.deadline}\n` : ""}${survey.details?.anonymous === false ? "" : "Vos réponses sont anonymes.\n"}${survey.details?.contact ? `Des questions? Communiquez avec ${survey.details.contact}.\n` : ""}\nMerci de partager votre point de vue.` :
    `${greeting}\n\nWe invite you to help shape our strategic plan by completing ${survey.title}.\n\n${survey.details?.intro || "Your feedback will help us decide where to focus in the years ahead."}\n\nComplete the survey: ${link}\n${survey.details?.deadline ? `Reply by: ${survey.details.deadline}\n` : ""}${survey.details?.anonymous === false ? "" : "Your responses are anonymous.\n"}${survey.details?.contact ? `Questions? Contact ${survey.details.contact}.\n` : ""}\nThank you for sharing your perspective.`;
  return <div className="space-y-2">
    <label className="block text-sm font-medium">Invitation email
      <Textarea readOnly value={invitation} rows={8} className="mt-1" />
    </label>
    <Button type="button" variant="outline" size="sm" onClick={async () => {
      try { await navigator.clipboard.writeText(invitation); setCopied(true); setCopyError(""); }
      catch { setCopyError("Could not copy the invitation. Select and copy it manually."); }
    }}><ClipboardCopy className="size-4" />{copied ? "Invitation copied" : "Copy invitation"}</Button>
    {copyError ? <p role="alert" className="text-sm text-red-700">{copyError}</p> : null}
  </div>;
}

function SurveyToolText({ survey }: { survey: Data["surveys"][number] }) {
  const { locale } = useLocaleContext();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const t = (value: string) => locale === "fr-CA" ? translateFrenchUiText(value) : value;
  const content = survey.questions.map((question, index) => {
    const answerType = { open: "Open answer", agree: "Agree or disagree (1–5)", rating: "Rating (1–5)",
      choice: "Choose one", multi: "Choose up to three" }[question.type];
    return `${index + 1}. ${t(question.text)}\n${t(answerType)}${question.options.length ?
      `\n${question.options.map((option) => `- ${t(option)}`).join("\n")}` : ""}`;
  }).join("\n\n");
  return <Dialog><DialogTrigger asChild><Button type="button" size="sm" variant="outline">Text for online survey tools</Button></DialogTrigger>
    <DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Text for online survey tools</DialogTitle>
      <DialogDescription>Copy the question text into Google Forms, Microsoft Forms, or another survey tool.</DialogDescription>
    </DialogHeader>
    <Textarea readOnly value={content} rows={16} />
    <Button type="button" variant="outline" onClick={async () => {
      try { await navigator.clipboard.writeText(content); setCopied(true); setCopyError(""); }
      catch { setCopyError("Could not copy the text. Select and copy it manually."); }
    }}><ClipboardCopy className="size-4" />{copied ? "Copied" : "Copy text"}</Button>
    {copyError ? <p role="alert" className="text-sm text-red-700">{copyError}</p> : null}
  </DialogContent></Dialog>;
}

function AddResults({ id }: { id: string }) {
  const [state, action] = useFormState(addStakeholderResultsToWorkbook, idle);
  return <form action={action} className="space-y-2">
    <Input type="hidden" name="surveyId" value={id} readOnly />
    <Submit label="Add aggregate results to What we heard (2D)" />
    <Notice state={state} />
  </form>;
}

export function StakeholderSurveys({ data }: { data: Data }) {
  const [state, action] = useFormState(createStakeholderSurvey, idle);
  const [audience, setAudience] = useState("board");
  const [audiences, setAudiences] = useState<string[]>(["board", "staff", "volunteers", "clients", "partners"]);
  const [wordingById, setWordingById] = useState<Record<string, string>>({});
  const [customCount, setCustomCount] = useState(3);
  useEffect(() => {
    if (audience !== "everyone" && !audiences.includes(audience)) setAudience(audiences[0] || "everyone");
  }, [audience, audiences]);
  const questionBank = questionsForAudience(audience, data.equityOn, data.organizationName || "your organization");
  const [selectedByAudience, setSelectedByAudience] = useState<Record<string, string[]>>({});
  const selected = selectedByAudience[audience] ?? questionBank.filter((question) => question.defaultOn)
    .map((question) => question.id);
  if (!data.hasAccess || !data.canManage) return <main className="space-y-4">
    <h1 className="text-2xl font-semibold">Stakeholder surveys</h1>
    <p>An organization owner or administrator with Strategic Planning access can publish surveys.</p>
    <Button asChild variant="outline"><Link href="/modules/strategic-planning/workbook">Back to workbook</Link></Button>
  </main>;

  return <main className="space-y-6">
    <div><Button asChild variant="link" className="px-0"><Link href="/modules/strategic-planning/workbook">Back to workbook</Link></Button>
      <h1 className="text-3xl font-semibold">Stakeholder surveys</h1>
      <p className="mt-2 text-sm text-slate-600">Choose your audiences, tailor their questions, then publish separate versions and a general survey.</p>
    </div>
    <Card><CardHeader><CardTitle>Publish a survey</CardTitle></CardHeader>
      <CardContent><form action={action} className="space-y-5">
        <Notice state={state} />{state.links?.map((link) => <div key={link.token} className="space-y-1">
          <p className="text-sm font-medium">{stakeholderAudiences.find((item) => item.v === link.audience)?.l || "General (everyone)"}</p>
          <CopyLink token={link.token} />
        </div>)}
        <section className="space-y-2 rounded-lg border p-4">
          <h2 className="font-semibold">1. Who are you surveying?</h2>
          <p className="text-sm text-slate-600">Each group gets its own version. A general version is included for everyone.</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{stakeholderAudiences.map((item) =>
            <label key={item.v} className="flex items-center gap-2 text-sm"><Checkbox checked={audiences.includes(item.v)}
              onChange={(event) => setAudiences((current) => event.target.checked ? [...current, item.v] : current.filter((id) => id !== item.v))} />
              {item.l}</label>)}</div>
          {audiences.map((id) => <Input key={id} type="hidden" name="audience" value={id} readOnly />)}
        </section>
        <section className="space-y-3 rounded-lg border p-4"><h2 className="font-semibold">2. Survey details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">Survey title
            <Input name="title" required minLength={3} maxLength={160} className="mt-2"
              placeholder="2026 Strategic Planning Survey" />
          </label>
          <label className="text-sm font-medium">Reply by
            <Input type="date" name="deadline" className="mt-2" aria-label="Reply by date" />
          </label>
          <label className="text-sm font-medium">Survey closes on
            <Input type="date" name="closesAt" className="mt-2" aria-label="Survey close date" />
          </label>
        </div>
        <label className="block text-sm font-medium">Introduction
          <Textarea name="intro" maxLength={3000} rows={3} className="mt-2"
            placeholder="Tell people why you are gathering feedback and how long the survey takes." />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">How people respond
            <Input name="returnInstructions" maxLength={500} className="mt-2"
              placeholder="Online survey link, email, or drop-off location" />
          </label>
          <label className="text-sm font-medium">Contact person
            <Input name="contact" maxLength={500} className="mt-2" placeholder="Name, email, or phone" />
          </label>
        </div>
        <label className="block text-sm font-medium">Anonymous responses
          <FormSelect name="anonymous" defaultValue="on" ariaLabel="Anonymous responses"
            placeholder="Choose privacy notice" options={[{ value: "on", label: "Yes, tell people answers are anonymous" },
              { value: "off", label: "No anonymity notice" }]} />
        </label></section>
        <p className="text-xs text-slate-600">Hosted responses never collect names or email addresses. This setting only shows or hides the privacy notice.</p>
        <section className="space-y-3 rounded-lg border p-4"><h2 className="font-semibold">3. Choose your questions</h2>
        <label className="block text-sm font-medium">Preview questions for
          <FormSelect name="previewAudience" value={audience} onValueChange={setAudience} ariaLabel="Preview questions for"
            placeholder="Choose audience" options={[...audiences.map((id) => ({ value: id,
              label: stakeholderAudiences.find((item) => item.v === id)?.l || id })),
              { value: "everyone", label: "General (everyone)" }]} />
        </label>
        <p className="text-sm">{selected.length} questions selected. You can include a subset of the questions available to this audience.</p>
        {stakeholderThemes.map(([theme, heading]) => {
          const questions = questionBank.filter((question) => question.theme === theme);
          if (!questions.length) return null;
          return <section key={theme} className="space-y-3 rounded-lg border p-4">
            <h2 className="font-semibold">{heading}</h2>
            {questions.map((question) => <div key={question.id} className="space-y-2 border-t pt-3 text-sm">
              <label className="flex items-start gap-3">
              <Checkbox checked={selected.includes(question.id)} aria-label={`Include: ${question.text}`}
                onChange={(event) => setSelectedByAudience((current) => ({ ...current,
                  [audience]: event.target.checked ? [...selected, question.id] : selected.filter((id) => id !== question.id),
                }))} />
              <span>{question.text}</span>
              </label>
              {selected.includes(question.id) ? <label className="block pl-7 text-xs font-medium">Question wording
                <Input name={`questionText:${question.id}`} aria-label={`Question wording: ${question.id}`}
                  value={wordingById[question.id] ?? question.text}
                  onChange={(event) => setWordingById((current) => ({ ...current, [question.id]: event.target.value }))}
                  minLength={5} maxLength={500} className="mt-1"
                  placeholder="Write the question as respondents should see it" />
              </label> : null}
            </div>)}
          </section>;
        })}
        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="font-semibold">Your own questions</h2>
          <p className="text-sm text-slate-600">Add your own questions and choose who answers each one. Separate answer choices with commas.</p>
          <Input type="hidden" name="customCount" value={customCount} readOnly />
          {Array.from({ length: customCount }, (_, index) => <fieldset key={index} className="grid gap-3 border-t pt-3 sm:grid-cols-2">
            <legend className="text-sm font-medium">Custom question {index + 1}</legend>
            <label className="text-xs font-medium sm:col-span-2">Question
              <Input name={`customText:${index}`} minLength={5} maxLength={500} className="mt-1"
                placeholder="Enter a custom question, or leave blank" />
            </label>
            <label className="text-xs font-medium">Answer type
              <FormSelect name={`customType:${index}`} defaultValue="open" ariaLabel={`Custom question ${index + 1} answer type`}
                placeholder="Choose answer type" options={[
                  { value: "open", label: "Open answer" },
                  { value: "agree", label: "Agree or disagree" },
                  { value: "rating", label: "Rating" },
                  { value: "choice", label: "Choose one" },
                  { value: "multi", label: "Choose up to three" },
                ]} />
            </label>
            <label className="text-xs font-medium">Choices for choose questions
              <Input name={`customChoices:${index}`} maxLength={500} className="mt-1"
                placeholder="First choice, second choice" />
            </label>
            <label className="text-xs font-medium">Who answers it
              <FormSelect name={`customAudience:${index}`} defaultValue="all" ariaLabel={`Custom question ${index + 1} audience`}
                placeholder="Choose audience" options={[{ value: "all", label: "All audiences" },
                  ...stakeholderAudiences.map((item) => ({ value: item.v, label: item.l }))]} />
            </label>
          </fieldset>)}
          <Button type="button" variant="outline" disabled={customCount >= 15}
            onClick={() => setCustomCount((count) => count + 1)}>Add custom question</Button>
        </section>
        {[...audiences, "everyone"].map((id) => {
          const defaults = questionsForAudience(id, data.equityOn, data.organizationName || "your organization")
            .filter((question) => question.defaultOn).map((question) => question.id);
          const ids = selectedByAudience[id] ?? defaults;
          return <div key={id}><Input type="hidden" name={`questionSelectionConfigured:${id}`} value="1" readOnly />
            {ids.map((questionId) => <Input key={questionId} type="hidden" name={`questionId:${id}`}
              value={questionId} readOnly />)}</div>;
        })}
        {Object.entries(wordingById).filter(([id]) => !selected.includes(id)).map(([id, wording]) =>
          <Input key={id} type="hidden" name={`questionText:${id}`} value={wording} readOnly />)}
        <Submit label="Publish survey versions" /></section>
      </form></CardContent>
    </Card>
    <section className="space-y-3"><h2 className="text-xl font-semibold">Published surveys</h2>
      {data.surveys.length ? data.surveys.map((survey) => <Card key={survey.id}>
        <CardContent className="space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-2"><strong>{survey.title}</strong>
            <Badge variant="outline">{stakeholderAudiences.find((item) => item.v === survey.audience)?.l}</Badge>
            <Badge variant="outline">{survey.status}</Badge></div>
          <p className="text-sm text-slate-600">{survey.responseCount} responses received</p>
          {survey.responseCount < 5 ? <p className="text-sm text-slate-600">Question results appear after five responses.</p> :
            <div className="space-y-3 border-t pt-4"><h3 className="font-semibold">Results</h3>
              {survey.results.map((result) => <div key={result.id} className="rounded-lg border p-3 text-sm">
                <strong>{result.text}</strong><p className="mt-1 text-slate-600">{result.answered} answers
                  {result.average === null ? "" : ` · Average ${result.average} / 5`}</p>
                {result.options.length ? <p className="mt-1 text-slate-600">{result.options.map((option) =>
                  `${option.label}: ${option.count}`).join(" · ")}</p> : null}
                {result.comments.length ? <ul className="mt-2 list-disc pl-5">
                  {result.comments.map((comment, index) => <li key={index}>{comment}</li>)}</ul> : null}
              </div>)}
            </div>}
          <CopyLink token={survey.public_token} />
          <Button asChild variant="outline" size="sm"><Link
            href={`/modules/strategic-planning/survey/${survey.public_token}`} target="_blank" rel="noopener noreferrer">
            Preview survey</Link></Button>
          <SurveyInvitation survey={survey} />
          <SurveyToolText survey={survey} />
          {survey.responseCount >= 5 ? <Button asChild variant="outline" size="sm"><Link
            href={`/api/strategic-planning/survey/results/export?survey=${survey.id}`}
            target="_blank" rel="noopener noreferrer"><Download className="size-4" />Download branded results PDF</Link></Button> : null}
          {survey.responseCount >= 5 ? <AddResults id={survey.id} /> : null}
          <div className="flex flex-wrap gap-2" aria-label={`Download ${survey.title}`}>
            {([ ["pdf", "Print or save PDF"], ["doc", "Download Word"],
              ["html", "Download printable HTML"] ] as const).map(([format, label]) =>
              <Button key={format} asChild variant="outline" size="sm"><Link
                href={`/api/strategic-planning/survey/export?survey=${survey.id}&format=${format}`}
                target="_blank" rel="noopener noreferrer"><Download className="size-4" />{label}</Link></Button>)}
          </div>
          <ChangeSurveyStatus id={survey.id} status={survey.status as "open" | "closed"} />
          <EditSurvey survey={survey} />
        </CardContent></Card>) : <p className="text-sm text-slate-500">No surveys published yet.</p>}
    </section>
  </main>;
}
