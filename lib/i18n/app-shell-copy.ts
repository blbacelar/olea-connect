import type { Locale } from "./locales";
import { appShellCopyEn } from "./app-shell-copy.en";
import { appShellCopyFr } from "./app-shell-copy.fr";

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
  searchItems: Record<
    | "dashboard"
    | "templates"
    | "boardCalendarModule"
    | "edReviewModule"
    | "community"
    | "grants"
    | "sponsors"
    | "webinars"
    | "consulting"
    | "brandProfile"
    | "team"
    | "subscription"
    | "help"
    | "whatsNew"
    | "boardSelfEvaluation"
    | "boardCalendarWorkflow",
    { title: string; description: string; keywords: string[] }
  >;
  sidebar: {
    ariaLabel: string;
    collapse: string;
    expand: string;
    primaryNavigation: string;
    workspaceLabel: (tier: string) => string;
  };
};

export const appShellCopy: Record<Locale, AppShellCopy> = {
  "en-CA": appShellCopyEn,
  "fr-CA": appShellCopyFr,
};

export function getAppShellCopy(locale: Locale) {
  return appShellCopy[locale];
}
