"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { saveBoardEvaluationAction, type EvaluationActionState } from "./actions";

type Action = { id: string; title: string; ownerName: string; dueOn: string | null; status: "planned" | "in_progress" | "completed" };
const idle: EvaluationActionState = { status: "idle", message: "" };

function Submit({ french }: { french: boolean }) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? (french ? "Enregistrement..." : "Saving...") : (french ? "Enregistrer l’action" : "Save action")}</Button>;
}

function ActionEditor({ cycleId, item, french }: { cycleId: string; item?: Action; french: boolean }) {
  const [state, action] = useActionState(saveBoardEvaluationAction, idle);
  const label = (en: string, fr: string) => french ? fr : en;
  return <Dialog>
    <DialogTrigger asChild><Button type="button" size="sm" variant={item ? "outline" : "default"}>
      {!item ? <Plus className="size-4" /> : null}{item ? label("Edit action", "Modifier l’action") : label("Add action", "Ajouter une action")}
    </Button></DialogTrigger>
    <DialogContent><DialogHeader><DialogTitle>{item ? label("Edit improvement action", "Modifier l’action d’amélioration") : label("Add improvement action", "Ajouter une action d’amélioration")}</DialogTitle>
      <DialogDescription>{label("Keep the owner and target date current.", "Tenez à jour la personne responsable et la date cible.")}</DialogDescription></DialogHeader>
      <form action={action} className="space-y-4">
        <Input type="hidden" name="cycleId" value={cycleId} readOnly />
        <Input type="hidden" name="actionId" value={item?.id ?? ""} readOnly />
        <div className="space-y-2"><Label htmlFor={`action-title-${item?.id ?? "new"}`}>{label("Improvement action", "Action d’amélioration")}</Label>
          <Input id={`action-title-${item?.id ?? "new"}`} name="title" required minLength={3} maxLength={200} defaultValue={item?.title ?? ""} placeholder={label("Describe a concrete next step", "Décrivez une prochaine étape concrète")} /></div>
        <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor={`action-owner-${item?.id ?? "new"}`}>{label("Owner", "Responsable")}</Label>
          <Input id={`action-owner-${item?.id ?? "new"}`} name="ownerName" maxLength={160} defaultValue={item?.ownerName ?? ""} placeholder={label("Committee or lead", "Comité ou responsable")} /></div>
          <div className="space-y-2"><Label htmlFor={`action-due-${item?.id ?? "new"}`}>{label("Due date", "Date cible")}</Label>
            <Input id={`action-due-${item?.id ?? "new"}`} name="dueOn" type="date" defaultValue={item?.dueOn ?? ""} /></div></div>
        <div className="space-y-2"><Label htmlFor={`action-status-${item?.id ?? "new"}`}>{label("Status", "État")}</Label>
          <Select name="status" defaultValue={item?.status ?? "planned"} required>
            <SelectTrigger id={`action-status-${item?.id ?? "new"}`}><SelectValue placeholder={label("Choose status", "Choisir un état")} /></SelectTrigger>
            <SelectContent><SelectItem value="planned">{label("Planned", "Prévue")}</SelectItem>
              <SelectItem value="in_progress">{label("In progress", "En cours")}</SelectItem>
              <SelectItem value="completed">{label("Completed", "Terminée")}</SelectItem></SelectContent>
          </Select></div>
        {state.message ? <p role={state.status === "error" ? "alert" : "status"} className={state.status === "error" ? "text-sm text-red-800" : "text-sm text-green-800"}>{state.message}</p> : null}
        <Submit french={french} />
      </form>
    </DialogContent>
  </Dialog>;
}

export function BoardEvaluationExistingActions({ cycleId, items, french }: { cycleId: string; items: Action[]; french: boolean }) {
  return <Card><CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2"><CardTitle>{french ? "Actions d’amélioration existantes" : "Existing improvement actions"}</CardTitle>
    <ActionEditor cycleId={cycleId} french={french} /></CardHeader>
    <CardContent className="space-y-3">{items.length ? items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm">
      <div><strong>{item.title}</strong><p className="text-slate-600">{item.ownerName || (french ? "Aucun responsable" : "No owner")} · {item.dueOn || (french ? "Aucune date cible" : "No due date")}</p></div>
      <div className="flex items-center gap-2"><Badge variant="outline">{item.status === "completed" ? (french ? "Terminée" : "Completed") : item.status === "in_progress" ? (french ? "En cours" : "In progress") : (french ? "Prévue" : "Planned")}</Badge><ActionEditor cycleId={cycleId} item={item} french={french} /></div>
    </div>) : <p className="text-sm text-slate-600">{french ? "Aucune action enregistrée." : "No actions recorded yet."}</p>}</CardContent>
  </Card>;
}
