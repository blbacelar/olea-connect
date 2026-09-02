import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  getLegalDocumentCopy,
  getLegalPageCopy,
} from "@/lib/i18n/legal-documents-copy";
import { getRequestLocale } from "@/lib/i18n/server";
import { LEGAL_DOCUMENTS, type LegalDocumentKey } from "@/lib/legal-documents";

export function generateStaticParams() {
  return Object.values(LEGAL_DOCUMENTS).map(({ href }) => ({
    document: href.replace(/^\/legal\//, ""),
  }));
}

export function generateMetadata({
  params,
}: {
  params: { document: string };
}): Metadata {
  const locale = getRequestLocale();
  const document = getDocument(params.document, locale);
  return document
    ? {
        title: document.title,
        description: document.summary,
        alternates: { canonical: document.href },
      }
    : {};
}

export default function LegalDocumentPage({
  params,
}: {
  params: { document: string };
}) {
  const locale = getRequestLocale();
  const copy = getLegalPageCopy(locale);
  const document = getDocument(params.document, locale);
  if (!document) notFound();

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-olea-ink md:py-12">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex items-center justify-between gap-4 rounded-[14px] border bg-white px-5 py-4 shadow-soft md:px-7">
          <Link
            className="text-lg font-bold text-olea-dark hover:text-olea-green"
            href="/"
          >
            Olea Connects™
          </Link>
          <Link
            className="text-sm font-semibold text-olea-green underline-offset-4 hover:underline"
            href="/signup"
          >
            {copy.returnToSignup}
          </Link>
        </header>

        <article className="overflow-hidden rounded-[14px] border bg-white shadow-soft">
          <div className="border-b bg-gradient-to-br from-white to-olea-light/60 px-6 py-8 md:px-12 md:py-12">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-olea-green">
              {copy.eyebrow}
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-olea-dark md:text-5xl">
              {document.title}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 md:text-lg">
              {document.summary}
            </p>
            <p className="mt-6 text-sm font-semibold text-slate-500">
              {copy.versionLabel} {document.version} | {copy.effectiveLabel}{" "}
              {document.version}
            </p>
          </div>

          <div className="space-y-8 px-6 py-8 md:px-12 md:py-10">
            {document.sections.map((section) => (
              <section key={section.heading} className="space-y-3">
                <h2 className="text-xl font-semibold text-olea-dark">
                  {section.heading}
                </h2>
                <div className="space-y-3 text-sm leading-7 text-slate-700 md:text-base">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <footer className="border-t bg-slate-50 px-6 py-5 text-sm text-slate-600 md:px-12">
            {copy.questionsPrefix}{" "}
            <a
              className="font-semibold text-olea-green underline-offset-4 hover:underline"
              href="mailto:hello@olivesocialimpact.com"
            >
              hello@olivesocialimpact.com
            </a>
            .
          </footer>
        </article>
      </div>
    </main>
  );
}

function getDocument(documentKey: string, locale = getRequestLocale()) {
  const href = `/legal/${documentKey}`;
  const entry = Object.entries(LEGAL_DOCUMENTS).find(
    ([, document]) => document.href === href,
  );

  return entry
    ? getLegalDocumentCopy(entry[0] as LegalDocumentKey, locale)
    : null;
}
