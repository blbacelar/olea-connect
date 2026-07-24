export const LEGAL_DOCUMENTS = {
  terms: {
    title: "Terms of Service",
    version: "2026-07-24",
    href: "/legal/terms",
    summary:
      "These terms describe membership access, billing, renewals, cancellations, and acceptable use of Olea Connects.",
  },
  privacy: {
    title: "Privacy Policy",
    version: "2026-07-24",
    href: "/legal/privacy",
    summary:
      "This policy explains what personal information Olea Connects collects, why it is used, and how it is protected.",
  },
  dataOwnership: {
    title: "Data Ownership Agreement",
    version: "2026-07-24",
    href: "/legal/data-ownership",
    summary:
      "This agreement confirms that member organizations retain ownership of the content and records they place in the platform.",
  },
  confidentiality: {
    title: "Confidentiality Policy",
    version: "2026-07-24",
    href: "/legal/confidentiality",
    summary:
      "This policy sets expectations for protecting board materials, member information, and other sensitive organizational content.",
  },
} as const;

export type LegalDocumentKey = keyof typeof LEGAL_DOCUMENTS;
