"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { boardCalendarContactSchema, getBoardCalendarContacts, type BoardCalendarContact } from "@/lib/template-renderer/board-calendar-contacts";
import { createTemplateRecordId } from "@/lib/template-renderer/create-id";
import type { TemplateFormData } from "@/lib/template-renderer/types";

const blankContact = (): BoardCalendarContact => ({
  id: createTemplateRecordId("contact"), name: "", boardRole: "Director", email: "",
  phone: "", address: "", committee: "", receivesEmails: true,
});

export function BoardCalendarContactsPanel({
  data, canManage, onDataChange,
}: {
  data: TemplateFormData;
  canManage: boolean;
  onDataChange: (updater: (current: TemplateFormData) => TemplateFormData) => void;
}) {
  const french = useLocaleContext().locale === "fr-CA";
  const contacts = getBoardCalendarContacts(data);
  const [draft, setDraft] = useState<BoardCalendarContact | null>(null);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<BoardCalendarContact | null>(null);
  const t = (en: string, fr: string) => french ? fr : en;
  if (!canManage) return null;

  function change(key: keyof BoardCalendarContact, value: string | boolean) {
    setDraft((current) => current ? { ...current, [key]: value } : current);
    setError("");
  }

  function save() {
    if (!draft) return;
    const result = boardCalendarContactSchema.safeParse(draft);
    if (!result.success) {
      setError(t("Enter a name and a valid email. Phone may contain digits, +, spaces, parentheses, and hyphens.", "Indiquez un nom et une adresse courriel valide. Le téléphone peut contenir des chiffres, +, des espaces, des parenthèses et des traits d’union."));
      return;
    }
    if (contacts.some((contact) => contact.id !== draft.id && contact.email.toLowerCase() === draft.email.toLowerCase())) {
      setError(t("This email is already in the directory.", "Cette adresse courriel figure déjà dans le répertoire."));
      return;
    }
    onDataChange((current) => ({
      ...current,
      board_contacts: contacts.some((contact) => contact.id === draft.id)
        ? getBoardCalendarContacts(current).map((contact) => contact.id === draft.id ? result.data : contact)
        : [...getBoardCalendarContacts(current), result.data],
    }));
    setDraft(null);
  }

  function remove() {
    if (!pendingDelete) return;
    onDataChange((current) => ({ ...current,
      board_contacts: getBoardCalendarContacts(current).filter((contact) => contact.id !== pendingDelete.id),
    }));
    setPendingDelete(null);
  }

  return <section className="space-y-4 rounded-xl border bg-white p-5 shadow-sm" aria-label={t("Board contacts", "Contacts du conseil")}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div>
      <h3 className="text-xl font-semibold">{t("Board contacts", "Contacts du conseil")}</h3>
      <p className="mt-1 text-sm text-slate-600">{t("Maintain board roles and choose who receives meeting date emails.", "Tenez à jour les rôles du conseil et choisissez qui reçoit les avis de réunion.")}</p>
    </div><Button type="button" variant="outline" disabled={contacts.length >= 100} onClick={() => setDraft(blankContact())}><Plus className="size-4" />{t("Add contact", "Ajouter un contact")}</Button></div>
    {contacts.length ? <div className="overflow-x-auto"><Table><TableHeader><TableRow>
      <TableHead>{t("Name and role", "Nom et rôle")}</TableHead><TableHead>{t("Email", "Courriel")}</TableHead><TableHead>{t("Committee", "Comité")}</TableHead><TableHead>{t("Date emails", "Avis des dates")}</TableHead><TableHead className="text-right">{t("Actions", "Actions")}</TableHead>
    </TableRow></TableHeader><TableBody>{contacts.map((contact) => <TableRow key={contact.id}>
      <TableCell><strong>{contact.name}</strong><p className="text-xs text-slate-500">{contact.boardRole}</p></TableCell>
      <TableCell><a className="text-olea-green underline" href={`mailto:${contact.email}`}>{contact.email}</a>{contact.phone ? <p className="text-xs text-slate-500">{contact.phone}</p> : null}</TableCell>
      <TableCell>{contact.committee || "—"}</TableCell><TableCell>{contact.receivesEmails ? t("Yes", "Oui") : t("No", "Non")}</TableCell>
      <TableCell className="text-right"><div className="flex justify-end gap-1"><Button type="button" size="sm" variant="ghost" aria-label={t(`Edit ${contact.name}`, `Modifier ${contact.name}`)} onClick={() => setDraft(contact)}><Pencil className="size-4" /></Button>
        <Button type="button" size="sm" variant="ghost" aria-label={t(`Remove ${contact.name}`, `Retirer ${contact.name}`)} onClick={() => setPendingDelete(contact)}><Trash2 className="size-4" /></Button></div></TableCell>
    </TableRow>)}</TableBody></Table></div> : <p className="rounded-lg border border-dashed p-4 text-sm text-slate-600">{t("No board contacts yet. Add contacts to send meeting date notices.", "Aucun contact du conseil. Ajoutez des contacts pour envoyer les avis de réunion.")}</p>}
    <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && setDraft(null)}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{t("Board contact", "Contact du conseil")}</DialogTitle><DialogDescription>{t("Name and email are required. Only opted-in contacts receive date emails.", "Le nom et le courriel sont requis. Seuls les contacts inscrits reçoivent les avis.")}</DialogDescription></DialogHeader>
      {draft ? <div className="grid gap-3 sm:grid-cols-2">
        {([
          ["name", "Name", "Nom", "text", true, 160],
          ["boardRole", "Board role", "Rôle au conseil", "text", false, 100],
          ["email", "Email", "Courriel", "email", true, 320],
          ["phone", "Phone", "Téléphone", "tel", false, 50],
          ["address", "Address", "Adresse", "text", false, 500],
          ["committee", "Committee", "Comité", "text", false, 160],
        ] as const).map(([key, en, fr, type, required, max]) => <div key={key} className="space-y-1"><Label htmlFor={`contact-${key}`}>{t(en, fr)}</Label>
          <Input id={`contact-${key}`} type={type} required={required} maxLength={max} value={draft[key]} onChange={(event) => change(key, event.target.value)} placeholder={key === "email" ? "name@organization.org" : key === "phone" ? "+1 604 555 0100" : undefined} /></div>)}
        <label className="flex items-center gap-2 sm:col-span-2"><Checkbox checked={draft.receivesEmails} onChange={(event) => change("receivesEmails", event.target.checked)} />{t("Receives meeting date emails", "Reçoit les avis des dates de réunion")}</label>
        {error ? <p role="alert" className="text-sm text-red-800 sm:col-span-2">{error}</p> : null}
        <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => setDraft(null)}>{t("Cancel", "Annuler")}</Button><Button type="button" onClick={save}>{t("Save contact", "Enregistrer le contact")}</Button></div>
      </div> : null}
    </DialogContent></Dialog>
    <Dialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}><DialogContent><DialogHeader><DialogTitle>{t("Remove contact?", "Retirer le contact?")}</DialogTitle><DialogDescription>{t("This removes the contact from future date emails.", "Ce contact ne recevra plus les prochains avis de dates.")}</DialogDescription></DialogHeader>
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setPendingDelete(null)}>{t("Cancel", "Annuler")}</Button><Button type="button" variant="destructive" onClick={remove}>{t("Remove", "Retirer")}</Button></div>
    </DialogContent></Dialog>
  </section>;
}
