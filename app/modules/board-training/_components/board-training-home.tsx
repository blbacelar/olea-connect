"use client";

import { BookOpen, CalendarClock, FileCheck2, FileUp, GraduationCap, Users } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  inviteTrainingMemberAction, removeTrainingDocumentAction, resendTrainingInvitationAction, revokeTrainingInvitationAction,
  saveTrainingSettingsAction, startTrainingAction, uploadTrainingDocumentAction,
} from "@/app/modules/board-training/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TrainingCourseId, TrainingLanguage } from "@/lib/board-training/content";
import { trainingCsvCell } from "@/lib/board-training/csv";
import type { getTrainingHome } from "@/lib/data/board-training";

type HomeData = Awaited<ReturnType<typeof getTrainingHome>>;
type ActionResult = { ok: true; value?: unknown } | { ok: false; error: string };

const copy = {
  en: {
    title: "Board training", intro: "Learn the essentials, keep your knowledge current, and see your progress in one place.",
    courses: "My courses", manage: "Manage training", essentials: "Governance Essentials", refresher: "Annual refresher",
    essentialsDescription: "Eight short lessons, a 15-question assessment, and your organization’s policies.",
    refresherDescription: "A short annual course to renew your governance knowledge and declaration.",
    prerequisite: "Complete Governance Essentials first", start: "Start course", continue: "Continue course", completed: "Completed",
    certificates: "My certificates", noCertificates: "Your certificates will appear here after you finish a course.",
    download: "Download PDF", validUntil: "Valid until", chair: "Chair’s discussion guide", report: "Board readiness report",
    adminIntro: "Set the organization’s jurisdiction, invite directors, and keep documents together.",
    settings: "Course settings", jurisdiction: "Organization’s jurisdiction", language: "Default invitation language",
    chairLabel: "Board Chair", noChair: "No Chair selected", notifyChair: "Email the Chair when a director finishes", save: "Save settings",
    invite: "Invite a director", email: "Director email", emailHint: "Use the email of an active Team member. Add new directors to Team first.",
    course: "Course", dueDate: "Due date (optional)", dueHint: "Choose the date using your browser’s date picker.", send: "Send invitation",
    pending: "Pending invitations", none: "None yet", revoke: "Cancel", resend: "Resend", documents: "Organization documents",
    documentsHint: "Directors can open these private PDFs during the organization lesson. PDF only, up to 5 MB.",
    kind: "Document type", documentTitle: "Document title", file: "PDF file", upload: "Upload document", remove: "Remove",
    roster: "Director progress", director: "Director", status: "Status", lessons: "Lessons", score: "Score", renewed: "Renewal",
    export: "Export roster CSV", saved: "Saved.", sent: "Invitation sent.", uploaded: "Document uploaded.",
    register: "Conflict of interest register", noDeclarations: "No declarations signed yet.", noneDeclared: "No interests declared", confirmRemove: "Remove document?", removeDescription: "Directors will no longer be able to open this document from their course.",
  },
  fr: {
    title: "Formation du conseil", intro: "Apprenez les fondements, actualisez vos connaissances et suivez votre progression au même endroit.",
    courses: "Mes formations", manage: "Gérer la formation", essentials: "Fondements de la gouvernance", refresher: "Mise à jour annuelle",
    essentialsDescription: "Huit courtes leçons, une évaluation de 15 questions et les politiques de votre organisme.",
    refresherDescription: "Une courte formation annuelle pour renouveler vos connaissances et votre déclaration.",
    prerequisite: "Terminez d’abord les fondements de la gouvernance", start: "Commencer", continue: "Continuer", completed: "Terminé",
    certificates: "Mes certificats", noCertificates: "Vos certificats apparaîtront ici après une formation.",
    download: "Télécharger le PDF", validUntil: "Valide jusqu’au", chair: "Guide de discussion de la présidence", report: "Rapport de préparation du conseil",
    adminIntro: "Définissez la province ou le territoire, invitez les membres et rassemblez les documents.",
    settings: "Paramètres", jurisdiction: "Compétence de l’organisme", language: "Langue des invitations",
    chairLabel: "Présidence du conseil", noChair: "Aucune présidence sélectionnée", notifyChair: "Avertir la présidence lorsqu’un membre termine", save: "Enregistrer",
    invite: "Inviter un membre", email: "Courriel du membre", emailHint: "Utilisez le courriel d’un membre actif de l’équipe. Ajoutez les nouveaux membres à l’équipe d’abord.",
    course: "Formation", dueDate: "Date limite (facultative)", dueHint: "Choisissez la date avec le sélecteur de votre navigateur.", send: "Envoyer l’invitation",
    pending: "Invitations en attente", none: "Aucune", revoke: "Annuler", resend: "Renvoyer", documents: "Documents de l’organisme",
    documentsHint: "Les membres peuvent ouvrir ces PDF privés pendant la leçon sur l’organisme. PDF seulement, 5 Mo maximum.",
    kind: "Type de document", documentTitle: "Titre du document", file: "Fichier PDF", upload: "Téléverser", remove: "Retirer",
    roster: "Progression des membres", director: "Membre", status: "Statut", lessons: "Leçons", score: "Résultat", renewed: "Renouvellement",
    export: "Exporter le registre CSV", saved: "Enregistré.", sent: "Invitation envoyée.", uploaded: "Document téléversé.",
    register: "Registre des conflits d’intérêts", noDeclarations: "Aucune déclaration signée.", noneDeclared: "Aucun intérêt déclaré", confirmRemove: "Retirer le document?", removeDescription: "Les membres ne pourront plus ouvrir ce document dans leur formation.",
  },
};

const jurisdictions = [
  ["bc", "British Columbia"], ["ab", "Alberta"], ["sk", "Saskatchewan"], ["mb", "Manitoba"],
  ["on", "Ontario"], ["qc", "Québec"], ["nb", "New Brunswick"], ["ns", "Nova Scotia"],
  ["pe", "Prince Edward Island"], ["nl", "Newfoundland and Labrador"], ["yt", "Yukon"],
  ["nt", "Northwest Territories"], ["nu", "Nunavut"], ["fed", "Federal (CNCA)"], ["other", "Not sure"],
] as const;
const documentKinds = ["bylaws", "strategic_plan", "financials", "code_of_conduct", "coi_policy", "minutes", "other"] as const;
const frenchJurisdictions: Record<string, string> = {
  bc: "Colombie-Britannique", ab: "Alberta", sk: "Saskatchewan", mb: "Manitoba", on: "Ontario",
  qc: "Québec", nb: "Nouveau-Brunswick", ns: "Nouvelle-Écosse", pe: "Île-du-Prince-Édouard",
  nl: "Terre-Neuve-et-Labrador", yt: "Yukon", nt: "Territoires du Nord-Ouest", nu: "Nunavut",
  fed: "Fédéral (LCOBNL)", other: "Je ne sais pas",
};
const documentKindLabels = {
  en: { bylaws: "Bylaws", strategic_plan: "Strategic plan", financials: "Financial statements", code_of_conduct: "Code of conduct", coi_policy: "Conflict of interest policy", minutes: "Minutes", other: "Other" },
  fr: { bylaws: "Règlements administratifs", strategic_plan: "Plan stratégique", financials: "États financiers", code_of_conduct: "Code de conduite", coi_policy: "Politique sur les conflits d’intérêts", minutes: "Procès-verbaux", other: "Autre" },
};

export function BoardTrainingHome({ data, language }: { data: HomeData; language: TrainingLanguage }) {
  const t = copy[language];
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [jurisdiction, setJurisdiction] = useState(data.settings.jurisdiction);
  const [defaultLocale, setDefaultLocale] = useState<TrainingLanguage>(data.settings.default_locale);
  const [chairUserId, setChairUserId] = useState(data.settings.chair_user_id ?? "none");
  const [notifyChair, setNotifyChair] = useState(data.settings.notify_chair);
  const [email, setEmail] = useState("");
  const [inviteCourse, setInviteCourse] = useState<TrainingCourseId>("essentials");
  const [inviteLocale, setInviteLocale] = useState<TrainingLanguage>(data.settings.default_locale);
  const [dueDate, setDueDate] = useState("");
  const [documentKind, setDocumentKind] = useState<(typeof documentKinds)[number]>("bylaws");
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLParagraphElement>(null);
  const completedEssentials = data.ownCertificates.some((item) => item.course_id === "essentials");

  useEffect(() => {
    if (!message || !messageIsError) return;
    messageRef.current?.focus({ preventScroll: true });
    messageRef.current?.scrollIntoView({ behavior: "auto", block: "start" });
  }, [message, messageIsError]);

  function handleResult(result: ActionResult, success: string) {
    setMessage(result.ok ? success : result.error);
    setMessageIsError(!result.ok);
    if (result.ok) router.refresh();
  }

  function startCourse(courseId: TrainingCourseId) {
    setMessage("");
    startTransition(async () => {
      try { await startTrainingAction({ courseId, language }); }
      catch (error) { setMessageIsError(true); setMessage(error instanceof Error ? error.message : "Could not open the course."); }
    });
  }

  function exportRoster() {
    const rows = [["Director", "Email", "Course", "Lessons", "Status", "Score", "Certificate", "Renewal"]];
    for (const enrollment of data.roster) {
      const member = data.members.find((person) => person.id === enrollment.user_id);
      const certificate = data.certificates.find((item) => item.user_id === enrollment.user_id && item.course_id === enrollment.course_id);
      rows.push([
        member?.name ?? "", member?.email ?? "", enrollment.course_id,
        String(enrollment.completed_lessons.length), certificate ? "Completed" : "In progress",
        enrollment.score == null ? "" : `${enrollment.score}/${enrollment.total_questions}`,
        certificate?.certificate_number ?? "", certificate?.expires_at ?? "",
      ]);
    }
    const csv = rows.map((row) => row.map(trainingCsvCell).join(",")).join("\r\n");
    const href = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = href; link.download = "board-training-roster.csv"; link.click();
    URL.revokeObjectURL(href);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7" data-testid="board-training-home">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-olea-green">Olea Connects</p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{t.title}</h1>
        <p className="max-w-2xl text-slate-600">{t.intro}</p>
      </header>
      {message && <p ref={messageRef} role={messageIsError ? "alert" : "status"} tabIndex={-1} className="rounded-lg border bg-white px-4 py-3 text-sm text-slate-700">{message}</p>}
      <Tabs value={data.isManager && searchParams.get("tab") === "manage" ? "manage" : "courses"} onValueChange={(value) => router.replace(`/modules/board-training?tab=${value}`, { scroll: false })} className="space-y-6">
        <TabsList>
          <TabsTrigger value="courses">{t.courses}</TabsTrigger>
          {data.isManager && <TabsTrigger value="manage">{t.manage}</TabsTrigger>}
        </TabsList>
        <TabsContent value="courses" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {(["essentials", "refresher"] as const).map((courseId) => {
              const enrollment = data.ownEnrollments.find((item) => item.course_id === courseId);
              const certificate = data.ownCertificates.find((item) => item.course_id === courseId);
              const locked = courseId === "refresher" && !completedEssentials;
              return (
                <Card key={courseId} className="border-slate-200 bg-white shadow-sm">
                  <CardHeader className="space-y-2">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-olea-light text-olea-green">
                      {courseId === "essentials" ? <BookOpen className="size-5" /> : <CalendarClock className="size-5" />}
                    </span>
                    <CardTitle className="text-xl">{courseId === "essentials" ? t.essentials : t.refresher}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="min-h-12 text-sm text-slate-600">{courseId === "essentials" ? t.essentialsDescription : t.refresherDescription}</p>
                    {certificate && <Badge variant="secondary">{t.completed}</Badge>}
                    {locked && <p className="text-sm text-slate-500">{t.prerequisite}</p>}
                    {(certificate || enrollment) && !locked ? (
                      <Button asChild variant="outline"><Link href={`/modules/board-training/${courseId}`}>{t.continue}</Link></Button>
                    ) : (
                      <Button onClick={() => startCourse(courseId)} disabled={locked || pending}>
                        {enrollment ? t.continue : t.start}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Card>
            <CardHeader><CardTitle className="flex flex-wrap items-center justify-between gap-3 text-lg"><span className="flex items-center gap-2"><GraduationCap className="size-5" />{t.certificates}</span><Button asChild size="sm" variant="ghost"><Link href="/modules/board-training/certificates">{language === "fr" ? "Voir tous" : "View all"}</Link></Button></CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {data.ownCertificates.length ? data.ownCertificates.map((certificate) => (
                <div key={certificate.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                  <div><strong>{certificate.course_id === "essentials" ? t.essentials : t.refresher}</strong><p className="text-slate-500">{certificate.certificate_number} · {t.validUntil} {new Date(certificate.expires_at).toLocaleDateString(language === "fr" ? "fr-CA" : "en-CA")}</p></div>
                  <Button asChild size="sm" variant="outline"><Link href={`/api/board-training/certificates/${certificate.id}/pdf`}>{t.download}</Link></Button>
                </div>
              )) : <p className="text-sm text-slate-600">{t.noCertificates}</p>}
            </CardContent>
          </Card>
          {(data.isManager || data.isChair) && <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline"><Link href="/modules/board-training/chair-guide">{t.chair}</Link></Button>
            <Button asChild variant="outline"><Link href="/modules/board-training/report">{t.report}</Link></Button>
          </div>}
        </TabsContent>
        {data.isManager && <TabsContent value="manage" className="space-y-6">
          <p className="text-sm text-slate-600">{t.adminIntro}</p>
          <Card><CardHeader><CardTitle className="text-lg">{t.settings}</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>{t.jurisdiction}</Label><Select value={jurisdiction} onValueChange={setJurisdiction}><SelectTrigger aria-label={t.jurisdiction}><SelectValue /></SelectTrigger><SelectContent>{jurisdictions.map(([id, label]) => <SelectItem key={id} value={id}>{language === "fr" ? frenchJurisdictions[id] : label}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>{t.language}</Label><Select value={defaultLocale} onValueChange={(value) => setDefaultLocale(value as TrainingLanguage)}><SelectTrigger aria-label={t.language}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="en">English</SelectItem><SelectItem value="fr">Français</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>{t.chairLabel}</Label><Select value={chairUserId} onValueChange={setChairUserId}><SelectTrigger aria-label={t.chairLabel}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">{t.noChair}</SelectItem>{data.members.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}</SelectContent></Select></div>
            <label className="flex items-center gap-3 self-end pb-2 text-sm"><Checkbox checked={notifyChair} onChange={(event) => setNotifyChair(event.target.checked)} />{t.notifyChair}</label>
            <div className="md:col-span-2"><Button disabled={pending} onClick={() => startTransition(async () => handleResult(await saveTrainingSettingsAction({ jurisdiction, defaultLocale, chairUserId: chairUserId === "none" ? null : chairUserId, notifyChair }), t.saved))}>{t.save}</Button></div>
          </CardContent></Card>
          <div className="grid gap-6 xl:grid-cols-2">
            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Users className="size-5" />{t.invite}</CardTitle></CardHeader><CardContent className="space-y-4">
              <div className="space-y-2"><Label htmlFor="training-email">{t.email}</Label><Input id="training-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="director@example.org" /><p className="text-xs text-slate-500">{t.emailHint}</p></div>
              <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>{t.course}</Label><Select value={inviteCourse} onValueChange={(value) => setInviteCourse(value as TrainingCourseId)}><SelectTrigger aria-label={t.course}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="essentials">{t.essentials}</SelectItem><SelectItem value="refresher">{t.refresher}</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>{t.language}</Label><Select value={inviteLocale} onValueChange={(value) => setInviteLocale(value as TrainingLanguage)}><SelectTrigger aria-label={t.language}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="en">English</SelectItem><SelectItem value="fr">Français</SelectItem></SelectContent></Select></div></div>
              <div className="space-y-2"><Label htmlFor="training-due">{t.dueDate}</Label><Input id="training-due" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /><p className="text-xs text-slate-500">{t.dueHint}</p></div>
              <Button disabled={pending || !email.includes("@")} onClick={() => startTransition(async () => { const result = await inviteTrainingMemberAction({ email, courseId: inviteCourse, language: inviteLocale, dueDate: dueDate || null }); handleResult(result, t.sent); if (result.ok) setEmail(""); })}>{t.send}</Button>
              <div className="border-t pt-4"><h3 className="mb-2 font-semibold">{t.pending}</h3>{data.invitations.filter((item) => item.status === "pending").length ? data.invitations.filter((item) => item.status === "pending").map((invite) => <div key={invite.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"><span>{invite.email} · {invite.course_id}</span><div className="flex gap-1"><Button size="sm" variant="outline" disabled={pending} onClick={() => startTransition(async () => handleResult(await resendTrainingInvitationAction(invite.id), t.sent))}>{t.resend}</Button><Button size="sm" variant="ghost" disabled={pending} onClick={() => startTransition(async () => handleResult(await revokeTrainingInvitationAction(invite.id), t.saved))}>{t.revoke}</Button></div></div>) : <p className="text-sm text-slate-500">{t.none}</p>}</div>
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><FileUp className="size-5" />{t.documents}</CardTitle></CardHeader><CardContent className="space-y-4">
              <p className="text-sm text-slate-600">{t.documentsHint}</p>
              <div className="space-y-2"><Label>{t.kind}</Label><Select value={documentKind} onValueChange={(value) => setDocumentKind(value as typeof documentKind)}><SelectTrigger aria-label={t.kind}><SelectValue /></SelectTrigger><SelectContent>{documentKinds.map((kind) => <SelectItem key={kind} value={kind}>{documentKindLabels[language][kind]}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="training-document-title">{t.documentTitle}</Label><Input id="training-document-title" maxLength={160} minLength={2} value={documentTitle} onChange={(event) => setDocumentTitle(event.target.value)} placeholder="Board bylaws 2026" /></div>
              <div className="space-y-2"><Label htmlFor="training-document-file">{t.file}</Label><Input ref={fileInputRef} id="training-document-file" type="file" accept="application/pdf,.pdf" onChange={(event) => setDocumentFile(event.target.files?.[0] ?? null)} /></div>
              <Button disabled={pending || !documentFile || documentTitle.trim().length < 2} onClick={() => startTransition(async () => { if (!documentFile) return; const form = new FormData(); form.set("kind", documentKind); form.set("title", documentTitle); form.set("file", documentFile); const result = await uploadTrainingDocumentAction(form); handleResult(result, t.uploaded); if (result.ok) { setDocumentTitle(""); setDocumentFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; } })}>{t.upload}</Button>
              <div className="border-t pt-3">{data.documents.map((document) => <div key={document.id} className="flex items-center justify-between gap-2 py-2 text-sm"><span>{document.title}</span><Dialog><DialogTrigger asChild><Button size="sm" variant="ghost" disabled={pending}>{t.remove}</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{t.confirmRemove}</DialogTitle><DialogDescription>{t.removeDescription}</DialogDescription></DialogHeader><DialogFooter><DialogClose asChild><Button variant="outline">{t.revoke}</Button></DialogClose><DialogClose asChild><Button onClick={() => startTransition(async () => handleResult(await removeTrainingDocumentAction(document.id), t.saved))}>{t.remove}</Button></DialogClose></DialogFooter></DialogContent></Dialog></div>)}</div>
            </CardContent></Card>
          </div>
          <Card><CardHeader><CardTitle className="flex items-center justify-between gap-3 text-lg"><span className="flex items-center gap-2"><FileCheck2 className="size-5" />{t.roster}</span><Button size="sm" variant="outline" onClick={exportRoster}>{t.export}</Button></CardTitle></CardHeader><CardContent className="overflow-x-auto">
            <Table><TableHeader><TableRow><TableHead>{t.director}</TableHead><TableHead>{t.course}</TableHead><TableHead>{t.lessons}</TableHead><TableHead>{t.status}</TableHead><TableHead>{t.score}</TableHead><TableHead>{t.renewed}</TableHead></TableRow></TableHeader><TableBody>
              {data.roster.map((enrollment) => { const person = data.members.find((member) => member.id === enrollment.user_id); const certificate = data.certificates.find((item) => item.user_id === enrollment.user_id && item.course_id === enrollment.course_id); return <TableRow key={enrollment.id}><TableCell>{person?.name ?? t.director}</TableCell><TableCell>{enrollment.course_id === "essentials" ? t.essentials : t.refresher}</TableCell><TableCell>{enrollment.completed_lessons.length}/{enrollment.course_id === "essentials" ? 8 : 3}</TableCell><TableCell>{certificate ? t.completed : language === "fr" ? "En cours" : "In progress"}</TableCell><TableCell>{enrollment.score == null ? "—" : `${enrollment.score}/${enrollment.total_questions}`}</TableCell><TableCell>{certificate ? new Date(certificate.expires_at).toLocaleDateString(language === "fr" ? "fr-CA" : "en-CA") : "—"}</TableCell></TableRow>; })}
            </TableBody></Table>
          </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-lg">{t.register}</CardTitle></CardHeader><CardContent className="space-y-3">{data.declarations.length ? data.declarations.map((declaration) => <div key={declaration.id} className="rounded-lg border p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{declaration.signed_name}</strong><span className="text-slate-500">{new Date(declaration.signed_at).toLocaleDateString(language === "fr" ? "fr-CA" : "en-CA")}</span></div><p className="mt-2 text-slate-700">{declaration.no_interests ? t.noneDeclared : declaration.interests}</p></div>) : <p className="text-sm text-slate-600">{t.noDeclarations}</p>}</CardContent></Card>
        </TabsContent>}
      </Tabs>
    </div>
  );
}
