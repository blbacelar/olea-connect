import type { ReferralPageCopy } from "./referral-page-copy";

export const referralPageCopyFr: ReferralPageCopy = {
  heroEyebrow: "Programme de références maintenant ouvert",
  heroTitle: (amount) =>
    `Gagnez jusqu'à ${amount} pour chaque pair que vous envoyez à Olea.`,
  heroBody:
    "Vous savez déjà quelles équipes sans but lucratif jonglent encore avec la gouvernance, les dossiers du conseil et les rapports. Présentez-les à Olea Connects™ et recevez une prime lorsqu'elles participent à une démonstration, puis lorsqu'elles restent.",
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
};
