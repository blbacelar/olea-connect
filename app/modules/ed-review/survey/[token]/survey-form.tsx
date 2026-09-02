"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";

import { submitAnonymousSurveyAction } from "@/app/modules/ed-review/actions";
import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import {
  getSurveyDefinition,
  type EdReviewCampaignKind,
  type SurveyDefinition,
} from "@/lib/ed-review/domain";
import type { Locale } from "@/lib/i18n/locales";

type PublicCampaign = {
  kind: EdReviewCampaignKind;
  title: string;
  reviewTitle: string;
};

type SurveyFormCopy = {
  anonymousFeedback: string;
  anonymousDetails: string;
  thankYouTitle: string;
  thankYouBody: string;
  optionalContextTitle: string;
  optionalContextBody: string;
  relationshipPlaceholder: string;
  relationshipOptions: Record<string, string>;
  ratingInstructions: string;
  optionalCommentPrefix: string;
  commentPlaceholder: string;
  overallTitle: string;
  overallBody: string;
  greatestStrength: string;
  importantChange: string;
  additionalComments: string;
  progress: (answered: number, total: number) => string;
  atLeastOneRequired: string;
  incompleteError: string;
  pendingSubmit: string;
  submit: string;
  incompleteTitle: string;
  incompleteBody: (answered: number, total: number) => string;
  keepEditing: string;
  submitResponse: string;
  freeTextPlaceholder: string;
  definitions: Record<EdReviewCampaignKind, SurveyDefinition>;
};

const surveyFormCopy: Record<Locale, SurveyFormCopy> = {
  "en-CA": {
    anonymousFeedback: "Anonymous feedback",
    anonymousDetails:
      "We do not request your name, email address, account, location, device information, or browser details. Please do not include identifying details in comments; common contact details are removed before saving.",
    thankYouTitle: "Thank you for your feedback",
    thankYouBody:
      "Your response was submitted anonymously. This window can now be closed.",
    optionalContextTitle: "Optional context",
    optionalContextBody: "This broad category is not used to identify you.",
    relationshipPlaceholder: "Select a relationship type (optional)",
    relationshipOptions: {
      funder: "Funder",
      partner: "Partner",
      community_member: "Community member",
      other: "Other",
      prefer_not_to_say: "Prefer not to say",
    },
    ratingInstructions:
      "Rate each statement from 1 (strongly disagree) to 5 (strongly agree). You may leave individual questions blank.",
    optionalCommentPrefix: "Optional comment about",
    commentPlaceholder:
      "Share context without including names or contact details.",
    overallTitle: "Overall feedback",
    overallBody:
      "Optional comments are most useful when they focus on observable actions and outcomes. Do not include names or contact information.",
    greatestStrength: "What is the ED/CEO’s greatest strength?",
    importantChange: "What is the most important change or area for growth?",
    additionalComments: "Anything else the Board Chair should consider?",
    progress: (answered, total) =>
      `${answered} of ${total} ratings selected. At least one rating is required.`,
    atLeastOneRequired: "At least one rating is required.",
    incompleteError:
      "Select at least one rating before submitting your feedback.",
    pendingSubmit: "Submitting anonymously...",
    submit: "Submit anonymous feedback",
    incompleteTitle: "Submit with unanswered ratings?",
    incompleteBody: (answered, total) =>
      `You selected ${answered} of ${total} ratings. Blank ratings are excluded from the summary. You can return to complete them or submit this partial response now.`,
    keepEditing: "Keep editing",
    submitResponse: "Submit response",
    freeTextPlaceholder: "Optional, up to 2,000 characters.",
    definitions: {
      staff: getSurveyDefinition("staff"),
      partner: getSurveyDefinition("partner"),
    },
  },
  "fr-CA": {
    anonymousFeedback: "Commentaires anonymes",
    anonymousDetails:
      "Nous ne demandons pas votre nom, votre adresse courriel, votre compte, votre emplacement, les renseignements de votre appareil ni les détails de votre navigateur. N'incluez pas de renseignements permettant de vous identifier dans les commentaires; les coordonnées courantes sont retirées avant l'enregistrement.",
    thankYouTitle: "Merci pour vos commentaires",
    thankYouBody:
      "Votre réponse a été soumise anonymement. Vous pouvez maintenant fermer cette fenêtre.",
    optionalContextTitle: "Contexte facultatif",
    optionalContextBody:
      "Cette catégorie générale n'est pas utilisée pour vous identifier.",
    relationshipPlaceholder: "Sélectionner un type de relation (facultatif)",
    relationshipOptions: {
      funder: "Bailleur de fonds",
      partner: "Partenaire",
      community_member: "Membre de la communauté",
      other: "Autre",
      prefer_not_to_say: "Préfère ne pas répondre",
    },
    ratingInstructions:
      "Évaluez chaque énoncé de 1 (fortement en désaccord) à 5 (fortement d'accord). Vous pouvez laisser des questions individuelles sans réponse.",
    optionalCommentPrefix: "Commentaire facultatif au sujet de",
    commentPlaceholder:
      "Partagez le contexte sans inclure de noms ni de coordonnées.",
    overallTitle: "Commentaires généraux",
    overallBody:
      "Les commentaires facultatifs sont plus utiles lorsqu'ils portent sur des gestes observables et des résultats. N'incluez pas de noms ni de coordonnées.",
    greatestStrength: "Quelle est la plus grande force de la DG/du PDG?",
    importantChange:
      "Quel est le changement le plus important ou le principal axe de croissance?",
    additionalComments:
      "Y a-t-il autre chose que la présidence du conseil devrait considérer?",
    progress: (answered, total) =>
      `${answered} sur ${total} évaluations sélectionnées. Au moins une évaluation est requise.`,
    atLeastOneRequired: "Au moins une évaluation est requise.",
    incompleteError:
      "Sélectionnez au moins une évaluation avant de soumettre vos commentaires.",
    pendingSubmit: "Soumission anonyme en cours...",
    submit: "Soumettre les commentaires anonymes",
    incompleteTitle: "Soumettre avec des évaluations sans réponse?",
    incompleteBody: (answered, total) =>
      `Vous avez sélectionné ${answered} sur ${total} évaluations. Les évaluations vides sont exclues du résumé. Vous pouvez revenir les compléter ou soumettre cette réponse partielle maintenant.`,
    keepEditing: "Continuer la modification",
    submitResponse: "Soumettre la réponse",
    freeTextPlaceholder: "Facultatif, jusqu'à 2 000 caractères.",
    definitions: {
      staff: {
        kind: "staff",
        label: "Sondage de rétroaction du personnel",
        description:
          "Vos réponses sont anonymes. Veuillez répondre selon votre expérience de travail avec la DG/le PDG.",
        sections: [
          {
            id: "vision",
            commentId: "S1",
            label: "Vision et leadership",
            questions: [
              {
                id: "S1a",
                label:
                  "Présente une vision claire et inspirante pour l'organisme.",
              },
              {
                id: "S1b",
                label:
                  "Prend de bonnes décisions en période d'incertitude.",
              },
              {
                id: "S1c",
                label:
                  "Établit les priorités et s'adapte efficacement lorsque les circonstances changent.",
              },
            ],
          },
          {
            id: "culture",
            commentId: "S2",
            label: "Personnes et culture",
            questions: [
              {
                id: "S2a",
                label: "Crée un milieu de travail positif et inclusif.",
              },
              {
                id: "S2b",
                label:
                  "Reconnaît les contributions du personnel et soutient le développement professionnel.",
              },
              {
                id: "S2c",
                label:
                  "Traite les enjeux équitablement et incarne les valeurs de l'organisme.",
              },
            ],
          },
          {
            id: "communications",
            commentId: "S3",
            label: "Communications",
            questions: [
              {
                id: "S3a",
                label: "Partage l'information de façon claire et rapide.",
              },
              {
                id: "S3b",
                label:
                  "Est accessible et écoute les perspectives du personnel.",
              },
              {
                id: "S3c",
                label:
                  "Communique avec transparence au sujet des décisions et des changements.",
              },
            ],
          },
          {
            id: "operations",
            commentId: "S4",
            label: "Opérations et intendance",
            questions: [
              {
                id: "S4a",
                label: "Est organisé et respecte ses engagements.",
              },
              {
                id: "S4b",
                label:
                  "Gère les ressources et le budget de façon responsable.",
              },
              {
                id: "S4c",
                label:
                  "Met en place des systèmes qui aident l'organisme à travailler efficacement.",
              },
            ],
          },
          {
            id: "innovation",
            commentId: "S5",
            label: "Innovation et apprentissage",
            questions: [
              {
                id: "S5a",
                label: "Encourage la créativité et l'amélioration continue.",
              },
              {
                id: "S5b",
                label:
                  "Prend des risques réfléchis et calculés lorsque c'est approprié.",
              },
              {
                id: "S5c",
                label:
                  "Aide l'équipe à transformer les apprentissages en améliorations concrètes.",
              },
            ],
          },
          {
            id: "partnership",
            commentId: "S6",
            label: "Partenariats et communauté",
            questions: [
              {
                id: "S6a",
                label:
                  "Bâtit la confiance avec les partenaires et les membres de la communauté.",
              },
              {
                id: "S6b",
                label:
                  "Représente efficacement l'organisme auprès des publics externes.",
              },
              {
                id: "S6c",
                label:
                  "Fait une place réelle aux perspectives de la communauté.",
              },
            ],
          },
        ],
      },
      partner: {
        kind: "partner",
        label: "Sondage de rétroaction des partenaires et parties prenantes",
        description:
          "Vos réponses sont anonymes. Veuillez répondre selon votre expérience avec l'organisme et sa DG/son PDG.",
        sections: [
          {
            id: "relationship",
            commentId: "A",
            label: "Relation et confiance",
            questions: [
              {
                id: "A1",
                label: "Bâtit des relations authentiques et productives.",
              },
              {
                id: "A2",
                label: "Est fiable et respecte ses engagements.",
              },
              {
                id: "A3",
                label:
                  "Est professionnel, réactif et facile à joindre.",
              },
              {
                id: "A4",
                label:
                  "Représente équitablement les intérêts des partenaires.",
              },
            ],
          },
          {
            id: "strategy",
            commentId: "B",
            label: "Leadership stratégique et externe",
            questions: [
              {
                id: "B1",
                label:
                  "Communique clairement la mission et la valeur de l'organisme.",
              },
              {
                id: "B2",
                label: "Est crédible et efficace dans le secteur.",
              },
              {
                id: "B3",
                label:
                  "Rassemble les gens autour de priorités communes.",
              },
              {
                id: "B4",
                label:
                  "Renforce l'écosystème sans but lucratif dans son ensemble.",
              },
            ],
          },
          {
            id: "inclusion",
            commentId: "C",
            label: "Inclusion et réactivité",
            questions: [
              {
                id: "C1",
                label:
                  "Crée une expérience inclusive et respectueuse pour les partenaires.",
              },
              {
                id: "C2",
                label:
                  "Répond avec attention aux besoins des partenaires.",
              },
              {
                id: "C3",
                label:
                  "Fait en sorte que les voix de la communauté soient réellement valorisées.",
              },
            ],
          },
          {
            id: "impact",
            commentId: "D",
            label: "Impact",
            questions: [
              {
                id: "D1",
                label: "Encourage l'innovation pratique.",
              },
              {
                id: "D2",
                label:
                  "Aide l'organisme à produire des résultats significatifs.",
              },
              {
                id: "D3",
                label: "Recommanderait de travailler avec l'organisme.",
              },
            ],
          },
        ],
      },
    },
  },
};

export function AnonymousSurveyForm({
  campaign,
  token,
  submitted,
}: {
  campaign: PublicCampaign;
  token: string;
  submitted: boolean;
}) {
  const { locale } = useLocaleContext();
  const copy = surveyFormCopy[locale];
  const definition = copy.definitions[campaign.kind];
  const [idempotencyKey] = React.useState(() => crypto.randomUUID());
  const [relationshipType, setRelationshipType] = React.useState("");
  const [answeredQuestionIds, setAnsweredQuestionIds] = React.useState<
    Set<string>
  >(() => new Set());
  const [showIncompleteConfirmation, setShowIncompleteConfirmation] =
    React.useState(false);
  const [formError, setFormError] = React.useState("");
  const allowIncompleteSubmit = React.useRef(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const totalQuestions = definition.sections.reduce(
    (count, section) => count + section.questions.length,
    0,
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (allowIncompleteSubmit.current) return;
    if (!answeredQuestionIds.size) {
      event.preventDefault();
      setFormError(
        copy.incompleteError,
      );
      return;
    }
    if (answeredQuestionIds.size < totalQuestions) {
      event.preventDefault();
      setShowIncompleteConfirmation(true);
    }
  };

  const confirmIncompleteSubmit = () => {
    allowIncompleteSubmit.current = true;
    setShowIncompleteConfirmation(false);
    formRef.current?.requestSubmit();
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 md:p-8">
        <Card className="mx-auto mt-12 max-w-2xl">
          <CardHeader className="items-center text-center">
            <CheckCircle2 className="size-12 text-olea-green" />
            <CardTitle className="mt-3 text-3xl">
              {copy.thankYouTitle}
            </CardTitle>
            <CardDescription>
              {copy.thankYouBody}
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <form
        ref={formRef}
        action={submitAnonymousSurveyAction}
        className="mx-auto max-w-4xl space-y-6"
        onSubmit={handleSubmit}
      >
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <input type="hidden" name="relationshipType" value={relationshipType} />
        <Card className="overflow-hidden">
          <div className="h-2 bg-olea-green" />
          <CardHeader>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 size-6 shrink-0 text-olea-green" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-olea-green">
                  {copy.anonymousFeedback}
                </p>
                <CardTitle className="mt-2 text-3xl">
                  {campaign.title}
                </CardTitle>
                <CardDescription className="mt-3 max-w-2xl">
                  {definition.description} {copy.anonymousDetails}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
        {campaign.kind === "partner" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">
                {copy.optionalContextTitle}
              </CardTitle>
              <CardDescription>
                {copy.optionalContextBody}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={relationshipType}
                onValueChange={setRelationshipType}
              >
                <SelectTrigger className="max-w-sm">
                  <SelectValue placeholder={copy.relationshipPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="funder">
                    {copy.relationshipOptions.funder}
                  </SelectItem>
                  <SelectItem value="partner">
                    {copy.relationshipOptions.partner}
                  </SelectItem>
                  <SelectItem value="community_member">
                    {copy.relationshipOptions.community_member}
                  </SelectItem>
                  <SelectItem value="other">
                    {copy.relationshipOptions.other}
                  </SelectItem>
                  <SelectItem value="prefer_not_to_say">
                    {copy.relationshipOptions.prefer_not_to_say}
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        ) : null}
        {definition.sections.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle>{section.label}</CardTitle>
              <CardDescription>
                {copy.ratingInstructions}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {section.questions.map((question) => (
                <fieldset key={question.id} className="rounded-lg border p-4">
                  <legend className="px-1 text-base font-semibold text-slate-900">
                    {question.label}
                  </legend>
                  <div
                    className="mt-3 flex flex-wrap gap-2"
                    role="radiogroup"
                    aria-label={question.label}
                  >
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <label key={rating} className="cursor-pointer">
                        <input
                          className="peer sr-only"
                          type="radio"
                          name={`rating_${question.id}`}
                          value={rating}
                          onChange={() => {
                            setFormError("");
                            setAnsweredQuestionIds((previous) =>
                              new Set(previous).add(question.id),
                            );
                          }}
                        />
                        <span className="inline-flex size-10 items-center justify-center rounded-full border bg-white font-semibold text-slate-700 transition peer-checked:border-olea-green peer-checked:bg-olea-green peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-olea-green">
                          {rating}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
              <div className="grid gap-2">
                <Label htmlFor={`comment_${section.commentId}`}>
                  {copy.optionalCommentPrefix} {section.label}
                </Label>
                <Textarea
                  id={`comment_${section.commentId}`}
                  name={`comment_${section.commentId}`}
                  maxLength={2000}
                  placeholder={copy.commentPlaceholder}
                />
              </div>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader>
            <CardTitle>{copy.overallTitle}</CardTitle>
            <CardDescription>
              {copy.overallBody}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <FreeText
              id="greatestStrength"
              label={copy.greatestStrength}
              placeholder={copy.freeTextPlaceholder}
            />
            <FreeText
              id="importantChange"
              label={copy.importantChange}
              placeholder={copy.freeTextPlaceholder}
            />
            <FreeText
              id="additionalComments"
              label={copy.additionalComments}
              placeholder={copy.freeTextPlaceholder}
            />
            {formError ? (
              <p
                role="alert"
                className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              >
                <AlertCircle className="size-4" />
                {formError}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
              <p className="text-sm text-slate-600">
                {copy.progress(answeredQuestionIds.size, totalQuestions)}
              </p>
              <SubmitButton pendingText={copy.pendingSubmit}>
                {copy.submit}
              </SubmitButton>
            </div>
          </CardContent>
        </Card>
      </form>
      <Dialog
        open={showIncompleteConfirmation}
        onOpenChange={setShowIncompleteConfirmation}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.incompleteTitle}</DialogTitle>
            <DialogDescription>
              {copy.incompleteBody(answeredQuestionIds.size, totalQuestions)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowIncompleteConfirmation(false)}
            >
              {copy.keepEditing}
            </Button>
            <Button type="button" onClick={confirmIncompleteSubmit}>
              {copy.submitResponse}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function FreeText({
  id,
  label,
  placeholder,
}: {
  id: string;
  label: string;
  placeholder: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        name={id}
        maxLength={2000}
        placeholder={placeholder}
      />
    </div>
  );
}
