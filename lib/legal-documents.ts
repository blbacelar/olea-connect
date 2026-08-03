export const LEGAL_DOCUMENTS = {
  terms: {
    title: "Terms of Service",
    version: "2026-07-24",
    href: "/legal/terms",
    summary:
      "These terms describe membership access, billing, renewals, cancellations, and acceptable use of Olea Connects™.",
    sections: [
      {
        heading: "1. The service",
        paragraphs: [
          "Olea Connects™ provides governance tools, branded templates, community resources, webinars, consulting workflows, and related services to subscribing organizations.",
          "Your organization may use the service only through authorized accounts and according to the plan, seat limits, and access permissions associated with its subscription.",
        ],
      },
      {
        heading: "2. Accounts and acceptable use",
        paragraphs: [
          "You are responsible for keeping account credentials private, maintaining accurate account information, and notifying us promptly if you suspect unauthorized access.",
          "You must not use Olea Connects™ to break the law, interfere with the service, evade access controls, upload malicious code, or submit content that you do not have permission to share.",
        ],
      },
      {
        heading: "3. Billing and cancellation",
        paragraphs: [
          "Membership fees are billed in advance on the selected billing cadence. Applicable taxes are calculated at checkout. Subscription changes, renewals, and seat charges are shown before confirmation where applicable.",
          "You may cancel at any time. Unless a written agreement says otherwise, cancellation takes effect at the end of the current paid period and does not remove obligations already incurred.",
        ],
      },
      {
        heading: "4. Service changes and support",
        paragraphs: [
          "We may improve, change, or temporarily suspend parts of the service to maintain security, reliability, or product quality. We will make reasonable efforts to communicate material changes.",
          "Questions about an account or subscription can be sent to hello@olivesocialimpact.com.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    version: "2026-07-24",
    href: "/legal/privacy",
    summary:
      "This policy explains what personal information Olea Connects™ collects, why it is used, and how it is protected.",
    sections: [
      {
        heading: "1. Information we collect",
        paragraphs: [
          "We collect account and contact details, organization information, subscription and billing records, content submitted to the service, support requests, and technical information needed to operate and secure the platform.",
          "Payment card details are handled by our hosted payment provider. Olea Connects™ receives the payment and subscription information needed to manage access and billing, not the full card number or security code.",
        ],
      },
      {
        heading: "2. How we use information",
        paragraphs: [
          "We use information to provide and personalize the service, authenticate users, process subscriptions, deliver notifications, support members, prevent abuse, improve reliability, and meet legal and security obligations.",
          "We do not sell member content or personal information. We may use trusted service providers for hosting, authentication, payment processing, email delivery, analytics, and operational support under appropriate safeguards.",
        ],
      },
      {
        heading: "3. Retention and protection",
        paragraphs: [
          "We retain information for as long as needed to provide the service, resolve disputes, maintain security, meet legal requirements, and enforce agreements. Retention periods can differ by information type.",
          "We use access controls, encryption in transit, least-privilege service access, monitoring, and other reasonable safeguards. No internet service can guarantee absolute security.",
        ],
      },
      {
        heading: "4. Your choices",
        paragraphs: [
          "You may contact hello@olivesocialimpact.com to ask about access, correction, deletion, or questions about how your information is used. We may need to verify the request and retain records required for legal or security reasons.",
        ],
      },
    ],
  },
  dataOwnership: {
    title: "Data Ownership Agreement",
    version: "2026-07-24",
    href: "/legal/data-ownership",
    summary:
      "This agreement confirms that member organizations retain ownership of the content and records they place in the platform.",
    sections: [
      {
        heading: "1. Your organization's content",
        paragraphs: [
          "Your organization owns the documents, posts, schedules, metrics, meeting materials, consulting requests, and other content it submits to Olea Connects™.",
          "You are responsible for ensuring that your organization has the rights and permissions needed to upload, store, and share that content with the people you authorize.",
        ],
      },
      {
        heading: "2. Limited service license",
        paragraphs: [
          "You grant Olea Connects™ a limited, non-exclusive right to host, secure, back up, display, transform, and process your content only as needed to provide, maintain, and improve the service.",
          "This permission ends when the content is deleted or the service relationship ends, except where processing or retention is required for security, legal, audit, backup, or dispute-resolution purposes.",
        ],
      },
      {
        heading: "3. Exports and deletion",
        paragraphs: [
          "Export and retention requests are handled according to the subscription, documented product workflows, and applicable legal requirements. Generated files may be subject to separate cleanup and retention controls.",
          "We do not claim ownership of your organization's content and do not sell it to third parties.",
        ],
      },
    ],
  },
  confidentiality: {
    title: "Confidentiality Policy",
    version: "2026-07-24",
    href: "/legal/confidentiality",
    summary:
      "This policy sets expectations for protecting board materials, member information, and other sensitive organizational content.",
    sections: [
      {
        heading: "1. Confidential information",
        paragraphs: [
          "Confidential information includes board materials, personal information, financial information, unpublished plans, credentials, consulting requests, and other non-public organizational content shared through Olea Connects™.",
        ],
      },
      {
        heading: "2. Member responsibilities",
        paragraphs: [
          "Members must use confidential information only for authorized organizational purposes, share it only with people who need access, and protect their credentials and downloaded materials.",
          "Do not upload information that you are not permitted to share. Remove access promptly when a person no longer needs it and report suspected unauthorized access without delay.",
        ],
      },
      {
        heading: "3. Olea Connects™ responsibilities",
        paragraphs: [
          "Olea Connects™ personnel and service providers may access confidential content only when needed to operate, secure, maintain, or support the service. Access is subject to appropriate confidentiality and security obligations.",
          "We may disclose information when required by law, legal process, or an urgent need to protect users, the service, or the public, while taking reasonable steps to limit the disclosure.",
        ],
      },
      {
        heading: "4. Reporting a concern",
        paragraphs: [
          "Report suspected unauthorized access, accidental disclosure, or a security concern promptly to hello@olivesocialimpact.com so we can investigate and respond.",
        ],
      },
    ],
  },
} as const;

export type LegalDocumentKey = keyof typeof LEGAL_DOCUMENTS;
export type LegalDocument = (typeof LEGAL_DOCUMENTS)[LegalDocumentKey];
