import type { ReferralPageCopy } from "./referral-page-copy";

export const referralPageCopyEn: ReferralPageCopy = {
  heroEyebrow: "Now open for referrals",
  heroTitle: (amount) =>
    `Earn up to ${amount} after your referral's first paid membership.`,
  heroBody:
    "Introduce nonprofit peers to Olea Connects™. Approved referrers can earn 10% of the referred organization's first successful quarterly or annual membership payment, capped at $500. Renewals do not earn another commission. Payouts are reviewed first.",
  signUp: "Sign up to refer",
  dashboard: "Referrer dashboard",
  commissionLabel: "Commission on first payment",
  capLabel: "Maximum per referred organization",
  howItWorks: "How it works",
  steps: [
    {
      title: "Apply",
      body: "Tell us who you are and how you work with nonprofit leaders. It takes under two minutes.",
    },
    {
      title: "Get approved",
      body: "We confirm fit, send your approval email, and open your referrer dashboard.",
    },
    {
      title: "Share your link",
      body: "Copy your Olea referral link and send peers to book, explore, or sign up.",
    },
    {
      title: "Track payouts",
      body: "See referral status and any verified commission in your dashboard. Payouts are reviewed before payment.",
    },
  ],
  referrerPolicy: {
    nonprofitTitle: "Nonprofit referrers",
    nonprofitBody:
      "When a nonprofit organization refers a peer, the reward is paid to the organization or, at its choice, applied as a credit toward its Olea Connects™ membership. It is never paid to individual staff or board members.",
    transparencyTitle: "Transparency",
    transparencyBody:
      "We ask all referrers to tell the organizations they introduce that they receive a referral reward if that organization joins Olea Connects™.",
  },
  closingTitle: (amount) => `One first paid membership. Up to ${amount} for the referrer.`,
  closingBody:
    "Share your link as widely as you like. There is no cap on how many qualified peers you can refer.",
  faqs: [
    {
      q: "Who is eligible?",
      a: "Consultants, board leaders, nonprofit partners, and community builders who can make warm, relevant introductions.",
    },
    {
      q: "Can I refer myself?",
      a: "No. Self-referrals and duplicate credits are blocked so the program stays fair.",
    },
    {
      q: "Are payouts automatic?",
      a: "Payouts are tracked in Olea and reviewed manually before payment, so every referral has a clear audit trail.",
    },
  ],
  form: {
    eyebrow: "Apply to refer",
    title: "Get your referral link",
    description:
      "We review applications before opening a dashboard so referrals stay trusted and aligned with Olea's community.",
    fullName: "Full name",
    email: "Email",
    organizationName: "Organization or company",
    organizationPlaceholder: "Your organization",
    relationshipToOlea: "How do you know Olea's audience?",
    relationshipPlaceholder:
      "For example: I advise nonprofit EDs, serve on boards, or work with community organizations.",
    payoutContact: "Best payout contact",
    payoutPlaceholder:
      "Preferred payout email or nonprofit finance contact; mention a membership credit here if preferred.",
    termsAccepted:
      "I will disclose the referral reward to organizations I introduce. If referring for a nonprofit, I will direct its reward to the organization or its membership credit, never to an individual. Olea reviews eligibility and payouts; self-referrals and duplicate credits can be rejected.",
    pending: "Submitting...",
    submit: "Submit referral application",
  },
  paused: {
    title: "Referral applications are paused",
    body: "Olea is not accepting new referral applications right now. Existing approved referrers can still use their dashboard.",
  },
  action: {
    fieldErrors: {
      email: "Enter a valid email address.",
      fullName: "Enter your full name.",
      organizationName: "Keep the organization or company name concise.",
      payoutContact: "Enter payout contact details.",
      relationshipToOlea: "Tell us how you know Olea's audience.",
      termsAccepted: "You must accept the referral program terms.",
    },
    reviewFields: "Review the highlighted referral application fields.",
    programPaused:
      "The referral program is not accepting applications right now.",
    duplicateReceived:
      "Referral application received. If this email is already registered, we will keep the existing referral status and follow up by email.",
    initialError:
      "We could not submit your referral application. Please try again.",
    submitted:
      "Referral application submitted. We will review it and email you when your referral link is ready.",
    termsRequired: "You must accept the referral program terms.",
  },
  dashboardScreen: {
    back: "Referral program",
    title: "Referral dashboard",
    description:
      "Track your approved link, referred organizations, and reviewed payouts.",
    emptyReferrals:
      "No referrals yet. Share your link when you make a warm introduction.",
    emptyPayouts:
      "A commission appears here after the referred organization's first successful membership payment.",
    table: {
      referral: "Referral",
      organization: "Organization",
      status: "Status",
      lastMilestone: "Last milestone",
      milestone: "Milestone",
      amount: "Amount",
      due: "Due",
      paid: "Paid",
    },
    fallback: {
      notSet: "Not set",
      leadCaptured: "Lead captured",
      notAvailable: "Not available yet",
    },
    applyTitle: "Apply before opening a referral dashboard",
    applyBody:
      "Once Olea approves your application, your unique referral link and payout tracker will appear here.",
    applyCta: "Apply to refer",
    pendingTitle: (status) => `Your referral application is ${status}`,
    pendingBody: "We will email you when your referral link is ready.",
    approvedLink: "Approved link",
    shareLink: "Share your referral link",
    shareLinkBody:
      "First valid referral wins. Self-referrals and duplicate checkout credits are rejected automatically.",
    openLink: "Open link",
    metrics: {
      referrals: "Referrals",
      eligiblePayouts: "Eligible payouts",
      paid: "Paid",
    },
    copyLink: "Copy link",
    copied: "Copied",
    copyFailed: "Copy failed. Select the link above and copy it manually.",
    statuses: {
      referrer: {
        approved: "Approved",
        archived: "Archived",
        pending: "Pending",
        rejected: "Rejected",
        suspended: "Suspended",
      },
      referral: {
        demo_attended: "Demo attended",
        demo_booked: "Demo booked",
        lead_created: "Lead created",
        paid: "Paid",
        payout_eligible: "Payout eligible",
        rejected: "Rejected",
        retained: "Retained",
        subscription_started: "Subscription started",
      },
      payout: {
        eligible: "Eligible",
        paid: "Paid",
        pending: "Pending",
        rejected: "Rejected",
      },
      milestones: {
        demo_attended: "Demo attended",
        retained: "Customer retained",
        first_payment: "First membership payment",
      },
    },
  },
};
