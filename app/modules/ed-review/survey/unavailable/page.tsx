import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function UnavailableEdReviewSurveyPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <AlertCircle className="size-10 text-amber-600" aria-hidden="true" />
          <CardTitle className="mt-3 text-2xl">
            Survey link unavailable
          </CardTitle>
          <CardDescription className="text-base leading-7">
            This anonymous feedback link may be closed, expired, or no longer
            active. Ask the person who shared it with you for a current link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/">Return to Olea Connects</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
