import { TemplateSlugPage } from "../template-slug-page";

export default async function TemplatePage(
  props: {
    params: Promise<{ slug: string }>;
    searchParams?: Promise<{ session?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  return <TemplateSlugPage slug={params.slug} sessionId={searchParams?.session} />;
}
