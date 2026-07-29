import { notFound } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { canCurrentUserManageEvents } from "@/lib/data/webinars";

import { WebinarCreateForm } from "./webinar-create-form";

export default async function NewWebinarPage() {
  const canManageEvents = await canCurrentUserManageEvents();

  if (!canManageEvents) notFound();

  return (
    <div>
      <PageHeader
        title="Create webinar"
        description="Publish a Zoom-linked event and choose which membership plans can access it."
      />
      <WebinarCreateForm />
    </div>
  );
}
