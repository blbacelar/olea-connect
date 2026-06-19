import { TemplateSlugPage } from "../template-slug-page";

export default async function TemplatePage({
  params,
}: {
  params: { slug: string };
}) {
  return <TemplateSlugPage slug={params.slug} />;
}
