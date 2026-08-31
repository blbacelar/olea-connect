import type { SponsorshipTierIcon } from "@/lib/sponsorship-content";

import type { Locale } from "./locales";

export type LocalizedSponsorshipTier = {
  name: string;
  icon: SponsorshipTierIcon;
  subtitle: string;
  description: string;
  features: string[];
  featured?: boolean;
  availability?: string;
};

export type SponsorshipPageCopy = {
  heroEyebrow: string;
  heroTitle: string;
  heroBody: string;
  quote: string;
  tiersEyebrow: string;
  tiersTitle: string;
  benefitsTitle: string;
  impactEyebrow: string;
  impactTitle: string;
  impactBody: string;
  ctaTitle: string;
  ctaBody: string;
  exploreTier: string;
  exploreTierAria: string;
  scheduleConversation: string;
  scheduleConversationAria: string;
  calendlyFallback: string;
  questionsPrefix: string;
  premiumTier: string;
  contactForPricing: string;
  featuredCta: string;
  defaultCta: string;
  tierAria: (tierName: string) => string;
  tiers: LocalizedSponsorshipTier[];
  benefits: {
    title: string;
    description: string;
  }[];
  impactFeatures: {
    title: string;
    description: string;
  }[];
};

export const sponsorshipPageCopy: Record<Locale, SponsorshipPageCopy> = {
  "en-CA": {
    heroEyebrow: "Olea Connects™ sponsorships",
    heroTitle: "Partner with Us to Strengthen Nonprofit Resilience",
    heroBody:
      "Join a community of business leaders and nonprofits, working together through collaboration to build capacity and make impact.",
    quote:
      "An olive tree doesn't achieve impact by standing alone. It creates an entire ecosystem, nourishing soil, providing shelter, building community. Your sponsorship works the same way. You're not just supporting nonprofits. You're cultivating an ecosystem of resilience.",
    tiersEyebrow: "Choose your role",
    tiersTitle: "Five ways to help resilience take root",
    benefitsTitle: "What Every Sponsor Receives",
    impactEyebrow: "Catalyst exclusive",
    impactTitle: "The Catalyst Difference: Impact Circle",
    impactBody:
      "At the Catalyst tier, you're not just a sponsor. You're an impact investor. Quarterly, nonprofits pitch you on real problems they're solving. You listen. You decide. You invest in what moves you.",
    ctaTitle: "Ready to Step In?",
    ctaBody: "Each tier has its own story. Your story starts here.",
    exploreTier: "Explore Your Tier",
    exploreTierAria: "Explore sponsorship tiers",
    scheduleConversation: "Schedule a Conversation",
    scheduleConversationAria: "Schedule a sponsorship conversation",
    calendlyFallback:
      "Calendly booking is being configured. Email us and our team will help you choose the right sponsorship tier.",
    questionsPrefix: "Questions? Email us at",
    premiumTier: "Premium Tier",
    contactForPricing: "Contact us for pricing",
    featuredCta: "Become a Catalyst",
    defaultCta: "Learn More",
    tierAria: (tierName) => `Learn more about the ${tierName} sponsorship tier`,
    tiers: [
      {
        name: "Seed Keeper",
        icon: "seedling",
        subtitle: "Beginning your investment",
        description:
          "You're planting. Testing the soil. Exploring what it means to invest in nonprofit resilience.",
        features: [
          "Part of the Olea Connects™ community for collaboration and networking",
          "Logo on our platform",
          "Quarterly newsletter mention",
          "Quarterly impact stories",
          "Member directory access",
          "Community recognition",
          "Multi-year opportunity",
        ],
      },
      {
        name: "Root Keeper",
        icon: "roots",
        subtitle: "Establishing foundation",
        description:
          "You're deepening your commitment and building relationships within the nonprofit sector.",
        features: [
          "Part of the Olea Connects™ community for collaboration and networking",
          "Logo on our platform",
          "Quarterly newsletter mention",
          "Quarterly impact stories",
          "Member directory access",
          "Community recognition",
          "Featured website visibility",
          "Quarterly webinar invitation",
          "Direct introductions to nonprofit leaders you can serve",
          "Conference speaking opportunity",
          "Multi-year opportunity",
        ],
      },
      {
        name: "Resilience Builder",
        icon: "builder",
        subtitle: "Creating stable systems",
        description:
          "You're leading. Creating stability that becomes foundation for others. Your thought leadership shapes the sector.",
        features: [
          "Part of the Olea Connects™ community for collaboration and networking",
          "Logo on our platform",
          "Quarterly newsletter mention",
          "Quarterly impact stories",
          "Member directory access",
          "Community recognition",
          "Featured website visibility",
          "Quarterly webinar invitation",
          "Direct introductions to nonprofit leaders you can serve",
          "Conference speaking opportunity",
          "Featured quarterly newsletter placement",
          "Lead quarterly webinar",
          "VIP networking position",
          "Host a quarterly capacity-building workshop for nonprofits, focused on impact: marketing, finance, or grant writing, your choice",
          "Multi-year opportunity",
        ],
      },
      {
        name: "Legacy Guardian",
        icon: "legacy",
        subtitle: "Teaching wisdom",
        description:
          "You're stewarding. The sector trusts your judgment. Your legacy shapes the next generation.",
        features: [
          "Part of the Olea Connects™ community for collaboration and networking",
          "Logo on our platform",
          "Quarterly newsletter mention",
          "Quarterly impact stories",
          "Member directory access",
          "Community recognition",
          "Featured website visibility",
          "Quarterly webinar invitation",
          "Direct introductions to nonprofit leaders you can serve",
          "Conference speaking opportunity",
          "Featured quarterly newsletter placement",
          "Lead quarterly webinar",
          "VIP networking position",
          "Multi-year opportunity",
          "Premium website profile",
          "Speaking opportunities",
          "Legacy Guardian Roundtable",
          "Priority consideration to become a Catalyst sponsor",
        ],
      },
      {
        name: "Catalyst",
        icon: "catalyst",
        subtitle: "Igniting transformation",
        description:
          "You're the rare leader who doesn't just build. You catalyze change that lasts generations.",
        features: [
          "Part of the Olea Connects™ community for collaboration and networking",
          "Logo on our platform",
          "Quarterly newsletter mention",
          "Quarterly impact stories",
          "Member directory access",
          "Community recognition",
          "Featured website visibility",
          "Quarterly webinar invitation",
          "Direct introductions to nonprofit leaders you can serve",
          "Conference speaking opportunity",
          "Featured quarterly newsletter placement",
          "Lead quarterly webinar",
          "VIP networking position",
          "Board-level conversations",
          "Premium website profile",
          "Speaking opportunities",
          "Impact Circle quarterly",
          "Direct impact on nonprofits",
          "Renewed annually, by invitation. Priority given to Legacy Guardian sponsors ready to step up",
        ],
        featured: true,
        availability: "Only 5 spots available · 1-year terms",
      },
    ],
    benefits: [
      {
        title: "Circle of Generosity",
        description:
          "Quarterly celebrations of collective impact. See the nonprofits you're helping and the community you're building together.",
      },
      {
        title: "Annual Conference",
        description:
          "Year-end gathering with fellow sponsors and nonprofit leaders. Witness the movement you're part of.",
      },
      {
        title: "Public Recognition",
        description:
          "Named as a leader in nonprofit resilience. Featured in newsletter, website, and community materials.",
      },
      {
        title: "Business Connections",
        description:
          "Direct access to nonprofit leaders who need what you offer. Turn relationships into real business.",
      },
      {
        title: "Thought Leadership",
        description:
          "Positioned as an expert in nonprofit resilience. Speaking opportunities and content collaboration available.",
      },
      {
        title: "Community Impact",
        description:
          "Your sponsorship directly funds nonprofit support and strengthens the entire sector.",
      },
      {
        title: "Sponsor Mastermind",
        description:
          "A peer mastermind led by sponsors themselves. Open to any sponsor who wants to join.",
      },
      {
        title: "Multi-Year Momentum",
        description:
          "Recognition grows each year you stay: logo placement in Year 1, a featured case study in Year 2, a spotlight moment in Year 3.",
      },
    ],
    impactFeatures: [
      {
        title: "Quarterly Gatherings",
        description:
          "3 nonprofits pitch their needs. You decide independently what to offer.",
      },
      {
        title: "Real Capital",
        description:
          "Pro-bono expertise, tax-deductible donations with full impact reporting, mentoring, connections. You choose.",
      },
      {
        title: "Strategic Voice",
        description:
          "Quarterly calls with Olive Social Impact's leadership. Your feedback shapes program evolution.",
      },
      {
        title: "Generational Impact",
        description:
          "Build relationships with community builders. Catalyze transformation that lasts.",
      },
    ],
  },
  "fr-CA": {
    heroEyebrow: "Commandites Olea Connects™",
    heroTitle:
      "Devenez partenaire pour renforcer la résilience des organismes sans but lucratif",
    heroBody:
      "Joignez-vous à une communauté de leaders d'affaires et d'organismes sans but lucratif qui collaborent pour bâtir la capacité et créer de l'impact.",
    quote:
      "Un olivier ne crée pas d'impact en restant seul. Il crée tout un écosystème : il nourrit le sol, offre un abri et rassemble une communauté. Votre commandite fonctionne de la même façon. Vous ne faites pas que soutenir des organismes sans but lucratif. Vous cultivez un écosystème de résilience.",
    tiersEyebrow: "Choisissez votre rôle",
    tiersTitle: "Cinq façons d'aider la résilience à prendre racine",
    benefitsTitle: "Ce que chaque commanditaire reçoit",
    impactEyebrow: "Exclusif aux Catalyst",
    impactTitle: "La différence Catalyst : Impact Circle",
    impactBody:
      "Au niveau Catalyst, vous n'êtes pas seulement un commanditaire. Vous êtes un investisseur d'impact. Chaque trimestre, des organismes vous présentent de vrais problèmes qu'ils résolvent. Vous écoutez. Vous décidez. Vous investissez dans ce qui vous touche.",
    ctaTitle: "Prêt à vous engager?",
    ctaBody: "Chaque niveau a sa propre histoire. La vôtre commence ici.",
    exploreTier: "Explorer votre niveau",
    exploreTierAria: "Explorer les niveaux de commandite",
    scheduleConversation: "Planifier une conversation",
    scheduleConversationAria: "Planifier une conversation de commandite",
    calendlyFallback:
      "La réservation Calendly est en configuration. Écrivez-nous et notre équipe vous aidera à choisir le bon niveau de commandite.",
    questionsPrefix: "Questions? Écrivez-nous à",
    premiumTier: "Niveau premium",
    contactForPricing: "Contactez-nous pour le prix",
    featuredCta: "Devenir Catalyst",
    defaultCta: "En savoir plus",
    tierAria: (tierName) =>
      `En savoir plus sur le niveau de commandite ${tierName}`,
    tiers: [
      {
        name: "Seed Keeper",
        icon: "seedling",
        subtitle: "Commencer votre investissement",
        description:
          "Vous plantez les premières graines. Vous testez le terrain et explorez ce que signifie investir dans la résilience des organismes.",
        features: [
          "Participation à la communauté Olea Connects™ pour collaborer et réseauter",
          "Logo sur notre plateforme",
          "Mention dans l'infolettre trimestrielle",
          "Histoires d'impact trimestrielles",
          "Accès au répertoire des membres",
          "Reconnaissance communautaire",
          "Occasion pluriannuelle",
        ],
      },
      {
        name: "Root Keeper",
        icon: "roots",
        subtitle: "Établir les fondations",
        description:
          "Vous approfondissez votre engagement et bâtissez des relations dans le secteur sans but lucratif.",
        features: [
          "Participation à la communauté Olea Connects™ pour collaborer et réseauter",
          "Logo sur notre plateforme",
          "Mention dans l'infolettre trimestrielle",
          "Histoires d'impact trimestrielles",
          "Accès au répertoire des membres",
          "Reconnaissance communautaire",
          "Visibilité mise en valeur sur le site Web",
          "Invitation aux webinaires trimestriels",
          "Introductions directes auprès de leaders d'organismes que vous pouvez servir",
          "Occasion de prendre la parole à une conférence",
          "Occasion pluriannuelle",
        ],
      },
      {
        name: "Resilience Builder",
        icon: "builder",
        subtitle: "Créer des systèmes stables",
        description:
          "Vous prenez les devants. Vous créez une stabilité qui devient une base pour les autres. Votre leadership d'opinion façonne le secteur.",
        features: [
          "Participation à la communauté Olea Connects™ pour collaborer et réseauter",
          "Logo sur notre plateforme",
          "Mention dans l'infolettre trimestrielle",
          "Histoires d'impact trimestrielles",
          "Accès au répertoire des membres",
          "Reconnaissance communautaire",
          "Visibilité mise en valeur sur le site Web",
          "Invitation aux webinaires trimestriels",
          "Introductions directes auprès de leaders d'organismes que vous pouvez servir",
          "Occasion de prendre la parole à une conférence",
          "Placement vedette dans l'infolettre trimestrielle",
          "Animation d'un webinaire trimestriel",
          "Position VIP de réseautage",
          "Animation d'un atelier trimestriel de renforcement des capacités pour les organismes, axé sur l'impact : marketing, finances ou rédaction de demandes de subvention, à votre choix",
          "Occasion pluriannuelle",
        ],
      },
      {
        name: "Legacy Guardian",
        icon: "legacy",
        subtitle: "Transmettre la sagesse",
        description:
          "Vous assurez l'intendance. Le secteur fait confiance à votre jugement. Votre héritage façonne la prochaine génération.",
        features: [
          "Participation à la communauté Olea Connects™ pour collaborer et réseauter",
          "Logo sur notre plateforme",
          "Mention dans l'infolettre trimestrielle",
          "Histoires d'impact trimestrielles",
          "Accès au répertoire des membres",
          "Reconnaissance communautaire",
          "Visibilité mise en valeur sur le site Web",
          "Invitation aux webinaires trimestriels",
          "Introductions directes auprès de leaders d'organismes que vous pouvez servir",
          "Occasion de prendre la parole à une conférence",
          "Placement vedette dans l'infolettre trimestrielle",
          "Animation d'un webinaire trimestriel",
          "Position VIP de réseautage",
          "Occasion pluriannuelle",
          "Profil premium sur le site Web",
          "Occasions de prise de parole",
          "Table ronde Legacy Guardian",
          "Considération prioritaire pour devenir commanditaire Catalyst",
        ],
      },
      {
        name: "Catalyst",
        icon: "catalyst",
        subtitle: "Déclencher la transformation",
        description:
          "Vous êtes le rare leader qui ne fait pas que bâtir. Vous catalysez un changement qui dure pendant des générations.",
        features: [
          "Participation à la communauté Olea Connects™ pour collaborer et réseauter",
          "Logo sur notre plateforme",
          "Mention dans l'infolettre trimestrielle",
          "Histoires d'impact trimestrielles",
          "Accès au répertoire des membres",
          "Reconnaissance communautaire",
          "Visibilité mise en valeur sur le site Web",
          "Invitation aux webinaires trimestriels",
          "Introductions directes auprès de leaders d'organismes que vous pouvez servir",
          "Occasion de prendre la parole à une conférence",
          "Placement vedette dans l'infolettre trimestrielle",
          "Animation d'un webinaire trimestriel",
          "Position VIP de réseautage",
          "Conversations au niveau du conseil",
          "Profil premium sur le site Web",
          "Occasions de prise de parole",
          "Impact Circle trimestriel",
          "Impact direct auprès des organismes",
          "Renouvelé annuellement, sur invitation. Priorité aux commanditaires Legacy Guardian prêts à passer au niveau supérieur",
        ],
        featured: true,
        availability: "Seulement 5 places disponibles · mandats d'un an",
      },
    ],
    benefits: [
      {
        title: "Cercle de générosité",
        description:
          "Célébrations trimestrielles de l'impact collectif. Voyez les organismes que vous aidez et la communauté que vous bâtissez ensemble.",
      },
      {
        title: "Conférence annuelle",
        description:
          "Rassemblement de fin d'année avec d'autres commanditaires et leaders d'organismes. Voyez le mouvement dont vous faites partie.",
      },
      {
        title: "Reconnaissance publique",
        description:
          "Reconnu comme leader de la résilience des organismes. Mis en valeur dans l'infolettre, le site Web et les documents communautaires.",
      },
      {
        title: "Connexions d'affaires",
        description:
          "Accès direct à des leaders d'organismes qui ont besoin de ce que vous offrez. Transformez les relations en occasions d'affaires concrètes.",
      },
      {
        title: "Leadership d'opinion",
        description:
          "Positionnement comme expert de la résilience des organismes. Occasions de prise de parole et de collaboration de contenu.",
      },
      {
        title: "Impact communautaire",
        description:
          "Votre commandite finance directement le soutien aux organismes et renforce tout le secteur.",
      },
      {
        title: "Mastermind des commanditaires",
        description:
          "Un groupe de pairs animé par les commanditaires eux-mêmes. Ouvert à tout commanditaire qui souhaite y participer.",
      },
      {
        title: "Élan pluriannuel",
        description:
          "La reconnaissance grandit chaque année : logo en année 1, étude de cas vedette en année 2, moment de mise en lumière en année 3.",
      },
    ],
    impactFeatures: [
      {
        title: "Rencontres trimestrielles",
        description:
          "3 organismes présentent leurs besoins. Vous décidez de façon indépendante ce que vous souhaitez offrir.",
      },
      {
        title: "Capital réel",
        description:
          "Expertise pro bono, dons admissibles avec rapports d'impact complets, mentorat, connexions. Vous choisissez.",
      },
      {
        title: "Voix stratégique",
        description:
          "Appels trimestriels avec la direction d'Olive Social Impact. Vos commentaires orientent l'évolution du programme.",
      },
      {
        title: "Impact générationnel",
        description:
          "Bâtissez des relations avec des leaders communautaires. Catalysez une transformation durable.",
      },
    ],
  },
};

export function getSponsorshipPageCopy(locale: Locale) {
  return sponsorshipPageCopy[locale];
}
