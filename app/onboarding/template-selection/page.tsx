import { getTemplateSelectionOptions } from "@/lib/data/templates";

import { TemplateSelection } from "./template-selection";

export default async function TemplateSelectionPage() {
  const templates = await getTemplateSelectionOptions();
  return <TemplateSelection templates={templates} />;
}
