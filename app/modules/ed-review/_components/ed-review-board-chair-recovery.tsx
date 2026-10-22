"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";

import { appointBoardChairRecoveryAction } from "@/app/modules/ed-review/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import type { EdReviewBoardChairRecoveryData } from "@/lib/data/ed-review";

export function EdReviewBoardChairRecovery({
  data,
  appointed,
  failed,
}: {
  data: EdReviewBoardChairRecoveryData;
  appointed: boolean;
  failed: boolean;
}) {
  const [userId, setUserId] = React.useState("");

  return (
    <main className="mx-auto max-w-3xl p-6 md:p-10">
      <Card className="border-amber-200 bg-amber-50/70 shadow-soft">
        <CardHeader>
          <div className="flex size-10 items-center justify-center rounded-full bg-amber-100 text-amber-900">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
          <CardTitle className="mt-3 text-2xl">Appoint a Board Chair</CardTitle>
          <CardDescription className="max-w-2xl text-base leading-7">
            This confidential review requires an explicit Board Chair assignment.
            As a workspace administrator, you can appoint one active member to
            recover access to {data.cycle.title} for {data.cycle.reviewYear}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {appointed ? (
            <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-900">
              Board Chair access was assigned. That person can now open this
              confidential review.
            </p>
          ) : null}
          {failed ? (
            <p
              className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-900"
              role="alert"
            >
              Board Chair access could not be assigned. Refresh the page and
              try again. If the problem continues, contact support.
            </p>
          ) : null}
          <form action={appointBoardChairRecoveryAction} className="grid gap-4">
            <input type="hidden" name="cycleId" value={data.cycle.id} />
            <input type="hidden" name="userId" value={userId} />
            <div className="grid max-w-md gap-2">
              <Label htmlFor="board-chair-recovery-member">Active workspace member</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger
                  id="board-chair-recovery-member"
                  aria-label="Active workspace member"
                >
                  <SelectValue placeholder="Select the Board Chair" />
                </SelectTrigger>
                <SelectContent>
                  {data.availableReviewers.map((reviewer) => (
                    <SelectItem key={reviewer.userId} value={reviewer.userId}>
                      {reviewer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-3">
              <SubmitButton disabled={!userId} pendingText="Appointing Board Chair...">
                Appoint Board Chair
              </SubmitButton>
              <Button asChild type="button" variant="outline">
                <a href="/team">Manage workspace members</a>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
