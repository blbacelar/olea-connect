import { TemplateSlugPage } from "../template-slug-page";

export default async function TemplatePage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { session?: string };
}) {
  return <TemplateSlugPage slug={params.slug} sessionId={searchParams?.session} />;
}
