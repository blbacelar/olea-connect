import { HeartHandshake } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { generosityCopy } from "@/lib/i18n/generosity-copy";
import { getRequestLocale } from "@/lib/i18n/server";

// Keep old links useful without reopening the discontinued application flow.
export default function GrantsPage() {
  const copy = generosityCopy[getRequestLocale()];
  return (
    <div>
      <PageHeader
        title={copy.title}
        description={copy.description}
      />
      <Card className="max-w-3xl p-6 md:p-8">
        <HeartHandshake className="size-8 text-olea-green" aria-hidden="true" />
        <h2 className="mt-4 text-2xl font-bold text-slate-900">
          {copy.statValue} {copy.statDetail}
        </h2>
        <p className="mt-3 leading-7 text-slate-600">
          {copy.body}
        </p>
      </Card>
    </div>
  );
}
