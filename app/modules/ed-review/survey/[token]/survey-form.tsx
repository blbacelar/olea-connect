"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";

import { submitAnonymousSurveyAction } from "@/app/modules/ed-review/actions";
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
} from "@/lib/ed-review/domain";

type PublicCampaign = {
  kind: EdReviewCampaignKind;
  title: string;
  reviewTitle: string;
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
  const definition = getSurveyDefinition(campaign.kind);
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
        "Select at least one rating before submitting your feedback.",
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
              Thank you for your feedback
            </CardTitle>
            <CardDescription>
              Your response was submitted anonymously. This window can now be
              closed.
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
                  Anonymous feedback
                </p>
                <CardTitle className="mt-2 text-3xl">
                  {campaign.title}
                </CardTitle>
                <CardDescription className="mt-3 max-w-2xl">
                  {definition.description} We do not request your name, email
                  address, account, location, device information, or browser
                  details. Please do not include identifying details in
                  comments; common contact details are removed before saving.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
        {campaign.kind === "partner" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Optional context</CardTitle>
              <CardDescription>
                This broad category is not used to identify you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={relationshipType}
                onValueChange={setRelationshipType}
              >
                <SelectTrigger className="max-w-sm">
                  <SelectValue placeholder="Select a relationship type (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="funder">Funder</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="community_member">
                    Community member
                  </SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer_not_to_say">
                    Prefer not to say
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
                Rate each statement from 1 (strongly disagree) to 5 (strongly
                agree). You may leave individual questions blank.
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
                  Optional comment about {section.label}
                </Label>
                <Textarea
                  id={`comment_${section.commentId}`}
                  name={`comment_${section.commentId}`}
                  maxLength={2000}
                  placeholder="Share context without including names or contact details."
                />
              </div>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader>
            <CardTitle>Overall feedback</CardTitle>
            <CardDescription>
              Optional comments are most useful when they focus on observable
              actions and outcomes. Do not include names or contact information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <FreeText
              id="greatestStrength"
              label="What is the ED/CEO’s greatest strength?"
            />
            <FreeText
              id="importantChange"
              label="What is the most important change or area for growth?"
            />
            <FreeText
              id="additionalComments"
              label="Anything else the Board Chair should consider?"
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
                {answeredQuestionIds.size} of {totalQuestions} ratings selected.
                At least one rating is required.
              </p>
              <SubmitButton pendingText="Submitting anonymously...">
                Submit anonymous feedback
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
            <DialogTitle>Submit with unanswered ratings?</DialogTitle>
            <DialogDescription>
              You selected {answeredQuestionIds.size} of {totalQuestions}{" "}
              ratings. Blank ratings are excluded from the summary. You can
              return to complete them or submit this partial response now.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowIncompleteConfirmation(false)}
            >
              Keep editing
            </Button>
            <Button type="button" onClick={confirmIncompleteSubmit}>
              Submit response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function FreeText({ id, label }: { id: string; label: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        name={id}
        maxLength={2000}
        placeholder="Optional, up to 2,000 characters."
      />
    </div>
  );
}
