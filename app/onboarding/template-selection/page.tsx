import { redirect } from "next/navigation";

import { getTemplateSelectionOptions } from "@/lib/data/templates";
import { requireMemberContext } from "@/lib/data/member-context";

import { TemplateSelection } from "./template-selection";

export default async function TemplateSelectionPage() {
  const { organization } = await requireMemberContext();
  if (organization.tier !== "seedling") {
    redirect("/dashboard");
  }

  const templates = await getTemplateSelectionOptions();
  return <TemplateSelection templates={templates} />;
}
