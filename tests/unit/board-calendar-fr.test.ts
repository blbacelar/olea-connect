import { describe, expect, it } from "vitest";

import { translateFrenchUiText } from "@/lib/i18n/french-runtime-translations";

describe("Board Calendar French-Canadian copy", () => {
  it("translates document, package, and audit controls", () => {
    expect(translateFrenchUiText("Consent agenda")).toBe("Ordre du jour de consentement");
    expect(translateFrenchUiText("Approve for package")).toBe("Approuver pour le dossier");
    expect(translateFrenchUiText("Package Opened")).toBe("Dossier ouvert");
    expect(translateFrenchUiText("Attendance for Bruno")).toBe("Présence de Bruno");
    expect(translateFrenchUiText("Meeting documents: Governance Review")).toBe("Documents de réunion : Governance Review");
  });
});
