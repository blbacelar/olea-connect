import type { Locale } from "@/lib/i18n/locales";

export const generosityCopy: Record<
  Locale,
  {
    title: string;
    description: string;
    statLabel: string;
    statValue: string;
    statDetail: string;
    cardTitle: string;
    body: string;
  }
> = {
  "en-CA": {
    title: "Olea's Circle of Generosity",
    description: "Our commitment to giving back to nonprofit communities.",
    statLabel: "Circle of Generosity",
    statValue: "15%",
    statDetail: "of profits flow back to nonprofits",
    cardTitle: "Giving back to nonprofits",
    body: "Olive Social Impact donates 15% of its profits to nonprofits as unrestricted donations. We are not accepting grant applications, and membership does not guarantee a donation.",
  },
  "fr-CA": {
    title: "Le Cercle de générosité d'Olea",
    description: "Notre engagement envers les organismes sans but lucratif.",
    statLabel: "Cercle de générosité",
    statValue: "15 %",
    statDetail: "des bénéfices sont remis aux organismes sans but lucratif",
    cardTitle: "Soutenir les organismes sans but lucratif",
    body: "Olive Social Impact remet 15 % de ses bénéfices à des organismes sans but lucratif sous forme de dons sans restriction. Nous n'acceptons pas de demandes de subvention et l'adhésion ne garantit pas de don.",
  },
};
