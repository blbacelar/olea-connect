import type { Locale } from "@/lib/i18n/locales";

const demoPageCopy = {
  "en-CA": {
    eyebrow: "Product demos",
    title: "See how Olea Connects works",
    description: "Watch short walkthroughs of real product workflows, recorded with fictional nonprofit data.",
    languageNote: "English on-screen text · Music, no narration",
    videoFallback: "Your browser does not support this video.",
    videos: {
      boardCalendar: {
        title: "Board Calendar",
        description: "Plan a board meeting, create its preparation task automatically, approve a consent agenda, and review the board package.",
        duration: "59 sec",
        videoLabel: "Board Calendar demo video",
      },
      grantPlatform: {
        title: "Grant Platform",
        description: "Follow a grant opportunity from creation through funder tracking, deadlines, and reports.",
        duration: "1 min 25 sec",
        videoLabel: "Grant Platform demo video",
      },
    },
  },
  "fr-CA": {
    eyebrow: "Démonstrations des produits",
    title: "Découvrez Olea Connects en action",
    description: "Regardez de courts parcours des outils, enregistrés avec les données fictives d'un organisme.",
    languageNote: "Texte à l'écran en anglais · Musique, sans narration",
    videoFallback: "Votre navigateur ne prend pas en charge cette vidéo.",
    videos: {
      boardCalendar: {
        title: "Calendrier du conseil",
        description: "Planifiez une réunion, créez automatiquement une tâche préparatoire, approuvez l'ordre du jour de consentement et consultez le dossier du conseil.",
        duration: "59 s",
        videoLabel: "Vidéo de démonstration du calendrier du conseil",
      },
      grantPlatform: {
        title: "Plateforme de subventions",
        description: "Suivez une occasion de financement, de sa création au suivi des bailleurs de fonds, des échéances et des rapports.",
        duration: "1 min 25 s",
        videoLabel: "Vidéo de démonstration de la plateforme de subventions",
      },
    },
  },
} as const;

export function getDemoPageCopy(locale: Locale) {
  return demoPageCopy[locale];
}
