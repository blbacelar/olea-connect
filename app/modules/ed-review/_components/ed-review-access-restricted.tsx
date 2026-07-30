import { ShieldAlert } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function EdReviewAccessRestricted() {
  return (
    <main className="mx-auto max-w-3xl p-6 md:p-10">
      <Card className="border-amber-200 bg-amber-50/70 shadow-soft">
        <CardHeader>
          <div className="flex size-10 items-center justify-center rounded-full bg-amber-100 text-amber-900">
            <ShieldAlert className="size-5" aria-hidden="true" />
          </div>
          <CardTitle className="mt-3 text-2xl">
            This review is restricted
          </CardTitle>
          <CardDescription className="max-w-2xl text-base leading-7">
            Only an explicitly assigned Board Chair or HR reviewer can access
            this confidential ED/CEO review. Ask the Board Chair to assign
            access if you need to participate in the review process.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-700">
            Workspace administrators can recover a missing Board Chair
            assignment from this page.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
