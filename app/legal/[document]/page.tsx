import { notFound } from "next/navigation";

import { LEGAL_DOCUMENTS, type LegalDocumentKey } from "@/lib/legal-documents";

const paragraphs: Record<LegalDocumentKey, string[]> = {
  terms: [
    "Olea Connects provides governance tools, community access, and related services to subscribing organizations.",
    "Membership fees are billed in advance on the selected quarterly or annual cadence. Taxes are calculated at checkout. Cancellations take effect at the end of the current paid period unless a written agreement says otherwise.",
    "Members must keep account credentials private, use the platform lawfully, and only upload information they are permitted to share.",
  ],
  privacy: [
    "We collect account, organization, billing, usage, and support information needed to provide and secure the service.",
    "Payment card details are handled by our hosted payment provider. We use service providers for authentication, email delivery, analytics, and operational support under appropriate safeguards.",
    "You may contact support to ask about access, correction, or deletion of personal information, subject to records we must retain for legal or security reasons.",
  ],
  dataOwnership: [
    "Your organization owns the documents, posts, schedules, metrics, and other content it submits to Olea Connects.",
    "You grant Olea Connects only the limited rights needed to host, secure, back up, display, and process that content to operate the service.",
    "We do not sell member content. Export and retention requests are handled according to the subscription and applicable legal requirements.",
  ],
  confidentiality: [
    "Members must treat board materials, personal information, financial information, and other non-public organizational content as confidential.",
    "Olea Connects personnel and service providers may access confidential content only when needed to operate, secure, or support the service and are bound by confidentiality obligations.",
    "Report suspected unauthorized access promptly through the support channel so we can investigate and respond.",
  ],
};

export function generateStaticParams() {
  return Object.keys(LEGAL_DOCUMENTS).map((document) => ({ document }));
}

export default function LegalDocumentPage({
  params,
}: {
  params: { document: string };
}) {
  if (!(params.document in LEGAL_DOCUMENTS)) notFound();
  const key = params.document as LegalDocumentKey;
  const document = LEGAL_DOCUMENTS[key];

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12">
      <article className="mx-auto max-w-3xl rounded-[14px] border bg-white p-8 shadow-soft md:p-12">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-olea-green">
          Olea Connects · Version {document.version}
        </p>
        <h1 className="mt-3 text-3xl font-bold text-olea-dark">
          {document.title}
        </h1>
        <p className="mt-4 text-slate-600">{document.summary}</p>
        <div className="mt-8 space-y-5 text-sm leading-7 text-slate-700">
          {paragraphs[key].map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <p className="mt-10 border-t pt-5 text-xs text-slate-500">
          Effective {document.version}. Contact hello@olivesocialimpact.com with questions.
        </p>
      </article>
    </main>
  );
}
