import { describe, expect, it } from "vitest";

import {
  defaultLocale,
  normalizeLocale,
  resolveRequestLocale,
} from "@/lib/i18n/locales";
import { getAuthFlowCopy } from "@/lib/i18n/auth-flow-copy";
import { getAppShellCopy } from "@/lib/i18n/app-shell-copy";
import {
  getLegalDocumentCopy,
  getLegalPageCopy,
} from "@/lib/i18n/legal-documents-copy";
import { getPublicSiteCopy } from "@/lib/i18n/public-site-copy";
import { getReferralPageCopy } from "@/lib/i18n/referral-page-copy";
import { getSponsorshipPageCopy } from "@/lib/i18n/sponsorship-page-copy";
import { translateFrenchUiText } from "@/lib/i18n/french-runtime-translations";
import { formatCad } from "@/lib/pricing";
import { formatReferralMoney } from "@/lib/referrals/domain";

describe("locale resolution", () => {
  it("uses English Canada by default", () => {
    expect(
      resolveRequestLocale({
        localeCookie: null,
        country: null,
        region: null,
        acceptLanguage: null,
      }),
    ).toBe(defaultLocale);
  });

  it("honours the manual locale cookie before geolocation", () => {
    expect(
      resolveRequestLocale({
        localeCookie: "en-CA",
        country: "CA",
        region: "QC",
        acceptLanguage: "fr-CA,fr;q=0.9,en;q=0.8",
      }),
    ).toBe("en-CA");
  });

  it("defaults Quebec visitors to Canadian French", () => {
    expect(
      resolveRequestLocale({
        localeCookie: null,
        country: "CA",
        region: "QC",
        acceptLanguage: "en-CA,en;q=0.9",
      }),
    ).toBe("fr-CA");
  });

  it("falls back to Accept-Language when no supported cookie or Quebec signal exists", () => {
    expect(
      resolveRequestLocale({
        localeCookie: null,
        country: "CA",
        region: "BC",
        acceptLanguage: "fr-CA,fr;q=0.9,en;q=0.8",
      }),
    ).toBe("fr-CA");
  });

  it("honours Accept-Language quality weights", () => {
    expect(
      resolveRequestLocale({
        localeCookie: null,
        country: "CA",
        region: "BC",
        acceptLanguage: "en-CA;q=0.1,fr-CA;q=1.0",
      }),
    ).toBe("fr-CA");
  });

  it("does not choose languages explicitly rejected by Accept-Language", () => {
    expect(
      resolveRequestLocale({
        localeCookie: null,
        country: "CA",
        region: "BC",
        acceptLanguage: "fr-CA;q=0,en-CA;q=0.8",
      }),
    ).toBe("en-CA");
  });

  it("falls back from regional French variants to Canadian French", () => {
    expect(
      resolveRequestLocale({
        localeCookie: null,
        country: "BE",
        region: null,
        acceptLanguage: "fr-BE,fr;q=0.9,en;q=0.2",
      }),
    ).toBe("fr-CA");
  });

  it("normalizes supported language aliases", () => {
    expect(normalizeLocale("fr")).toBe("fr-CA");
    expect(normalizeLocale("fr-BE")).toBe("fr-CA");
    expect(normalizeLocale("en-US")).toBe("en-CA");
    expect(normalizeLocale("pt-BR")).toBeNull();
  });
});

describe("localized public copy", () => {
  it("provides the landing page CTA in both supported languages", () => {
    expect(getPublicSiteCopy("en-CA").hero.primaryCta).toBe(
      "Join Olea Connects™",
    );
    expect(getPublicSiteCopy("fr-CA").hero.primaryCta).toBe(
      "Rejoindre Olea Connects™",
    );
  });

  it("formats Canadian dollar values for each locale", () => {
    expect(formatCad(1944, "en-CA")).toBe("$1,944 CAD");
    expect(formatCad(1944, "fr-CA")).toBe("1\u00A0944\u00A0$ CA");
    expect(formatReferralMoney(50000, "CAD", "fr-CA")).toBe(
      "500,00\u00A0$",
    );
  });
});

describe("localized auth flow copy", () => {
  it("provides translated labels for the signup flow", () => {
    const copy = getAuthFlowCopy("fr-CA");

    expect(copy.signup.plan.title).toBe("Choisissez votre forfait");
    expect(copy.signup.account.continueToPayment).toBe("Continuer au paiement");
    expect(copy.signup.payment.secureCheckout).toBe("Caisse sécurisée");
    expect(copy.login.submit).toBe("Se connecter");
  });
});

describe("localized public referral and sponsorship copy", () => {
  it("provides French Canadian referral page and form labels", () => {
    const copy = getReferralPageCopy("fr-CA");

    expect(copy.heroEyebrow).toBe("Programme de références maintenant ouvert");
    expect(copy.form.title).toBe("Recevoir votre lien de référence");
  });

  it("provides French Canadian sponsorship page labels", () => {
    const copy = getSponsorshipPageCopy("fr-CA");

    expect(copy.heroTitle).toBe(
      "Devenez partenaire pour renforcer la résilience des organismes sans but lucratif",
    );
    expect(copy.contactForPricing).toBe("Contactez-nous pour le prix");
  });
});

describe("localized shell and legal copy", () => {
  it("provides French Canadian global search labels and indexed items", () => {
    const copy = getAppShellCopy("fr-CA");

    expect(copy.globalSearch.triggerText).toBe(
      "Rechercher modèles, publications, ressources",
    );
    expect(copy.searchItems.team.title).toBe("Équipe");
    expect(copy.globalSearch.typeLabels.template).toBe("Modèle");
  });

  it("provides French Canadian legal document content", () => {
    expect(getLegalPageCopy("fr-CA").returnToSignup).toBe(
      "Retour à l'inscription",
    );
    expect(getLegalDocumentCopy("terms", "fr-CA").title).toBe(
      "Conditions d'utilisation",
    );
    expect(getLegalDocumentCopy("privacy", "fr-CA").sections[0]?.heading).toBe(
      "1. Renseignements que nous recueillons",
    );
  });
});

describe("French runtime authenticated UI fallback", () => {
  it("translates exact authenticated module strings without changing unknown copy", () => {
    expect(translateFrenchUiText("Board Dashboard")).toBe(
      "Tableau de bord du conseil",
    );
    expect(translateFrenchUiText("Choose a workspace member")).toBe(
      "Choisir un membre de l'espace de travail",
    );
    expect(translateFrenchUiText("Q3 Tracker")).toBe("Suivi T3");
    expect(translateFrenchUiText("Customer-entered English title")).toBe(
      "Customer-entered English title",
    );
  });
});
