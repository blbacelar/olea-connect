import type { MembershipTier } from "@/lib/types";
import type { Locale } from "@/lib/i18n/locales";

export type LocalizedPlanCopy = {
  name: string;
  seats: string;
  audience: string;
  summary: string;
  features: string[];
};

export type PublicSiteCopy = {
  localeSelector: {
    ariaLabel: string;
    english: string;
    french: string;
  };
  logo: {
    ariaLabel: string;
    tagline: string;
  };
  nav: {
    alreadyMember: string;
    login: string;
    memberLogin: string;
    whatYouGet: string;
    howItWorks: string;
    pricing: string;
    faq: string;
    sponsorship: string;
    referrals: string;
    getStarted: string;
  };
  hero: {
    badge: string;
    title: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    assurances: string[];
    quote: string;
    quoteLabel: string;
    preview: {
      nav: string[];
      organization: string;
      greeting: string;
      title: string;
      governanceTemplates: string;
      learningResources: string;
      fundTitle: string;
      fundSubtitle: string;
      fundDescription: string;
      brandProfile: string;
      appliedToDownloads: string;
      templateTitle: string;
      templateStatus: string;
    };
  };
  transformation: {
    eyebrow: string;
    title: string;
    description: string;
    problems: Array<{
      title: string;
      text: string;
    }>;
    afterEyebrow: string;
    afterTitle: string;
    afterDescription: string;
  };
  features: {
    eyebrow: string;
    title: string;
    description: string;
    items: Array<{
      title: string;
      text: string;
      outcome: string;
    }>;
  };
  trust: {
    intro: string;
    signals: Array<{
      value: string;
      label: string;
    }>;
  };
  workflow: {
    eyebrow: string;
    title: string;
    description: string;
    steps: Array<{
      number: string;
      title: string;
      text: string;
    }>;
  };
  pricing: {
    eyebrow: string;
    title: string;
    description: string;
    foundingLabel: string;
    foundingNotice: string;
    quarterly: string;
    annual: string;
    annualBadge: string;
    mostPopular: string;
    perYear: string;
    perQuarter: string;
    foundingYearPrefix: string;
    eligibility: string;
    choosePlan: string;
    optionalSupportEyebrow: string;
    optionalSupportTitle: string;
    optionalSupportDescription: string;
    annualPlanningNote: string;
    packageSupportNote: string;
    retreatTitle: string;
    retreatDescription: string;
    retreatNote: string;
    referralsEyebrow: string;
    referralsTitle: string;
    referralsDescription: string;
    plans: Record<MembershipTier, LocalizedPlanCopy>;
    policies: string[];
    addOns: Array<{
      name: string;
      description: string;
      rateLabel: string;
      packages: Array<{
        name: string;
        hours: string;
      }>;
    }>;
    retreat: Array<{
      name: string;
      detail: string;
    }>;
    referralRewards: Array<{
      referrals: string;
      grant: string;
      coaching: string;
    }>;
  };
  faq: {
    eyebrow: string;
    title: string;
    description: string;
    items: Array<{
      question: string;
      answer: string;
    }>;
  };
  finalCta: {
    eyebrow: string;
    title: string;
    description: string;
    cta: string;
    pricingNote: string;
  };
  footer: {
    description: string;
    copyright: string;
    prices: string;
  };
};

export const publicSiteCopy: Record<Locale, PublicSiteCopy> = {
  "en-CA": {
    localeSelector: {
      ariaLabel: "Choose language",
      english: "English",
      french: "Français",
    },
    logo: {
      ariaLabel: "Olea Connects governance platform",
      tagline: "Governance, branded.",
    },
    nav: {
      alreadyMember: "Already a member?",
      login: "Log in",
      memberLogin: "Member login",
      whatYouGet: "What you get",
      howItWorks: "How it works",
      pricing: "Pricing",
      faq: "FAQ",
      sponsorship: "Sponsorship",
      referrals: "Referrals",
      getStarted: "Get started",
    },
    hero: {
      badge: "Built for nonprofit organizations",
      title:
        "The tools, community, and funding connections your nonprofit needs to grow.",
      description:
        "Create board-ready documents in your own brand, learn from sector experts, find grant opportunities, and connect with nonprofit leaders who understand the work.",
      primaryCta: "Join Olea Connects™",
      secondaryCta: "See how it works",
      assurances: [
        "Join in about 5 minutes",
        "Plans from $800/year",
        "Quarterly billing available",
      ],
      quote:
        "Whatever stage your organization is at, there is a place for you here.",
      quoteLabel: "The Olea Connects™ promise",
      preview: {
        nav: ["Dashboard", "Templates", "Webinars", "Olea Gives", "Community"],
        organization: "JP Centre for Youth",
        greeting: "Good morning, Sarah",
        title: "Your nonprofit home base",
        governanceTemplates: "Governance templates",
        learningResources: "Learning resources",
        fundTitle: "Olea Gives Fund",
        fundSubtitle: "Quarterly grant applications",
        fundDescription:
          "Simple, one-page applications for $500 capacity grants.",
        brandProfile: "Brand profile",
        appliedToDownloads: "Applied to every download",
        templateTitle: "Board Self-Evaluation",
        templateStatus: "Branded and ready",
      },
    },
    transformation: {
      eyebrow: "Built for stretched teams",
      title: "Spend less time piecing support together.",
      description:
        "Olea Connects™ brings the practical pieces of nonprofit operations into one welcoming home base, so your team can move from searching and formatting to making decisions and serving your community.",
      problems: [
        {
          title: "Too much time rebuilding basics",
          text: "Board packages, policies, and governance documents should not start from a blank page.",
        },
        {
          title: "Advice scattered everywhere",
          text: "Resources, grant alerts, expert learning, and peer support live in too many disconnected places.",
        },
        {
          title: "Templates that do not feel like yours",
          text: "Generic files still require hours of formatting before they are ready for your board.",
        },
      ],
      afterEyebrow: "The after",
      afterTitle:
        "One login. Your brand. Practical support ready when you need it.",
      afterDescription:
        "Download a board-ready document, join a webinar, find a funding lead, or ask your peers without leaving the Olea environment.",
    },
    features: {
      eyebrow: "What you get",
      title: "Useful on Monday morning, not someday.",
      description:
        "Every part of Olea Connects™ is designed to reduce administrative friction and help your organization build capacity at its own pace.",
      items: [
        {
          title: "Brand once. Use everywhere.",
          text: "Upload your logo and colours once. Every eligible template renders with your organization’s identity automatically.",
          outcome: "No design skills or reformatting required.",
        },
        {
          title: "Start with board-ready tools.",
          text: "Use practical governance templates, ebooks, and how-to resources written primarily for the Canadian nonprofit context.",
          outcome: "Move confidently from blank page to usable document.",
        },
        {
          title: "Find people who understand.",
          text: "Ask questions and share experience in a private, moderated community for nonprofit leaders at every stage.",
          outcome: "Community access is included in every tier.",
        },
        {
          title: "Spot funding opportunities.",
          text: "Receive weekly grant alerts and connect with funders through focused sessions and community channels.",
          outcome: "Spend less time hunting across the web.",
        },
        {
          title: "Learn directly from experts.",
          text: "Join live and recorded sessions led by professionals in governance, legal, finance, HR, technology, and funding.",
          outcome: "Turn expert knowledge into practical next steps.",
        },
        {
          title: "Access member-only grants.",
          text: "Apply through a simple, one-page process for quarterly $500 capacity grants funded by Olea sponsors.",
          outcome: "Sponsor investment flows back to nonprofits.",
        },
      ],
    },
    trust: {
      intro:
        "An independent Canadian social enterprise built around nonprofit capacity, inclusion, and belonging.",
      signals: [
        { value: "Every tier", label: "includes the full peer community" },
        {
          value: "Portion of funds",
          label: "of sponsorship fees flow to Olea Gives",
        },
        { value: "English + French", label: "core governance resources" },
        { value: "WCAG 2.1 AA", label: "accessibility standard" },
      ],
    },
    workflow: {
      eyebrow: "How it works",
      title: "From sign-up to board-ready in three steps.",
      description:
        "Olea Connects™ is designed to feel simple from the first login, even when your organization is busy and your team is small.",
      steps: [
        {
          number: "01",
          title: "Choose your membership",
          text: "Pick the resource depth that fits your organization. Sign-up takes about five minutes and access begins immediately.",
        },
        {
          number: "02",
          title: "Set up your brand",
          text: "Add your organization name, logo, and colours once. Seedling members then choose their three priority templates.",
        },
        {
          number: "03",
          title: "Use your home base",
          text: "Open resources with your brand already applied, download board-ready PDFs, join the community, and explore learning and grants.",
        },
      ],
    },
    pricing: {
      eyebrow: "Membership",
      title: "Choose the support that fits today.",
      description:
        "The first 50 paid organizations receive 15% off Year 1 only. Annual and quarterly memberships are paid upfront.",
      foundingLabel: "Founding member offer:",
      foundingNotice:
        "The first 50 paid organizations receive 15% off Year 1 only. Prices below show regular rates and the potential Year 1 founding rate. Eligibility is confirmed before payment.",
      quarterly: "Quarterly",
      annual: "Annual",
      annualBadge: "Best for renewal planning",
      mostPopular: "Most popular",
      perYear: "year",
      perQuarter: "quarter",
      foundingYearPrefix: "Founding Year 1:",
      eligibility: "eligibility confirmed before payment",
      choosePlan: "Choose",
      optionalSupportEyebrow: "Optional support",
      optionalSupportTitle: "Add capacity when your team needs it.",
      optionalSupportDescription:
        "Add-ons are available to every tier. Canopy and Harvest members receive 10% off coaching and admin packages.",
      annualPlanningNote:
        "Annual prices are shown for planning. Contact us for hourly or package support.",
      packageSupportNote: "Available on an ad-hoc basis.",
      retreatTitle: "Board Retreat Facilitation",
      retreatDescription:
        "Professional facilitation for annual board retreats and strategic planning sessions.",
      retreatNote: "Available on an ad-hoc basis.",
      referralsEyebrow: "Circle of generosity",
      referralsTitle: "Your referrals help another nonprofit access support.",
      referralsDescription:
        "Referral credit is earned after a referred organization completes its first successful payment. Self-referrals are not eligible.",
      plans: {
        seedling: {
          name: "Seedling",
          seats: "5 seats included",
          audience: "Organizations with under $500k annual budget",
          summary:
            "Core governance operations, branded resources, and community access.",
          features: [
            "Board calendar, meetings, workflows, and packages",
            "Board HR directory, roles, and term tracking",
            "Grant checklists, templates, dashboard, and deadlines",
            "Olea Connects™ Community, webinars, and forums",
            "Branded templates and quarterly Olea Gives applications",
            "48-hour email support",
          ],
        },
        roots: {
          name: "Roots",
          seats: "10 seats included",
          audience: "Organizations with $500k-$2M annual budget",
          summary:
            "Deeper governance, recruitment, impact tracking, and learning support.",
          features: [
            "Everything in Seedling",
            "Board recruitment toolkit and skills matrix",
            "KPI and impact dashboard",
            "Quarterly Impact Accelerator Cohorts",
            "Sponsor webinars",
            "Priority email support within 48 hours",
          ],
        },
        canopy: {
          name: "Canopy",
          seats: "15 seats included",
          audience: "Organizations with $2M-$5M annual budget",
          summary:
            "Complete governance systems, executive review, and strategy tools.",
          features: [
            "Everything in Roots",
            "Board evaluation system",
            "ED/CEO 360 review",
            "Strategic planning module",
            "Board training modules",
            "Community leadership opportunities",
            "10% off coaching and admin add-ons",
            "Priority phone and email support",
          ],
        },
        harvest: {
          name: "Harvest",
          seats: "20 seats included",
          audience: "Organizations with $5M+ annual budget",
          summary:
            "Enterprise support, facilitation, thought leadership, and introductions.",
          features: [
            "Everything in Canopy",
            "Annual onboarding and board training facilitation",
            "Board retreat facilitation support",
            "Thought leader positioning",
            "Peer networking and board-level introductions",
            "Olea Connects™ summit speaking slot",
            "10% off coaching and admin add-ons",
          ],
        },
      },
      policies: [
        "$15 CAD one-time per seat",
        "Prices are shown before tax; GST/PST is calculated at checkout by province.",
        "No free trial",
        "30 days' notice before renewal; membership fees are non-refundable.",
      ],
      addOns: [
        {
          name: "Impact Coaching",
          description:
            "Hands-on support for KPI metrics, funder reporting, and impact strategy.",
          rateLabel: "$162 CAD/hour",
          packages: [
            { name: "Light", hours: "4 hours/month" },
            { name: "Medium", hours: "8 hours/month" },
            { name: "Deep", hours: "12 hours/month" },
          ],
        },
        {
          name: "Admin Support",
          description:
            "Practical help with board operations, meeting preparation, grants, and governance administration.",
          rateLabel: "$100 CAD/hour",
          packages: [
            { name: "Light", hours: "4 hours/month" },
            { name: "Medium", hours: "8 hours/month" },
            { name: "Deep", hours: "12 hours/month" },
          ],
        },
      ],
      retreat: [
        { name: "Half-day", detail: "4 hours" },
        { name: "Full day", detail: "8 hours" },
      ],
      referralRewards: [
        {
          referrals: "1 referral",
          grant: "$250 Olea Gives grant",
          coaching: "2 free coaching hours",
        },
        {
          referrals: "2 referrals",
          grant: "$500 Olea Gives grant",
          coaching: "4 free coaching hours",
        },
        {
          referrals: "3+ referrals",
          grant: "Olea Champion recognition",
          coaching: "Quarterly newsletter feature",
        },
      ],
    },
    faq: {
      eyebrow: "Frequently asked questions",
      title: "A few things you may be wondering.",
      description:
        "Straight answers about pricing, billing, seats, referrals, and support.",
      items: [
        {
          question: "Who is Olea Connects™ for?",
          answer:
            "Registered nonprofits, societies, charities, and community organizations at any size or stage are welcome. Resources are written primarily for a Canadian context, while international members can also join.",
        },
        {
          question: "How does billing work?",
          answer:
            "Memberships are billed annually or quarterly, paid upfront in Canadian dollars, and renew on your signup anniversary. Prices are shown before tax; GST/PST is calculated during checkout by province.",
        },
        {
          question: "Is there a free trial?",
          answer:
            "No. Olea Connects™ does not offer a free trial. The founding-member offer gives the first 50 organizations 15% off Year 1 instead.",
        },
        {
          question: "What is the founding-member offer?",
          answer:
            "The first 50 paid organizations receive 15% off their first year. After Year 1, the membership renews at the regular tier price.",
        },
        {
          question: "How many seats are included?",
          answer:
            "Seedling includes 5 seats, Roots includes 10, Canopy includes 15, and Harvest includes 20. Additional seats are $15 CAD one-time per seat on any tier.",
        },
        {
          question: "Can we upgrade or downgrade?",
          answer:
            "Upgrades are available anytime and charge the price difference immediately while keeping the renewal date unchanged. Downgrades happen at renewal and require 30 days' notice.",
        },
        {
          question: "Can we cancel?",
          answer:
            "Yes. Cancellation requires 30 days' notice before renewal. Membership fees are non-refundable, and cancelled organizations have a 30-day grace period to download their data.",
        },
        {
          question: "How do referrals work?",
          answer:
            "Every organization receives a referral code. Referral credit is earned only after the referred organization completes its first successful payment; self-referrals are blocked.",
        },
        {
          question: "Are coaching and admin support included?",
          answer:
            "Coaching, admin support, and board retreat facilitation are available as add-ons. Canopy and Harvest members receive 10% off coaching and admin packages.",
        },
        {
          question: "How does Olea Gives support access?",
          answer:
            "Olea Gives provides quarterly grant opportunities funded by Olea's generosity engine. There is no sliding-scale membership pricing; organizations with limited budgets can apply for an unrestricted Olea Gives gift.",
        },
        {
          question: "What happens to our data if we cancel?",
          answer:
            "Your organization owns its data. After cancellation, you have a 30-day grace period to download or export it before it is removed from live systems.",
        },
      ],
    },
    finalCta: {
      eyebrow: "You belong here",
      title: "Give your nonprofit a stronger place to grow.",
      description:
        "Start with the plan that fits now. Your tools, brand profile, history, and community connections can grow with you.",
      cta: "Join Olea Connects™",
      pricingNote: "Memberships start at $800 CAD/year or $200 CAD/quarter.",
    },
    footer: {
      description:
        "A membership platform by Olive Social Impact Inc., an independent Canadian social enterprise.",
      copyright: "© 2026 Olive Social Impact Inc.",
      prices: "All prices in CAD.",
    },
  },
  "fr-CA": {
    localeSelector: {
      ariaLabel: "Choisir la langue",
      english: "English",
      french: "Français",
    },
    logo: {
      ariaLabel: "Plateforme de gouvernance Olea Connects",
      tagline: "La gouvernance, à votre image.",
    },
    nav: {
      alreadyMember: "Déjà membre?",
      login: "Connexion",
      memberLogin: "Connexion membre",
      whatYouGet: "Ce que vous obtenez",
      howItWorks: "Fonctionnement",
      pricing: "Tarifs",
      faq: "FAQ",
      sponsorship: "Commandites",
      referrals: "Références",
      getStarted: "Commencer",
    },
    hero: {
      badge: "Conçu pour les organismes sans but lucratif",
      title:
        "Les outils, la communauté et les liens de financement dont votre organisme a besoin pour grandir.",
      description:
        "Créez des documents prêts pour le conseil dans votre propre marque, apprenez auprès d'experts du secteur, trouvez des occasions de subvention et échangez avec des leaders qui comprennent votre réalité.",
      primaryCta: "Rejoindre Olea Connects™",
      secondaryCta: "Voir le fonctionnement",
      assurances: [
        "Inscription en environ 5 minutes",
        "Forfaits à partir de 800 $ CA/an",
        "Facturation trimestrielle offerte",
      ],
      quote:
        "Peu importe l'étape où se trouve votre organisme, il y a une place pour vous ici.",
      quoteLabel: "La promesse Olea Connects™",
      preview: {
        nav: [
          "Tableau de bord",
          "Modèles",
          "Webinaires",
          "Olea Gives",
          "Communauté",
        ],
        organization: "Centre jeunesse JP",
        greeting: "Bonjour, Sarah",
        title: "Votre espace central pour l'organisme",
        governanceTemplates: "Modèles de gouvernance",
        learningResources: "Ressources d'apprentissage",
        fundTitle: "Fonds Olea Gives",
        fundSubtitle: "Demandes de subvention trimestrielles",
        fundDescription:
          "Des demandes simples d'une page pour des subventions de capacité de 500 $ CA.",
        brandProfile: "Profil de marque",
        appliedToDownloads: "Appliqué à chaque téléchargement",
        templateTitle: "Autoévaluation du conseil",
        templateStatus: "Personnalisé et prêt",
      },
    },
    transformation: {
      eyebrow: "Conçu pour les équipes surchargées",
      title: "Passez moins de temps à assembler du soutien éparpillé.",
      description:
        "Olea Connects™ rassemble les éléments pratiques des opérations sans but lucratif dans un espace accueillant, afin que votre équipe passe de la recherche et de la mise en page à la prise de décision et au service de votre communauté.",
      problems: [
        {
          title: "Trop de temps à recréer les bases",
          text: "Les dossiers du conseil, les politiques et les documents de gouvernance ne devraient pas partir d'une page blanche.",
        },
        {
          title: "Des conseils dispersés partout",
          text: "Les ressources, les alertes de subvention, l'apprentissage avec des experts et le soutien entre pairs vivent dans trop d'endroits déconnectés.",
        },
        {
          title: "Des modèles qui ne vous ressemblent pas",
          text: "Les fichiers génériques demandent encore des heures de mise en forme avant d'être prêts pour votre conseil.",
        },
      ],
      afterEyebrow: "Le résultat",
      afterTitle:
        "Un seul accès. Votre marque. Un soutien pratique prêt au bon moment.",
      afterDescription:
        "Téléchargez un document prêt pour le conseil, participez à un webinaire, trouvez une piste de financement ou posez vos questions à vos pairs sans quitter l'environnement Olea.",
    },
    features: {
      eyebrow: "Ce que vous obtenez",
      title: "Utile le lundi matin, pas un jour peut-être.",
      description:
        "Chaque élément d'Olea Connects™ est conçu pour réduire la charge administrative et aider votre organisme à renforcer sa capacité à son propre rythme.",
      items: [
        {
          title: "Créez votre marque une fois. Utilisez-la partout.",
          text: "Téléversez votre logo et vos couleurs une seule fois. Chaque modèle admissible s'affiche automatiquement avec l'identité de votre organisme.",
          outcome: "Aucune compétence en design ni remise en page requise.",
        },
        {
          title: "Commencez avec des outils prêts pour le conseil.",
          text: "Utilisez des modèles de gouvernance, des guides et des ressources pratiques écrits principalement pour le contexte canadien sans but lucratif.",
          outcome:
            "Passez avec confiance de la page blanche au document utile.",
        },
        {
          title: "Trouvez des personnes qui comprennent.",
          text: "Posez des questions et partagez vos expériences dans une communauté privée et modérée pour les leaders d'organismes sans but lucratif.",
          outcome: "L'accès à la communauté est inclus dans chaque forfait.",
        },
        {
          title: "Repérez les occasions de financement.",
          text: "Recevez des alertes hebdomadaires de subventions et créez des liens avec des bailleurs de fonds grâce à des séances ciblées et à la communauté.",
          outcome: "Passez moins de temps à chercher partout sur le Web.",
        },
        {
          title: "Apprenez directement des experts.",
          text: "Participez à des séances en direct ou enregistrées avec des professionnels en gouvernance, droit, finances, RH, technologie et financement.",
          outcome: "Transformez l'expertise en prochaines étapes concrètes.",
        },
        {
          title: "Accédez à des subventions réservées aux membres.",
          text: "Soumettez une demande simple d'une page pour des subventions trimestrielles de capacité de 500 $ financées par les commanditaires d'Olea.",
          outcome:
            "L'investissement des commanditaires retourne aux organismes.",
        },
      ],
    },
    trust: {
      intro:
        "Une entreprise sociale canadienne indépendante axée sur la capacité, l'inclusion et le sentiment d'appartenance des organismes sans but lucratif.",
      signals: [
        {
          value: "Chaque forfait",
          label: "inclut toute la communauté de pairs",
        },
        {
          value: "Une part des fonds",
          label: "des commandites soutient Olea Gives",
        },
        {
          value: "Anglais + français",
          label: "ressources de gouvernance essentielles",
        },
        { value: "WCAG 2.1 AA", label: "norme d'accessibilité" },
      ],
    },
    workflow: {
      eyebrow: "Fonctionnement",
      title:
        "De l'inscription aux documents prêts pour le conseil en trois étapes.",
      description:
        "Olea Connects™ est conçu pour être simple dès la première connexion, même lorsque votre organisme est occupé et que votre équipe est petite.",
      steps: [
        {
          number: "01",
          title: "Choisissez votre forfait",
          text: "Sélectionnez le niveau de ressources qui convient à votre organisme. L'inscription prend environ cinq minutes et l'accès commence immédiatement.",
        },
        {
          number: "02",
          title: "Configurez votre marque",
          text: "Ajoutez le nom de votre organisme, votre logo et vos couleurs une seule fois. Les membres Seedling choisissent ensuite leurs trois modèles prioritaires.",
        },
        {
          number: "03",
          title: "Utilisez votre espace central",
          text: "Ouvrez des ressources déjà adaptées à votre marque, téléchargez des PDF prêts pour le conseil, rejoignez la communauté et explorez les formations et les subventions.",
        },
      ],
    },
    pricing: {
      eyebrow: "Adhésion",
      title: "Choisissez le soutien qui convient aujourd'hui.",
      description:
        "Les 50 premiers organismes payants reçoivent 15 % de rabais sur la première année seulement. Les adhésions annuelles et trimestrielles sont payées à l'avance.",
      foundingLabel: "Offre membre fondateur :",
      foundingNotice:
        "Les 50 premiers organismes payants reçoivent 15 % de rabais sur la première année seulement. Les tarifs ci-dessous indiquent les prix réguliers et le tarif potentiel de la première année. L'admissibilité est confirmée avant le paiement.",
      quarterly: "Trimestriel",
      annual: "Annuel",
      annualBadge: "Idéal pour planifier le renouvellement",
      mostPopular: "Le plus populaire",
      perYear: "an",
      perQuarter: "trimestre",
      foundingYearPrefix: "Année 1 fondatrice :",
      eligibility: "admissibilité confirmée avant le paiement",
      choosePlan: "Choisir",
      optionalSupportEyebrow: "Soutien optionnel",
      optionalSupportTitle:
        "Ajoutez de la capacité quand votre équipe en a besoin.",
      optionalSupportDescription:
        "Les options complémentaires sont offertes avec chaque forfait. Les membres Canopy et Harvest reçoivent 10 % de rabais sur les forfaits de coaching et de soutien administratif.",
      annualPlanningNote:
        "Les prix annuels sont indiqués pour la planification. Contactez-nous pour du soutien à l'heure ou en forfait.",
      packageSupportNote: "Offert au besoin.",
      retreatTitle: "Animation de retraite du conseil",
      retreatDescription:
        "Animation professionnelle pour les retraites annuelles du conseil et les séances de planification stratégique.",
      retreatNote: "Offert au besoin.",
      referralsEyebrow: "Cercle de générosité",
      referralsTitle:
        "Vos références aident un autre organisme à accéder au soutien.",
      referralsDescription:
        "Le crédit de référence est gagné lorsqu'un organisme référé effectue son premier paiement réussi. Les auto-références ne sont pas admissibles.",
      plans: {
        seedling: {
          name: "Seedling",
          seats: "5 sièges inclus",
          audience: "Organismes avec un budget annuel de moins de 500 k$",
          summary:
            "Opérations de gouvernance de base, ressources personnalisées et accès à la communauté.",
          features: [
            "Calendrier du conseil, réunions, flux de travail et dossiers",
            "Répertoire RH du conseil, rôles et suivi des mandats",
            "Listes de vérification, modèles, tableau de bord et échéances de subventions",
            "Communauté Olea Connects™, webinaires et forums",
            "Modèles personnalisés et demandes trimestrielles Olea Gives",
            "Soutien par courriel sous 48 heures",
          ],
        },
        roots: {
          name: "Roots",
          seats: "10 sièges inclus",
          audience: "Organismes avec un budget annuel de 500 k$ à 2 M$",
          summary:
            "Gouvernance approfondie, recrutement, suivi d'impact et soutien à l'apprentissage.",
          features: [
            "Tout ce qui est inclus dans Seedling",
            "Boîte à outils de recrutement du conseil et matrice des compétences",
            "Tableau de bord KPI et impact",
            "Cohortes trimestrielles Impact Accelerator",
            "Webinaires commanditaires",
            "Soutien prioritaire par courriel sous 48 heures",
          ],
        },
        canopy: {
          name: "Canopy",
          seats: "15 sièges inclus",
          audience: "Organismes avec un budget annuel de 2 M$ à 5 M$",
          summary:
            "Systèmes complets de gouvernance, évaluation de la direction et outils de stratégie.",
          features: [
            "Tout ce qui est inclus dans Roots",
            "Système d'évaluation du conseil",
            "Évaluation 360 ED/CEO",
            "Module de planification stratégique",
            "Modules de formation du conseil",
            "Occasions de leadership communautaire",
            "10 % de rabais sur le coaching et le soutien administratif",
            "Soutien prioritaire par téléphone et courriel",
          ],
        },
        harvest: {
          name: "Harvest",
          seats: "20 sièges inclus",
          audience: "Organismes avec un budget annuel de plus de 5 M$",
          summary:
            "Soutien organisationnel, animation, leadership d'opinion et mises en relation.",
          features: [
            "Tout ce qui est inclus dans Canopy",
            "Intégration annuelle et animation de formation du conseil",
            "Soutien à l'animation de retraite du conseil",
            "Positionnement comme leader d'opinion",
            "Réseautage entre pairs et introductions au niveau du conseil",
            "Créneau de prise de parole au sommet Olea Connects™",
            "10 % de rabais sur le coaching et le soutien administratif",
          ],
        },
      },
      policies: [
        "15 $ CA par siège supplémentaire, paiement unique",
        "Les prix sont indiqués avant taxes; la TPS/TVP est calculée à la caisse selon la province.",
        "Aucun essai gratuit",
        "Préavis de 30 jours avant le renouvellement; les frais d'adhésion ne sont pas remboursables.",
      ],
      addOns: [
        {
          name: "Coaching d'impact",
          description:
            "Soutien pratique pour les indicateurs KPI, les rapports aux bailleurs de fonds et la stratégie d'impact.",
          rateLabel: "162 $ CA/heure",
          packages: [
            { name: "Léger", hours: "4 heures/mois" },
            { name: "Moyen", hours: "8 heures/mois" },
            { name: "Approfondi", hours: "12 heures/mois" },
          ],
        },
        {
          name: "Soutien administratif",
          description:
            "Aide pratique pour les opérations du conseil, la préparation des réunions, les subventions et l'administration de la gouvernance.",
          rateLabel: "100 $ CA/heure",
          packages: [
            { name: "Léger", hours: "4 heures/mois" },
            { name: "Moyen", hours: "8 heures/mois" },
            { name: "Approfondi", hours: "12 heures/mois" },
          ],
        },
      ],
      retreat: [
        { name: "Demi-journée", detail: "4 heures" },
        { name: "Journée complète", detail: "8 heures" },
      ],
      referralRewards: [
        {
          referrals: "1 référence",
          grant: "Subvention Olea Gives de 250 $ CA",
          coaching: "2 heures gratuites de coaching",
        },
        {
          referrals: "2 références",
          grant: "Subvention Olea Gives de 500 $ CA",
          coaching: "4 heures gratuites de coaching",
        },
        {
          referrals: "3 références ou plus",
          grant: "Reconnaissance Olea Champion",
          coaching: "Mention dans l'infolettre trimestrielle",
        },
      ],
    },
    faq: {
      eyebrow: "Questions fréquentes",
      title: "Quelques réponses utiles.",
      description:
        "Des réponses directes sur les tarifs, la facturation, les sièges, les références et le soutien.",
      items: [
        {
          question: "À qui s'adresse Olea Connects™?",
          answer:
            "Les organismes sans but lucratif enregistrés, sociétés, organismes de bienfaisance et organismes communautaires de toute taille ou étape sont les bienvenus. Les ressources sont écrites principalement pour le contexte canadien, et les membres internationaux peuvent aussi se joindre.",
        },
        {
          question: "Comment fonctionne la facturation?",
          answer:
            "Les adhésions sont facturées annuellement ou trimestriellement, payées à l'avance en dollars canadiens, et se renouvellent à la date anniversaire de l'inscription. Les prix sont affichés avant taxes; la TPS/TVP est calculée à la caisse selon la province.",
        },
        {
          question: "Y a-t-il un essai gratuit?",
          answer:
            "Non. Olea Connects™ n'offre pas d'essai gratuit. L'offre membre fondateur donne plutôt 15 % de rabais sur la première année aux 50 premiers organismes.",
        },
        {
          question: "Qu'est-ce que l'offre membre fondateur?",
          answer:
            "Les 50 premiers organismes payants reçoivent 15 % de rabais sur leur première année. Après l'année 1, l'adhésion se renouvelle au prix régulier du forfait.",
        },
        {
          question: "Combien de sièges sont inclus?",
          answer:
            "Seedling inclut 5 sièges, Roots en inclut 10, Canopy en inclut 15 et Harvest en inclut 20. Les sièges supplémentaires coûtent 15 $ CA par siège, en paiement unique, pour tous les forfaits.",
        },
        {
          question: "Pouvons-nous changer de forfait?",
          answer:
            "Les mises à niveau sont offertes en tout temps et facturent immédiatement la différence de prix, sans changer la date de renouvellement. Les rétrogradations prennent effet au renouvellement et exigent un préavis de 30 jours.",
        },
        {
          question: "Pouvons-nous annuler?",
          answer:
            "Oui. L'annulation exige un préavis de 30 jours avant le renouvellement. Les frais d'adhésion ne sont pas remboursables, et les organismes annulés disposent d'une période de grâce de 30 jours pour télécharger leurs données.",
        },
        {
          question: "Comment fonctionnent les références?",
          answer:
            "Chaque organisme reçoit un code de référence. Le crédit est gagné seulement après que l'organisme référé effectue son premier paiement réussi; les auto-références sont bloquées.",
        },
        {
          question: "Le coaching et le soutien administratif sont-ils inclus?",
          answer:
            "Le coaching, le soutien administratif et l'animation de retraite du conseil sont offerts comme options complémentaires. Les membres Canopy et Harvest reçoivent 10 % de rabais sur les forfaits de coaching et de soutien administratif.",
        },
        {
          question: "Comment Olea Gives améliore-t-il l'accès?",
          answer:
            "Olea Gives offre des possibilités de subventions trimestrielles financées par le moteur de générosité d'Olea. Il n'y a pas de tarification à échelle mobile; les organismes avec un budget limité peuvent demander un don non restreint Olea Gives.",
        },
        {
          question: "Qu'arrive-t-il à nos données si nous annulons?",
          answer:
            "Votre organisme reste propriétaire de ses données. Après l'annulation, vous disposez d'une période de grâce de 30 jours pour les télécharger ou les exporter avant leur retrait des systèmes actifs.",
        },
      ],
    },
    finalCta: {
      eyebrow: "Votre place est ici",
      title: "Offrez à votre organisme un espace plus solide pour grandir.",
      description:
        "Commencez avec le forfait qui convient maintenant. Vos outils, votre profil de marque, votre historique et vos liens communautaires peuvent grandir avec vous.",
      cta: "Rejoindre Olea Connects™",
      pricingNote:
        "Les adhésions commencent à 800 $ CA/an ou 200 $ CA/trimestre.",
    },
    footer: {
      description:
        "Une plateforme d'adhésion par Olive Social Impact Inc., une entreprise sociale canadienne indépendante.",
      copyright: "© 2026 Olive Social Impact Inc.",
      prices: "Tous les prix sont en dollars canadiens.",
    },
  },
};

export function getPublicSiteCopy(locale: Locale) {
  return publicSiteCopy[locale];
}
