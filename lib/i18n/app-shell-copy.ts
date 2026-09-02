import type { Locale } from "./locales";

export type AppShellCopy = {
  breadcrumbs: Record<string, string>;
  navigation: Record<string, string>;
  header: {
    closeNavigation: string;
    help: string;
    markAllRead: string;
    markAllNotificationError: string;
    marking: string;
    member: string;
    navigation: string;
    noUnreadNotifications: string;
    notificationError: string;
    notifications: string;
    notificationsWithCount: (count: number) => string;
    openNavigation: string;
    signOut: string;
    brandSettings: string;
    team: string;
    allCaughtUp: string;
    justNow: string;
  };
  globalSearch: {
    triggerLabel: string;
    triggerText: string;
    dialogLabel: string;
    closeLabel: string;
    inputLabel: string;
    inputPlaceholder: string;
    resultsLabel: string;
    noResultsTitle: string;
    noResultsBody: string;
    moveHint: string;
    openHint: string;
    closeHint: string;
    typeLabels: {
      page: string;
      module: string;
      template: string;
      community: string;
      resource: string;
    };
  };
  searchItems: {
    dashboard: { title: string; description: string; keywords: string[] };
    templates: { title: string; description: string; keywords: string[] };
    boardCalendarModule: { title: string; description: string; keywords: string[] };
    edReviewModule: { title: string; description: string; keywords: string[] };
    community: { title: string; description: string; keywords: string[] };
    grants: { title: string; description: string; keywords: string[] };
    sponsors: { title: string; description: string; keywords: string[] };
    webinars: { title: string; description: string; keywords: string[] };
    consulting: { title: string; description: string; keywords: string[] };
    brandProfile: { title: string; description: string; keywords: string[] };
    team: { title: string; description: string; keywords: string[] };
    subscription: { title: string; description: string; keywords: string[] };
    help: { title: string; description: string; keywords: string[] };
    whatsNew: { title: string; description: string; keywords: string[] };
    boardSelfEvaluation: { title: string; description: string; keywords: string[] };
    boardCalendarWorkflow: { title: string; description: string; keywords: string[] };
  };
  sidebar: {
    ariaLabel: string;
    collapse: string;
    expand: string;
    primaryNavigation: string;
    workspaceLabel: (tier: string) => string;
  };
};

export const appShellCopy: Record<Locale, AppShellCopy> = {
  "en-CA": {
    breadcrumbs: {
      dashboard: "Dashboard",
      templates: "Templates",
      "board-self-evaluation": "Board Self-Evaluation",
      settings: "Settings",
      brand: "Brand Profile",
      community: "Community",
      grants: "Olea Gives Fund",
      webinars: "Webinars",
      team: "Team",
      subscription: "Subscription",
      help: "Help",
      "whats-new": "What's new",
      modules: "Modules",
      "board-calendar": "Board Calendar",
      "kpi-dashboard": "KPI Dashboard",
      "board-recruitment": "Board Recruitment",
      accreditation: "Accreditation",
      "grant-platform": "Grant Platform",
      "ed-review": "ED Review",
      sponsors: "Sponsors",
      consulting: "Consulting",
      integrations: "Operations",
      referrals: "Referrals",
    },
    navigation: {
      "/dashboard": "Dashboard",
      "/templates": "Templates",
      "/modules/board-calendar": "Board Calendar",
      "/modules/kpi-dashboard": "KPI Dashboard",
      "/modules/board-recruitment": "Board Recruitment",
      "/modules/accreditation": "Accreditation",
      "/modules/grant-platform": "Grant Platform",
      "/modules/ed-review": "ED Review",
      "/community": "Community",
      "/grants": "Grants",
      "/sponsors": "Sponsors",
      "/webinars": "Webinars",
      "/consulting": "Consulting",
      "/settings/brand": "Brand Profile",
      "/team": "Team",
      "/subscription": "Subscription",
      "/settings/integrations": "Operations",
      "/settings/referrals": "Referrals",
      "/help": "Help",
      "/whats-new": "What's new",
    },
    header: {
      closeNavigation: "Close navigation",
      help: "Help",
      markAllRead: "Mark all read",
      markAllNotificationError:
        "We could not mark notifications as read. Please refresh and try again.",
      marking: "Marking...",
      member: "Member",
      navigation: "Navigation",
      noUnreadNotifications: "No unread notifications",
      notificationError:
        "We could not mark this notification as read. Please try again.",
      notifications: "Notifications",
      notificationsWithCount: (count) => `Notifications (${count} unread)`,
      openNavigation: "Open navigation",
      signOut: "Sign out",
      brandSettings: "Brand settings",
      team: "Team",
      allCaughtUp: "You are all caught up.",
      justNow: "Just now",
    },
    globalSearch: {
      triggerLabel: "Open global search",
      triggerText: "Search templates, posts, resources",
      dialogLabel: "Global search",
      closeLabel: "Close global search",
      inputLabel: "Search command palette",
      inputPlaceholder: "Jump to a page, template, or resource...",
      resultsLabel: "Global search results",
      noResultsTitle: "No matching results",
      noResultsBody:
        'Try searching for "templates", "webinars", "team", or a board resource.',
      moveHint: "↑↓ move",
      openHint: "Enter open",
      closeHint: "Esc close",
      typeLabels: {
        page: "Page",
        module: "Module",
        template: "Template",
        community: "Community",
        resource: "Resource",
      },
    },
    searchItems: {
      dashboard: {
        title: "Dashboard",
        description: "Open your nonprofit home base.",
        keywords: ["home", "overview", "nonprofit"],
      },
      templates: {
        title: "Templates",
        description: "Find branded governance templates and board-ready resources.",
        keywords: ["documents", "resources", "library", "pdf"],
      },
      boardCalendarModule: {
        title: "Board Calendar Module",
        description: "Plan meetings, workflows, packages, and board operations.",
        keywords: ["calendar", "workflow", "meetings", "board package"],
      },
      edReviewModule: {
        title: "ED/CEO Annual Review",
        description:
          "Run anonymous staff and partner surveys with Board Chair reporting.",
        keywords: ["ed", "ceo", "survey", "anonymous", "board chair", "feedback"],
      },
      community: {
        title: "Community",
        description: "Join member discussions and spaces.",
        keywords: ["posts", "spaces", "discussion", "network"],
      },
      grants: {
        title: "Grants",
        description: "Explore Olea Gives opportunities and applications.",
        keywords: ["funding", "olea gives", "applications"],
      },
      sponsors: {
        title: "Sponsors",
        description: "Browse approved sponsors and Olea Gives contribution reporting.",
        keywords: ["partners", "olea gives", "contributions", "funding"],
      },
      webinars: {
        title: "Webinars",
        description: "See upcoming sessions, Zoom links, and recordings.",
        keywords: ["events", "recordings", "zoom", "sessions"],
      },
      consulting: {
        title: "Consulting",
        description: "Submit Harvest requests, track hours, and review support activity.",
        keywords: ["harvest", "support", "consultant", "hours", "requests"],
      },
      brandProfile: {
        title: "Brand Profile",
        description: "Manage your logo, colors, and report identity.",
        keywords: ["settings", "logo", "colors", "reports"],
      },
      team: {
        title: "Team",
        description: "Invite members and manage workspace seats.",
        keywords: ["members", "seats", "invites", "users"],
      },
      subscription: {
        title: "Subscription",
        description: "Manage your plan, seats, and billing access.",
        keywords: ["plan", "billing", "membership", "upgrade"],
      },
      help: {
        title: "Help",
        description: "Get guides, answers, and support.",
        keywords: ["support", "faq", "contact", "guide"],
      },
      whatsNew: {
        title: "What's new",
        description: "Review product updates and newly released resources.",
        keywords: ["updates", "release notes", "new"],
      },
      boardSelfEvaluation: {
        title: "Board Self-Evaluation",
        description:
          "Annual survey template for board reflection and governance health.",
        keywords: ["survey", "annual", "governance", "evaluation"],
      },
      boardCalendarWorkflow: {
        title: "Board Calendar & Operational Workflow",
        description:
          "Template workspace for meetings, preparation tasks, and board packages.",
        keywords: ["calendar", "workflow", "meetings", "board package", "portal"],
      },
    },
    sidebar: {
      ariaLabel: "App sidebar",
      collapse: "Collapse sidebar",
      expand: "Expand sidebar",
      primaryNavigation: "Primary navigation",
      workspaceLabel: (tier) => `${tier} workspace`,
    },
  },
  "fr-CA": {
    breadcrumbs: {
      dashboard: "Tableau de bord",
      templates: "Modèles",
      "board-self-evaluation": "Autoévaluation du conseil",
      settings: "Paramètres",
      brand: "Profil de marque",
      community: "Communauté",
      grants: "Fonds Olea Gives",
      webinars: "Webinaires",
      team: "Équipe",
      subscription: "Abonnement",
      help: "Aide",
      "whats-new": "Nouveautés",
      modules: "Modules",
      "board-calendar": "Calendrier du conseil",
      "kpi-dashboard": "Tableau de bord KPI",
      "board-recruitment": "Recrutement du conseil",
      accreditation: "Agrément",
      "grant-platform": "Plateforme de subventions",
      "ed-review": "Évaluation DG/PDG",
      sponsors: "Commanditaires",
      consulting: "Consultation",
      integrations: "Opérations",
      referrals: "Références",
    },
    navigation: {
      "/dashboard": "Tableau de bord",
      "/templates": "Modèles",
      "/modules/board-calendar": "Calendrier du conseil",
      "/modules/kpi-dashboard": "Tableau de bord KPI",
      "/modules/board-recruitment": "Recrutement du conseil",
      "/modules/accreditation": "Agrément",
      "/modules/grant-platform": "Plateforme de subventions",
      "/modules/ed-review": "Évaluation DG/PDG",
      "/community": "Communauté",
      "/grants": "Subventions",
      "/sponsors": "Commanditaires",
      "/webinars": "Webinaires",
      "/consulting": "Consultation",
      "/settings/brand": "Profil de marque",
      "/team": "Équipe",
      "/subscription": "Abonnement",
      "/settings/integrations": "Opérations",
      "/settings/referrals": "Références",
      "/help": "Aide",
      "/whats-new": "Nouveautés",
    },
    header: {
      closeNavigation: "Fermer la navigation",
      help: "Aide",
      markAllRead: "Tout marquer comme lu",
      markAllNotificationError:
        "Impossible de marquer les notifications comme lues. Veuillez actualiser la page et réessayer.",
      marking: "Marquage...",
      member: "Membre",
      navigation: "Navigation",
      noUnreadNotifications: "Aucune notification non lue",
      notificationError:
        "Impossible de marquer cette notification comme lue. Veuillez réessayer.",
      notifications: "Notifications",
      notificationsWithCount: (count) => `Notifications (${count} non lues)`,
      openNavigation: "Ouvrir la navigation",
      signOut: "Se déconnecter",
      brandSettings: "Paramètres de marque",
      team: "Équipe",
      allCaughtUp: "Vous êtes à jour.",
      justNow: "À l'instant",
    },
    globalSearch: {
      triggerLabel: "Ouvrir la recherche globale",
      triggerText: "Rechercher modèles, publications, ressources",
      dialogLabel: "Recherche globale",
      closeLabel: "Fermer la recherche globale",
      inputLabel: "Rechercher dans la palette de commandes",
      inputPlaceholder: "Aller à une page, un modèle ou une ressource...",
      resultsLabel: "Résultats de recherche globale",
      noResultsTitle: "Aucun résultat correspondant",
      noResultsBody:
        'Essayez "modèles", "webinaires", "équipe" ou une ressource du conseil.',
      moveHint: "↑↓ déplacer",
      openHint: "Entrée ouvrir",
      closeHint: "Échap fermer",
      typeLabels: {
        page: "Page",
        module: "Module",
        template: "Modèle",
        community: "Communauté",
        resource: "Ressource",
      },
    },
    searchItems: {
      dashboard: {
        title: "Tableau de bord",
        description: "Ouvrir le point central de votre organisme.",
        keywords: ["accueil", "aperçu", "organisme"],
      },
      templates: {
        title: "Modèles",
        description:
          "Trouver des modèles de gouvernance aux couleurs de votre marque et des ressources prêtes pour le conseil.",
        keywords: ["documents", "ressources", "bibliothèque", "pdf"],
      },
      boardCalendarModule: {
        title: "Module Calendrier du conseil",
        description:
          "Planifier réunions, flux de travail, dossiers et opérations du conseil.",
        keywords: ["calendrier", "flux de travail", "réunions", "dossier du conseil"],
      },
      edReviewModule: {
        title: "Évaluation annuelle DG/PDG",
        description:
          "Lancer des sondages anonymes auprès du personnel et des partenaires avec rapports pour la présidence du conseil.",
        keywords: ["dg", "pdg", "sondage", "anonyme", "présidence", "commentaires"],
      },
      community: {
        title: "Communauté",
        description: "Participer aux discussions et espaces des membres.",
        keywords: ["publications", "espaces", "discussion", "réseau"],
      },
      grants: {
        title: "Subventions",
        description: "Explorer les occasions et demandes du fonds Olea Gives.",
        keywords: ["financement", "olea gives", "demandes"],
      },
      sponsors: {
        title: "Commanditaires",
        description:
          "Consulter les commanditaires approuvés et les rapports de contribution Olea Gives.",
        keywords: ["partenaires", "olea gives", "contributions", "financement"],
      },
      webinars: {
        title: "Webinaires",
        description: "Voir les séances à venir, les liens Zoom et les enregistrements.",
        keywords: ["événements", "enregistrements", "zoom", "séances"],
      },
      consulting: {
        title: "Consultation",
        description:
          "Soumettre des demandes Harvest, suivre les heures et consulter l'activité de soutien.",
        keywords: ["harvest", "soutien", "consultant", "heures", "demandes"],
      },
      brandProfile: {
        title: "Profil de marque",
        description: "Gérer votre logo, vos couleurs et l'identité des rapports.",
        keywords: ["paramètres", "logo", "couleurs", "rapports"],
      },
      team: {
        title: "Équipe",
        description: "Inviter des membres et gérer les sièges de l'espace de travail.",
        keywords: ["membres", "sièges", "invitations", "utilisateurs"],
      },
      subscription: {
        title: "Abonnement",
        description: "Gérer votre forfait, vos sièges et l'accès à la facturation.",
        keywords: ["forfait", "facturation", "adhésion", "mise à niveau"],
      },
      help: {
        title: "Aide",
        description: "Obtenir des guides, des réponses et du soutien.",
        keywords: ["soutien", "faq", "contact", "guide"],
      },
      whatsNew: {
        title: "Nouveautés",
        description: "Consulter les mises à jour produit et les nouvelles ressources.",
        keywords: ["mises à jour", "notes de version", "nouveau"],
      },
      boardSelfEvaluation: {
        title: "Autoévaluation du conseil",
        description:
          "Modèle de sondage annuel pour la réflexion du conseil et la santé de la gouvernance.",
        keywords: ["sondage", "annuel", "gouvernance", "évaluation"],
      },
      boardCalendarWorkflow: {
        title: "Calendrier du conseil et flux opérationnel",
        description:
          "Espace modèle pour les réunions, les tâches de préparation et les dossiers du conseil.",
        keywords: ["calendrier", "flux de travail", "réunions", "dossier du conseil", "portail"],
      },
    },
    sidebar: {
      ariaLabel: "Barre latérale de l'application",
      collapse: "Réduire la barre latérale",
      expand: "Développer la barre latérale",
      primaryNavigation: "Navigation principale",
      workspaceLabel: (tier) => `Espace ${tier}`,
    },
  },
};

export function getAppShellCopy(locale: Locale) {
  return appShellCopy[locale];
}
