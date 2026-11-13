import { describe, expect, it } from "vitest";

import { renderBoardRecruitmentPdfBuffer } from "@/lib/board-recruitment/pdf-export";
import type { RecruitmentData } from "@/lib/board-recruitment/types";
import type { BrandProfile } from "@/lib/types";
import { inspectPdf } from "@/tests/support/pdf-inspector";

const organizationName = "Fondation Boréale";
const data: RecruitmentData = {
  workspace: {
    id: "workspace-1",
    organizationId: "organization-1",
    organizationName,
    accentColor: "#315E48",
    surveyYear: 2026,
    termLengthYears: 3,
    maxConsecutiveTerms: 2,
    maxYearsOfService: 6,
    upcomingAgmYear: 2027,
  },
  members: [
    {
      id: "director-1",
      fullName: "Camille Tremblay",
      roleTitle: "",
      memberType: "director",
      office: "chair",
      email: "camille@example.org",
      dateJoined: "2025-04-01",
      active: true,
      notes: "",
    },
  ],
  skills: [],
  invitations: [],
  skillAssignments: [],
  responses: [],
  committees: [],
};
const brand: BrandProfile = {
  organizationName,
  primaryColor: "#315E48",
  secondaryColor: "#D9A868",
  logoInitials: "FB",
  contactEmail: "bonjour@example.org",
};

describe("board recruitment PDF localization", () => {
  it("keeps the organization brand and renders report copy in French", async () => {
    const buffer = await renderBoardRecruitmentPdfBuffer(data, brand, true, "fr-CA");
    const pdf = await inspectPdf(buffer);

    expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.text).toContain(organizationName);
    expect(pdf.text).toContain("Camille Tremblay");
    expect(pdf.metadata.title).toContain("Rapport de recrutement au conseil");
    expect(pdf.text).toContain("Couverture des compétences");
    expect(pdf.text).toContain("Mandats et relève du conseil");
    expect(pdf.text).toContain("Courriel: bonjour@example.org");
    expect(pdf.text).not.toContain("Executive summary");
    expect(pdf.text).not.toContain("Board terms & succession");
  });
});
