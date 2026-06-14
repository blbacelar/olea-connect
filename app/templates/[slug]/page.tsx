import { ArrowLeft, BellRing, FileClock } from "lucide-react";
import Link from "next/link";

import { TierBadge } from "@/components/TierBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getTemplateBySlug } from "@/lib/data/templates";

function formatSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default async function TemplateComingSoonPage({
  params,
}: {
  params: { slug: string };
}) {
  const template = await getTemplateBySlug(params.slug);
  const templateName = template?.name ?? formatSlug(params.slug) ?? "Template";

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="-ml-3 text-slate-600">
        <Link href="/templates">
          <ArrowLeft className="size-4" />
          Back to templates
        </Link>
      </Button>

      <Card className="overflow-hidden shadow-soft">
        <div className="h-2 bg-olea-orange" />
        <CardContent className="grid min-h-[520px] place-items-center p-6 text-center md:p-12">
          <div className="max-w-xl">
            <span className="mx-auto grid size-16 place-items-center rounded-xl bg-olea-light text-olea-green">
              <FileClock className="size-8" />
            </span>
            <div className="mt-6 flex justify-center">
              {template ? <TierBadge tier={template.requiredTier} /> : null}
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.08em] text-olea-green">
              Coming soon
            </p>
            <h1 className="mt-2 text-balance text-3xl font-bold md:text-4xl">
              {templateName}
            </h1>
            <p className="mx-auto mt-4 max-w-lg leading-7 text-slate-600">
              {template?.description ??
                "This resource is not available yet. We are preparing more practical governance tools for your organization."}
            </p>
            <div className="mt-8 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900">
              <BellRing className="mx-auto mb-2 size-5" />
              This template is being prepared and will be added to your
              resource library soon.
            </div>
            <Button asChild className="mt-8">
              <Link href="/templates">Browse available templates</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
