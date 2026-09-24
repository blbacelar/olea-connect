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
  foundingBanner: {
    message: string;
    codeLabel: string;
    signup: string;
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
    choosePlan: string;
    optionalSupportEyebrow: string;
    optionalSupportTitle: string;
    optionalSupportDescription: string;
    retreatTitle: string;
    retreatDescription: string;
    requestQuote: string;
    referralsEyebrow: string;
    referralsTitle: string;
    referralsDescription: string;
    referralsCta: string;
    plans: Record<MembershipTier, LocalizedPlanCopy>;
    policies: string[];
    addOns: Array<{
      name: string;
      description: string;
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
      ariaLabel: "Olea Connects™ governance platform",
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
    foundingBanner: {
      message: "15% off Year 1 for the first 50 paid organizations, while spots last.",
      codeLabel: "Use code",
      signup: "Join now",
    },
    hero: {
      badge: "Built for nonprofit organizations",
      title:
        "The tools, community, and funding connections your nonprofit needs to grow.",
      description:
        "Create board-ready documents in your own brand, learn from sector experts, manage funding opportunities, and connect with nonprofit leaders who understand the work.",
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
        nav: ["Dashboard", "Board Calendar", "Webinars", "Community"],
        organization: "Your organization",
        greeting: "Good morning",
        title: "Your nonprofit home base",
        governanceTemplates: "Governance templates",
        learningResources: "Learning resources",
        fundTitle: "Olea's Circle of Generosity",
        fundSubtitle: "15% of profits",
        fundDescription:
          "Unrestricted donations flow back to nonprofits.",
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
          text: "Resources, funding leads, expert learning, and peer support live in too many disconnected places.",
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
          title: "Grow through Olea's Circle of Generosity.",
          text: "Olive Social Impact donates 15% of its profits to nonprofits as unrestricted donations. There is no grant application or guaranteed payment for members.",
          outcome: "15% of profits flow back to nonprofits.",
        },
      ],
    },
    trust: {
      intro:
        "An independent Canadian social enterprise built around nonprofit capacity, inclusion, and belonging.",
      signals: [
        { value: "Every tier", label: "includes the full peer community" },
        {
          value: "15% of profits",
          label: "flow back to nonprofits as unrestricted donations",
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
          text: "Open resources with your brand already applied, download board-ready PDFs, join the community, and explore learning and funding tools.",
        },
      ],
    },
    pricing: {
      eyebrow: "Membership",
      title: "Choose the support that fits today.",
      description:
        "Founding members with a valid code receive 15% off Year 1, limited to the first 50 paid organizations. Annual and quarterly memberships are paid upfront.",
      foundingLabel: "Founding member offer:",
      foundingNotice:
        "Enter your founding-member code during signup to receive 15% off Year 1 while the first 50 spots remain available. Prices below show regular rates; your discount is confirmed before payment.",
      quarterly: "Quarterly",
      annual: "Annual",
      annualBadge: "Best for renewal planning",
      mostPopular: "Most popular",
      perYear: "year",
      perQuarter: "quarter",
      choosePlan: "Choose",
      optionalSupportEyebrow: "Optional support",
      optionalSupportTitle: "Add capacity when your team needs it.",
      optionalSupportDescription:
        "Custom support is available to every tier. Canopy and Harvest members receive 10% off coaching and admin support quotes.",
      retreatTitle: "Board Retreat Facilitation",
      retreatDescription:
        "Professional facilitation for annual board retreats and strategic planning sessions.",
      requestQuote: "Contact us for a quote",
      referralsEyebrow: "Circle of generosity",
      referralsTitle: "Your referrals help another nonprofit access support.",
      referralsDescription:
        "Approved referrers can earn 10% of a referred organization's first successful quarterly or annual membership payment, up to $500. Renewals and self-referrals are not eligible.",
      referralsCta: "Explore the referral program",
      plans: {
        seedling: {
          name: "Seedling",
          seats: "5 seats included",
          audience: "Organizations with under $500k annual budget",
          summary:
            "Core governance operations, branded resources, and community access.",
          features: [
            "Board calendar, meetings, workflows, and packages",
            "Grant checklists, templates, dashboard, and deadlines",
            "Olea Connects™ Community, webinars, and forums",
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
            "One-to-one support for KPI metrics, funder reporting, and impact strategy. Tell us what you need for a tailored quote.",
        },
        {
          name: "Admin Support",
          description:
            "Practical help with board operations, meeting preparation, and governance administration. We quote based on your team's needs.",
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
            "No. Olea Connects™ does not offer a free trial. Founding members with a valid code can receive 15% off Year 1 while the first 50 spots remain available.",
        },
        {
          question: "What is the founding-member offer?",
          answer:
            "Enter the founding-member code supplied by Olea during signup. The first 50 paid organizations with a valid code receive 15% off their first year. After Year 1, the membership renews at the regular tier price.",
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
            "Approved referrers receive a unique link. Eligible referrals can earn 10% of the referred organization's first successful quarterly or annual membership payment, up to $500. Renewals, self-referrals, and duplicate credits are not eligible.",
        },
        {
          question: "Are coaching and admin support included?",
          answer:
            "Coaching, admin support, and board retreat facilitation are available by custom quote. Canopy and Harvest members receive 10% off coaching and admin support quotes.",
        },
        {
          question: "What is Olea's Circle of Generosity?",
          answer:
            "Olive Social Impact donates 15% of its profits to nonprofits as unrestricted donations. This is not a grant program: there is no application, and membership does not guarantee a donation.",
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
      ariaLabel: "Plateforme de gouvernance Olea Connects™",
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
    foundingBanner: {
      message: "15 % de rabais la première année pour les 50 premiers organismes payants, jusqu'à épuisement des places.",
      codeLabel: "Code",
      signup: "S'inscrire",
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
          "Calendrier du conseil",
          "Webinaires",
          "Communauté",
        ],
        organization: "Votre organisme",
        greeting: "Bonjour",
        title: "Votre espace central pour l'organisme",
        governanceTemplates: "Modèles de gouvernance",
        learningResources: "Ressources d'apprentissage",
        fundTitle: "Le Cercle de générosité d'Olea",
        fundSubtitle: "15 % des bénéfices",
        fundDescription:
          "Des dons sans restriction sont remis à des organismes sans but lucratif.",
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
          text: "Les ressources, les pistes de financement, l'apprentissage avec des experts et le soutien entre pairs vivent dans trop d'endroits déconnectés.",
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
          title: "Grandissez avec le Cercle de générosité d'Olea.",
          text: "Olive Social Impact remet 15 % de ses bénéfices à des organismes sans but lucratif sous forme de dons sans restriction. Il n'y a ni demande de subvention ni paiement garanti aux membres.",
          outcome: "15 % des bénéfices sont remis aux organismes sans but lucratif.",
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
          value: "15 % des bénéfices",
          label: "sont remis aux organismes sous forme de dons sans restriction",
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
          text: "Ouvrez des ressources déjà adaptées à votre marque, téléchargez des PDF prêts pour le conseil, rejoignez la communauté et explorez les formations et outils de financement.",
        },
      ],
    },
    pricing: {
      eyebrow: "Adhésion",
      title: "Choisissez le soutien qui convient aujourd'hui.",
      description:
        "Les membres fondateurs qui possèdent un code valide reçoivent 15 % de rabais sur la première année, jusqu'à concurrence des 50 premiers organismes payants. Les adhésions annuelles et trimestrielles sont payées à l'avance.",
      foundingLabel: "Offre membre fondateur :",
      foundingNotice:
        "Entrez votre code de membre fondateur pendant l'inscription pour recevoir 15 % de rabais sur la première année, tant que l'une des 50 places est disponible. Les tarifs ci-dessous sont les prix réguliers; votre rabais est confirmé avant le paiement.",
      quarterly: "Trimestriel",
      annual: "Annuel",
      annualBadge: "Idéal pour planifier le renouvellement",
      mostPopular: "Le plus populaire",
      perYear: "an",
      perQuarter: "trimestre",
      choosePlan: "Choisir",
      optionalSupportEyebrow: "Soutien optionnel",
      optionalSupportTitle:
        "Ajoutez de la capacité quand votre équipe en a besoin.",
      optionalSupportDescription:
        "Le soutien personnalisé est offert avec chaque forfait. Les membres Canopy et Harvest reçoivent 10 % de rabais sur les devis de coaching et de soutien administratif.",
      retreatTitle: "Animation de retraite du conseil",
      retreatDescription:
        "Animation professionnelle pour les retraites annuelles du conseil et les séances de planification stratégique.",
      requestQuote: "Contactez-nous pour obtenir un devis",
      referralsEyebrow: "Cercle de générosité",
      referralsTitle:
        "Vos références aident un autre organisme à accéder au soutien.",
      referralsDescription:
        "Les personnes approuvées peuvent recevoir 10 % du premier paiement d'adhésion trimestriel ou annuel réussi d'un organisme référé, jusqu'à 500 $. Les renouvellements et les auto-références sont exclus.",
      referralsCta: "Découvrir le programme de référencement",
      plans: {
        seedling: {
          name: "Seedling",
          seats: "5 sièges inclus",
          audience: "Organismes avec un budget annuel de moins de 500 k$",
          summary:
            "Opérations de gouvernance de base, ressources personnalisées et accès à la communauté.",
          features: [
            "Calendrier du conseil, réunions, flux de travail et dossiers",
            "Listes de vérification, modèles, tableau de bord et échéances de subventions",
            "Communauté Olea Connects™, webinaires et forums",
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
            "Soutien individuel pour les indicateurs KPI, les rapports aux bailleurs de fonds et la stratégie d'impact. Décrivez-nous vos besoins pour obtenir un devis adapté.",
        },
        {
          name: "Soutien administratif",
          description:
            "Aide pratique pour les opérations du conseil, la préparation des réunions et la gouvernance. Le devis dépend des besoins de votre équipe.",
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
            "Non. Olea Connects™ n'offre pas d'essai gratuit. Les membres fondateurs qui possèdent un code valide peuvent recevoir 15 % de rabais sur la première année, tant que l'une des 50 places est disponible.",
        },
        {
          question: "Qu'est-ce que l'offre membre fondateur?",
          answer:
            "Entrez pendant l'inscription le code de membre fondateur fourni par Olea. Les 50 premiers organismes payants qui possèdent un code valide reçoivent 15 % de rabais sur leur première année. Après l'année 1, l'adhésion se renouvelle au prix régulier du forfait.",
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
            "Les personnes approuvées reçoivent un lien unique. Une référence admissible peut rapporter 10 % du premier paiement d'adhésion trimestriel ou annuel réussi de l'organisme référé, jusqu'à 500 $. Les renouvellements, les auto-références et les crédits en double sont exclus.",
        },
        {
          question: "Le coaching et le soutien administratif sont-ils inclus?",
          answer:
            "Le coaching, le soutien administratif et l'animation de retraite du conseil sont offerts sur devis personnalisé. Les membres Canopy et Harvest reçoivent 10 % de rabais sur les devis de coaching et de soutien administratif.",
        },
        {
          question: "Qu'est-ce que le Cercle de générosité d'Olea?",
          answer:
            "Olive Social Impact remet 15 % de ses bénéfices à des organismes sans but lucratif sous forme de dons sans restriction. Ce n'est pas un programme de subventions : il n'y a aucune demande à soumettre et l'adhésion ne garantit pas de don.",
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
