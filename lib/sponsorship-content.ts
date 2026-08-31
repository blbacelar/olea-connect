export type SponsorshipTierIcon =
  "builder" | "catalyst" | "legacy" | "roots" | "seedling";

export type SponsorshipTier = {
  name: string;
  icon: SponsorshipTierIcon;
  subtitle: string;
  description: string;
  features: string[];
  featured?: boolean;
  availability?: string;
};

export const sponsorshipTiers: SponsorshipTier[] = [
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
      "Host a quarterly capacity-building workshop for nonprofits, focused on impact — marketing, finance, or grant writing, your choice",
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
      "You're the rare leader who doesn't just build—you catalyze change that lasts generations.",
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
      "Renewed annually, by invitation — priority given to Legacy Guardian sponsors ready to step up",
    ],
    featured: true,
    availability: "Only 5 spots available · 1-year terms",
  },
];

export const sponsorBenefits = [
  {
    title: "Circle of Generosity",
    description:
      "Quarterly celebrations of collective impact. See the nonprofits you're helping + the community you're building together.",
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
];

export const impactCircleFeatures = [
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
];

function getSponsorshipCalendlyUrl(value: string | undefined) {
  if (!value?.trim()) return "";

  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export const sponsorshipCalendlyUrl = getSponsorshipCalendlyUrl(
  process.env.NEXT_PUBLIC_SPONSORSHIP_CALENDLY_URL,
);

export const sponsorshipContactEmail = "sponsorship@olivesocialimpact.com";
