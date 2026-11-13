import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AnnualDocumentAccessError, getAnnualDocumentData } from "@/lib/data/ed-annual-document";

import { AnnualReviewWorkspace } from "./workspace";

export const dynamic = "force-dynamic";

export default async function AnnualEdReviewPage({ searchParams }: {
  searchParams?: Promise<{ preview?: string }>;
}) {
  let data;
  const params = await searchParams;
  try { data = await getAnnualDocumentData({ previewRole: params?.preview === "cfo" ? "cfo" : undefined }); }
  catch (error) {
    if (!(error instanceof AnnualDocumentAccessError)) throw error;
    return <main className="mx-auto max-w-2xl space-y-4 p-8">
      <h1 className="text-2xl font-semibold">Annual review access restricted</h1>
      <p>{error.message}</p>
      <Button asChild variant="outline"><Link href="/modules/ed-review">Back to ED Review</Link></Button>
    </main>;
  }
  return <AnnualReviewWorkspace key={`${data.generalRevision}-${data.compensationRevision}`}
    data={data} />;
}
