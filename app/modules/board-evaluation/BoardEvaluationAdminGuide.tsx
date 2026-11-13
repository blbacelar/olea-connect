"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const copy = (en: string, fr: string, french: boolean) => french ? fr : en;

const timeline = [
  ["6–8 weeks before", "Choose questions, build the survey, and draft communications.", "6 à 8 semaines avant", "Choisir les questions, préparer le sondage et rédiger les communications."],
  ["Week 1 — launch", "The Board Chair sends the shared link to every board member; set a deadline 2–3 weeks away.", "Semaine 1 — lancement", "La présidence envoie le même lien à tous les membres; fixer une date limite dans 2 à 3 semaines."],
  ["Week 2", "Send a neutral reminder to everyone. The anonymous link cannot identify nonrespondents.", "Semaine 2", "Envoyer un rappel neutre à tous. Le lien anonyme ne permet pas d’identifier les non-répondants."],
  ["Week 3 — deadline", "Close the survey and review anonymized results only.", "Semaine 3 — échéance", "Fermer le sondage et examiner uniquement les résultats anonymisés."],
  ["Week 4", "Review results and prepare the summary before sharing findings with executive leadership.", "Semaine 4", "Analyser les résultats et préparer le résumé avant de communiquer les constats à la direction générale."],
  ["Weeks 5–6", "Present findings to the full board, facilitate discussion, and record actions.", "Semaines 5 et 6", "Présenter les constats au conseil, faciliter la discussion et consigner les actions."],
] as const;

const guidance = [
  {
    en: "Purpose", fr: "Objectif",
    enBody: "Assess the board as a governing body, never individual directors or staff. Identify strengths, improvement areas, engagement, and shared accountability.",
    frBody: "Évaluer le conseil comme organe de gouvernance, jamais les membres individuellement ni le personnel. Repérer les forces, les améliorations, l’engagement et la responsabilité collective.",
  },
  {
    en: "Selecting questions", fr: "Choisir les questions",
    enBody: "Select 30–45 rated questions across all core categories and 2–4 open questions. Consider 1–2 questions about this year’s strategic context. A post-meeting check-in should use 3–5 rated questions and at most one open prompt.",
    frBody: "Choisir 30 à 45 questions notées dans toutes les catégories principales et 2 à 4 questions ouvertes. Ajouter, au besoin, 1 ou 2 questions liées au contexte stratégique de l’année. Une évaluation après réunion devrait compter 3 à 5 questions notées et au plus une question ouverte.",
  },
  {
    en: "Protecting anonymity", fr: "Protéger l’anonymat",
    enBody: "Use one shared link and distribute it to everyone at once. Do not ask for names or email addresses in the survey. Keep completion confirmations separate from responses. Only administrators may review raw anonymous comments; remove identifying details and report themes, not individual quotes. For boards under eight, show averages only. Suppress any question with fewer than five ratings.",
    frBody: "Utiliser un seul lien partagé et l’envoyer à tous en même temps. Ne demander ni nom ni adresse courriel dans le sondage. Garder les confirmations de participation séparées des réponses. Seule l’administration peut examiner les commentaires anonymes bruts; retirer les détails identifiables et présenter des thèmes plutôt que des citations individuelles. Pour les conseils de moins de huit membres, montrer seulement les moyennes. Masquer toute question ayant moins de cinq notes.",
  },
  {
    en: "Analyzing results", fr: "Analyser les résultats",
    enBody: "Calculate the mean score and share of 4–5 ratings for each reportable question; show distributions only for boards of at least eight. Below 3.0 signals a significant concern, 3.0–3.5 an improvement area, 3.5–4.4 satisfactory practice, and 4.5+ a strength. A year-over-year change of 0.3 or more is worth flagging. Summarize open answers as themes, noting frequency and strength of concern.",
    frBody: "Calculer la moyenne et la part des notes de 4 ou 5 pour chaque question publiable; ne montrer la répartition que pour les conseils d’au moins huit membres. Sous 3,0 : préoccupation importante; de 3,0 à 3,5 : point à améliorer; de 3,5 à 4,4 : pratique satisfaisante; 4,5 et plus : force. Signaler une variation d’au moins 0,3 point d’une année à l’autre. Regrouper les réponses ouvertes en thèmes, en tenant compte de leur fréquence et de l’intensité des préoccupations.",
  },
  {
    en: "Findings report", fr: "Rapport des constats",
    enBody: "Include the response rate, leading strengths, priority improvement areas, reviewed themes, and recommended next steps. Never distribute response-level exports or speculate about who wrote a comment. Use the branded Summary & Action Plan report.",
    frBody: "Inclure le taux de réponse, les principales forces, les domaines prioritaires à améliorer, les thèmes examinés et les prochaines étapes recommandées. Ne jamais diffuser les réponses individuelles ni supposer qui a écrit un commentaire. Utiliser le rapport de résumé et de plan d’action à l’image de l’organisme.",
  },
  {
    en: "Board discussion and follow-through", fr: "Discussion et suivi au conseil",
    enBody: "Record 2–3 specific commitments in the minutes, assign an owner, and schedule a six-month progress check. Use findings to guide training, recruitment, meeting changes, and policy updates. Visible follow-through builds trust in the next evaluation.",
    frBody: "Consigner 2 ou 3 engagements précis au procès-verbal, désigner un responsable et prévoir un suivi dans six mois. Utiliser les constats pour orienter la formation, le recrutement, les réunions et les politiques. Des actions visibles renforcent la confiance dans la prochaine évaluation.",
  },
  {
    en: "Meeting evaluations", fr: "Évaluations des réunions",
    enBody: "Use a brief anonymous check-in after each meeting. Wait for at least five ratings before sharing a question result. The administrator reviews low items, brings recurring concerns to the Chair, and puts a short reflection on the next agenda. Review meeting trends in the annual evaluation.",
    frBody: "Utiliser un bref sondage anonyme après chaque réunion. Attendre au moins cinq notes avant de communiquer un résultat par question. L’administration examine les notes faibles, signale les préoccupations récurrentes à la présidence et prévoit un court retour au prochain ordre du jour. Revoir les tendances des réunions lors de l’évaluation annuelle.",
  },
] as const;

export function BoardEvaluationAdminGuide({
  french, organizationName, year, token,
}: { french: boolean; organizationName: string; year: number; token: string }) {
  const [status, setStatus] = useState("");
  const letter = copy(
    `To: All Members of the ${organizationName} Board of Directors\nFrom: [Board Chair Name], Board Chair\nRe: Annual Board Self-Evaluation — ${year} Survey\n\nDear Fellow Board Members,\n\nEach year, our board takes time to assess how we are doing as a governing body. The ${year} annual board self-evaluation is now open, and I ask for your participation. It is not an assessment of any individual director or a performance review of staff.\n\nYour responses are anonymous. Ratings are not linked to your identity. [Administrator Name] will compile aggregate results and reviewed themes for the full board. Please answer candidly.\n\nSurvey link: [survey URL]\nDeadline: [date]\nEstimated time: 15–20 minutes\nQuestions: [administrator contact]\n\nWe will review the findings together at our [date] board meeting and set concrete priorities for the year ahead.\n\nThank you for your commitment.\n\n[Board Chair Name]`,
    `À : Tous les membres du conseil d’administration de ${organizationName}\nDe : [Nom de la présidence], présidence du conseil\nObjet : Autoévaluation annuelle du conseil — sondage ${year}\n\nChères et chers collègues,\n\nChaque année, notre conseil prend le temps d’évaluer son fonctionnement comme organe de gouvernance. L’autoévaluation ${year} est maintenant ouverte et je vous invite à y participer. Il ne s’agit pas d’évaluer les membres individuellement ni le rendement du personnel.\n\nVos réponses sont anonymes. Les notes ne sont pas liées à votre identité. [Nom de l’administrateur] préparera des résultats regroupés et des thèmes examinés pour le conseil. Merci de répondre avec franchise.\n\nLien du sondage : [URL du sondage]\nDate limite : [date]\nDurée prévue : 15 à 20 minutes\nQuestions : [coordonnées de l’administrateur]\n\nNous examinerons les constats ensemble lors de la réunion du conseil du [date] et définirons des priorités concrètes pour la prochaine année.\n\nMerci de votre engagement.\n\n[Nom de la présidence]`, french);

  async function copyLetter() {
    const url = new URL(`/board-evaluation/annual/${token}`, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(letter.replace(french ? "[URL du sondage]" : "[survey URL]", url));
      setStatus(copy("Cover letter copied. Complete the remaining placeholders before sending it from the Board Chair’s email.", "Lettre copiée. Remplissez les autres champs avant l’envoi depuis l’adresse de la présidence.", french));
    } catch {
      setStatus(copy("Copy failed. Select and copy the letter manually.", "La copie a échoué. Sélectionnez et copiez la lettre manuellement.", french));
    }
  }

  return <div className="space-y-4">
    <Card><CardHeader><CardTitle>{copy("Annual evaluation process", "Processus de l’évaluation annuelle", french)}</CardTitle></CardHeader><CardContent className="space-y-3">
      {timeline.map(([enWhen, enAction, frWhen, frAction]) => <div key={enWhen} className="grid gap-1 rounded-lg border p-3 text-sm sm:grid-cols-[11rem_1fr]"><strong>{copy(enWhen, frWhen, french)}</strong><span>{copy(enAction, frAction, french)}</span></div>)}
    </CardContent></Card>
    <div className="grid gap-3 lg:grid-cols-2">{guidance.map((item) => <Card key={item.en}><CardHeader><CardTitle className="text-base">{copy(item.en, item.fr, french)}</CardTitle></CardHeader><CardContent className="text-sm leading-6 text-slate-700">{copy(item.enBody, item.frBody, french)}</CardContent></Card>)}</div>
    <Card><CardHeader><CardTitle>{copy("Board Chair cover letter", "Lettre de la présidence du conseil", french)}</CardTitle></CardHeader><CardContent className="space-y-3">
      <p className="text-sm text-slate-600">{copy("Complete every bracketed field. Send from the Board Chair’s address at least three weeks before the reporting meeting; BCC the administrator to record the send date.", "Remplissez tous les champs entre crochets. Envoyez depuis l’adresse de la présidence au moins trois semaines avant la réunion de présentation; mettez l’administration en CCI pour noter la date d’envoi.", french)}</p>
      <pre className="whitespace-pre-wrap rounded-lg border bg-slate-50 p-4 font-sans text-sm leading-6">{letter}</pre>
      <Button type="button" variant="outline" onClick={() => void copyLetter()}><Copy className="size-4" />{copy("Copy letter with survey link", "Copier la lettre avec le lien", french)}</Button>
      {status ? <p role="status" className="text-sm text-slate-700">{status}</p> : null}
    </CardContent></Card>
  </div>;
}
