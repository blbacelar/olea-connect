import type { Locale } from "./locales";
import type {
  ReferralPayoutMilestone,
  ReferralPayoutStatus,
  ReferralReferrerStatus,
  ReferralStatus,
} from "@/lib/referrals/domain";

export type ReferralPageCopy = {
  heroEyebrow: string;
  heroTitle: (amount: string) => string;
  heroBody: string;
  signUp: string;
  dashboard: string;
  demoPayout: string;
  retainedPayout: string;
  howItWorks: string;
  steps: {
    title: string;
    body: string;
  }[];
  closingTitle: (amount: string) => string;
  closingBody: string;
  faqs: {
    q: string;
    a: string;
  }[];
  form: {
    eyebrow: string;
    title: string;
    description: string;
    fullName: string;
    email: string;
    organizationName: string;
    organizationPlaceholder: string;
    relationshipToOlea: string;
    relationshipPlaceholder: string;
    payoutContact: string;
    payoutPlaceholder: string;
    termsAccepted: string;
    pending: string;
    submit: string;
  };
  paused: {
    title: string;
    body: string;
  };
  action: {
    fieldErrors: Partial<Record<string, string>>;
    reviewFields: string;
    programPaused: string;
    duplicateReceived: string;
    initialError: string;
    submitted: string;
    termsRequired: string;
  };
  dashboardScreen: {
    back: string;
    title: string;
    description: string;
    emptyReferrals: string;
    emptyPayouts: string;
    table: {
      referral: string;
      organization: string;
      status: string;
      lastMilestone: string;
      milestone: string;
      amount: string;
      due: string;
      paid: string;
    };
    fallback: {
      notSet: string;
      leadCaptured: string;
      notAvailable: string;
    };
    applyTitle: string;
    applyBody: string;
    applyCta: string;
    pendingTitle: (status: string) => string;
    pendingBody: string;
    approvedLink: string;
    shareLink: string;
    shareLinkBody: string;
    openLink: string;
    metrics: {
      referrals: string;
      eligiblePayouts: string;
      paid: string;
    };
    copyLink: string;
    copied: string;
    statuses: {
      referrer: Record<ReferralReferrerStatus, string>;
      referral: Record<ReferralStatus, string>;
      payout: Record<ReferralPayoutStatus, string>;
      milestones: Record<ReferralPayoutMilestone, string>;
    };
  };
};

export const referralPageCopy: Record<Locale, ReferralPageCopy> = {
  "en-CA": {
    heroEyebrow: "Now open for referrals",
    heroTitle: (amount) =>
      `Earn up to ${amount} for every peer you send to Olea.`,
    heroBody:
      "You already know which nonprofit teams are still wrestling with governance work, board packages, and reporting. Introduce them to Olea Connects and get paid when they show up and when they stay.",
    signUp: "Sign up to refer",
    dashboard: "Referrer dashboard",
    demoPayout: "On a demo attended",
    retainedPayout: "When they stay",
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
        body: "You can see the referral status while Olea tracks demo attendance and retained customers.",
      },
    ],
    closingTitle: (amount) => `One introduction. Up to ${amount}.`,
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
        "Preferred payout email and any finance contact notes.",
      termsAccepted:
        "I agree that referral eligibility and payouts are reviewed by Olea, and that self-referrals or duplicate credits can be rejected.",
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
        "Track your approved link, referred organizations, and payout milestones.",
      emptyReferrals:
        "No referrals yet. Share your link when you make a warm introduction.",
      emptyPayouts:
        "Payouts appear here once a referral reaches an eligible milestone.",
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
        },
      },
    },
  },
  "fr-CA": {
    heroEyebrow: "Programme de références maintenant ouvert",
    heroTitle: (amount) =>
      `Gagnez jusqu'à ${amount} pour chaque pair que vous envoyez à Olea.`,
    heroBody:
      "Vous savez déjà quelles équipes sans but lucratif jonglent encore avec la gouvernance, les dossiers du conseil et les rapports. Présentez-les à Olea Connects et recevez une prime lorsqu'elles participent à une démonstration, puis lorsqu'elles restent.",
    signUp: "S'inscrire pour référer",
    dashboard: "Tableau de bord des références",
    demoPayout: "Pour une démonstration à laquelle la personne participe",
    retainedPayout: "Lorsqu'elle reste",
    howItWorks: "Comment ça fonctionne",
    steps: [
      {
        title: "Postulez",
        body: "Dites-nous qui vous êtes et comment vous travaillez avec les leaders d'organismes. Cela prend moins de deux minutes.",
      },
      {
        title: "Obtenez l'approbation",
        body: "Nous confirmons l'admissibilité, envoyons votre courriel d'approbation et ouvrons votre tableau de bord de référence.",
      },
      {
        title: "Partagez votre lien",
        body: "Copiez votre lien de référence Olea et invitez vos pairs à réserver, explorer ou s'inscrire.",
      },
      {
        title: "Suivez les paiements",
        body: "Vous pouvez voir le statut de chaque référence pendant qu'Olea suit les démonstrations et les clients retenus.",
      },
    ],
    closingTitle: (amount) => `Une introduction. Jusqu'à ${amount}.`,
    closingBody:
      "Partagez votre lien aussi largement que vous le souhaitez. Il n'y a aucune limite au nombre de pairs qualifiés que vous pouvez référer.",
    faqs: [
      {
        q: "Qui est admissible?",
        a: "Les consultants, leaders de conseils, partenaires du secteur sans but lucratif et bâtisseurs communautaires qui peuvent faire des introductions pertinentes et chaleureuses.",
      },
      {
        q: "Puis-je me référer moi-même?",
        a: "Non. Les auto-références et les crédits en double sont bloqués afin que le programme demeure équitable.",
      },
      {
        q: "Les paiements sont-ils automatiques?",
        a: "Les paiements sont suivis dans Olea et vérifiés manuellement avant versement, afin que chaque référence conserve une piste d'audit claire.",
      },
    ],
    form: {
      eyebrow: "Postuler au programme",
      title: "Recevoir votre lien de référence",
      description:
        "Nous examinons les demandes avant d'ouvrir un tableau de bord afin que les références restent fiables et alignées avec la communauté Olea.",
      fullName: "Nom complet",
      email: "Courriel",
      organizationName: "Organisme ou entreprise",
      organizationPlaceholder: "Votre organisme",
      relationshipToOlea: "Comment connaissez-vous le public d'Olea?",
      relationshipPlaceholder:
        "Par exemple : je conseille des DG d'organismes, je siège à des conseils ou je travaille avec des organismes communautaires.",
      payoutContact: "Meilleur contact pour le paiement",
      payoutPlaceholder:
        "Courriel de paiement préféré et notes pour le contact financier.",
      termsAccepted:
        "J'accepte qu'Olea vérifie l'admissibilité des références et des paiements, et que les auto-références ou crédits en double puissent être refusés.",
      pending: "Soumission...",
      submit: "Soumettre la demande de référence",
    },
    paused: {
      title: "Les demandes de référence sont en pause",
      body: "Olea n'accepte pas de nouvelles demandes de référence pour le moment. Les personnes déjà approuvées peuvent toujours utiliser leur tableau de bord.",
    },
    action: {
      fieldErrors: {
        email: "Entrez une adresse courriel valide.",
        fullName: "Entrez votre nom complet.",
        organizationName:
          "Gardez le nom de l'organisme ou de l'entreprise concis.",
        payoutContact: "Entrez les coordonnées de paiement.",
        relationshipToOlea:
          "Expliquez comment vous connaissez le public d'Olea.",
        termsAccepted:
          "Vous devez accepter les conditions du programme de références.",
      },
      reviewFields:
        "Vérifiez les champs en surbrillance de la demande de référence.",
      programPaused:
        "Le programme de références n'accepte pas de nouvelles demandes pour le moment.",
      duplicateReceived:
        "Demande de référence reçue. Si ce courriel est déjà inscrit, nous conserverons le statut de référence existant et ferons un suivi par courriel.",
      initialError:
        "Impossible de soumettre votre demande de référence. Veuillez réessayer.",
      submitted:
        "Demande de référence soumise. Nous l'examinerons et vous enverrons un courriel lorsque votre lien sera prêt.",
      termsRequired:
        "Vous devez accepter les conditions du programme de références.",
    },
    dashboardScreen: {
      back: "Programme de références",
      title: "Tableau de bord des références",
      description:
        "Suivez votre lien approuvé, les organismes référés et les jalons de paiement.",
      emptyReferrals:
        "Aucune référence pour le moment. Partagez votre lien lorsque vous faites une introduction chaleureuse.",
      emptyPayouts:
        "Les paiements apparaissent ici lorsqu'une référence atteint un jalon admissible.",
      table: {
        referral: "Référence",
        organization: "Organisme",
        status: "Statut",
        lastMilestone: "Dernier jalon",
        milestone: "Jalon",
        amount: "Montant",
        due: "Échéance",
        paid: "Payé",
      },
      fallback: {
        notSet: "Non défini",
        leadCaptured: "Contact capturé",
        notAvailable: "Pas encore disponible",
      },
      applyTitle: "Postulez avant d'ouvrir un tableau de bord de référence",
      applyBody:
        "Lorsque votre demande sera approuvée par Olea, votre lien de référence unique et votre suivi des paiements apparaîtront ici.",
      applyCta: "Postuler au programme",
      pendingTitle: (status) => `Votre demande de référence est ${status}`,
      pendingBody:
        "Nous vous enverrons un courriel lorsque votre lien de référence sera prêt.",
      approvedLink: "Lien approuvé",
      shareLink: "Partagez votre lien de référence",
      shareLinkBody:
        "La première référence valide l'emporte. Les auto-références et les crédits de paiement en double sont rejetés automatiquement.",
      openLink: "Ouvrir le lien",
      metrics: {
        referrals: "Références",
        eligiblePayouts: "Paiements admissibles",
        paid: "Payé",
      },
      copyLink: "Copier le lien",
      copied: "Copié",
      statuses: {
        referrer: {
          approved: "Approuvée",
          archived: "Archivée",
          pending: "En attente",
          rejected: "Refusée",
          suspended: "Suspendue",
        },
        referral: {
          demo_attended: "Démonstration suivie",
          demo_booked: "Démonstration réservée",
          lead_created: "Contact créé",
          paid: "Payée",
          payout_eligible: "Paiement admissible",
          rejected: "Refusée",
          retained: "Retenue",
          subscription_started: "Abonnement commencé",
        },
        payout: {
          eligible: "Admissible",
          paid: "Payé",
          pending: "En attente",
          rejected: "Refusé",
        },
        milestones: {
          demo_attended: "Démonstration suivie",
          retained: "Client retenu",
        },
      },
    },
  },
};

export function getReferralPageCopy(locale: Locale) {
  return referralPageCopy[locale];
}
