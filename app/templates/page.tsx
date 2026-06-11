import { getTemplates } from "@/lib/db";

import { TemplateLibrary } from "./template-library";

export default async function TemplatesPage() {
  const templates = await getTemplates();
  return <TemplateLibrary templates={templates} />;
}
