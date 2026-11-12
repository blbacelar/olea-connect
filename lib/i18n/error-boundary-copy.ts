import type { Locale } from "@/lib/i18n/locales";

const copy = {
  "en-CA": {
    retry: "Try again",
    loading: "Loading workspace data",
    workspace: {
      title: "We could not load this page",
      description:
        "Please try again. If the problem continues, contact support so we can help you get back to your work.",
    },
    edReview: {
      eyebrow: "Confidential review",
      title: "We could not load this review",
      description:
        "Your confidential feedback remains protected. Please try again. If the problem continues, contact support.",
    },
    kpiDashboard: {
      title: "We could not load the KPI dashboard",
      description:
        "Please try again. If the problem continues, contact support so we can check your workspace.",
    },
    accreditation: {
      title: "We could not load the accreditation workspace",
      description:
        "Please try again. If the problem continues, contact support so we can check your organization settings.",
    },
  },
  "fr-CA": {
    retry: "Réessayer",
    loading: "Chargement des données de l’espace de travail",
    workspace: {
      title: "Impossible de charger cette page",
      description:
        "Veuillez réessayer. Si le problème persiste, communiquez avec le soutien pour reprendre votre travail.",
    },
    edReview: {
      eyebrow: "Évaluation confidentielle",
      title: "Impossible de charger cette évaluation",
      description:
        "Vos commentaires confidentiels demeurent protégés. Veuillez réessayer. Si le problème persiste, communiquez avec le soutien.",
    },
    kpiDashboard: {
      title: "Impossible de charger le tableau de bord des indicateurs",
      description:
        "Veuillez réessayer. Si le problème persiste, communiquez avec le soutien pour vérifier votre espace de travail.",
    },
    accreditation: {
      title: "Impossible de charger l’espace de travail d’agrément",
      description:
        "Veuillez réessayer. Si le problème persiste, communiquez avec le soutien pour vérifier les paramètres de votre organisation.",
    },
  },
} as const;

export function getErrorBoundaryCopy(locale: Locale) {
  return copy[locale];
}
