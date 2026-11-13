import { describe, expect, it } from "vitest";

import { translateFrenchUiText } from "@/lib/i18n/french-runtime-translations";
import { createMeetingDocument } from "@/lib/template-renderer/board-calendar-meeting-documents";

describe("Board Calendar French-Canadian copy", () => {
  it("translates document, package, and audit controls", () => {
    expect(translateFrenchUiText("Consent agenda")).toBe("Ordre du jour de consentement");
    expect(translateFrenchUiText("Approve for package")).toBe("Approuver pour le dossier");
    expect(translateFrenchUiText("Package Opened")).toBe("Dossier ouvert");
    expect(translateFrenchUiText("Attendance for Bruno")).toBe("Présence de Bruno");
    expect(translateFrenchUiText("Meeting documents: Governance Review")).toBe("Documents de réunion : Governance Review");
    expect(translateFrenchUiText("Committee agenda")).toBe("Ordre du jour du comité");
    expect(translateFrenchUiText("Tabled")).toBe("Reportée");
    expect(translateFrenchUiText("Board term impact at the 2026 AGM")).toBe("Incidence des mandats à l’AGA de 2026");
    expect(translateFrenchUiText("Alex: term-limited; plan a replacement")).toBe("Alex : limité par mandat; planifiez une relève");
    expect(translateFrenchUiText("Status for action 1")).toBe("Statut de la mesure 1");
    expect(translateFrenchUiText("Review of open action items")).toBe("Suivi des mesures en cours");
    expect(createMeetingDocument("meeting-1", "consent_agenda", [], true).sections.consent)
      .toContain("Approbation du procès-verbal précédent");
  });
});
