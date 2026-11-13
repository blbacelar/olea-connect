import { describe, expect, it } from "vitest";

import { defaultCommittees, recruitmentCategories } from "@/lib/board-recruitment/domain";
import type { RecruitmentData } from "@/lib/board-recruitment/types";
import { uninvitedDirectors } from "@/app/modules/board-recruitment/_components/helpers";
import {
  translateRecruitmentCoverageLevel,
  translateRecruitmentReferenceName,
  translateRecruitmentTermStatus,
} from "@/lib/i18n/board-recruitment-fr";
import { translateFrenchUiText } from "@/lib/i18n/french-runtime-translations";

describe("Board Recruitment French copy", () => {
  it("translates every built-in category, skill, and committee without changing custom names", () => {
    for (const category of recruitmentCategories) {
      expect(translateRecruitmentReferenceName(category.name)).not.toBe(category.name);
      for (const skill of category.skills) {
        expect(translateRecruitmentReferenceName(skill)).not.toBe(skill);
        expect(translateRecruitmentReferenceName(skill, true)).toBe(skill);
      }
    }
    for (const committee of defaultCommittees) {
      expect(translateRecruitmentReferenceName(committee)).not.toBe(committee);
    }
    expect(translateRecruitmentReferenceName("Neighbourhood Health Advisory", true))
      .toBe("Neighbourhood Health Advisory");
  });

  it("covers visible Overview, Matrix, Survey, Terms, Committees, and Report copy", () => {
    const labels = [
      "Coverage is based on active directors who have responded.",
      "Open Skills Matrix",
      "Single-holder risk",
      "Custom skills are scoped to this workspace and cannot duplicate an existing skill.",
      "Send to all not-yet-invited",
      "Preview and record a response for a director while the production magic-link flow is connected.",
      "Save term rules",
      "Executive Committee & officer succession",
      "Committee chair",
      "Needs a chair",
      "Printable recruitment report",
      "Board Recruitment Toolkit",
    ];
    for (const label of labels) expect(translateFrenchUiText(label)).not.toBe(label);
    expect(translateRecruitmentCoverageLevel("strong")).toBe("forte");
    expect(translateRecruitmentCoverageLevel("gap")).toBe("lacune");
    expect(translateRecruitmentTermStatus("term-limited")).toBe("mandat limité");
  });

  it("enables bulk invitation only when an active director has email and no invitation", () => {
    const base = { invitations: [], members: [] } as unknown as RecruitmentData;
    expect(uninvitedDirectors(base)).toHaveLength(0);
    const members = [
      { id: "active", active: true, memberType: "director", email: "active@example.org" },
      { id: "missing-email", active: true, memberType: "director", email: " " },
      { id: "staff", active: true, memberType: "staff", email: "staff@example.org" },
      { id: "inactive", active: false, memberType: "director", email: "inactive@example.org" },
    ] as RecruitmentData["members"];
    expect(uninvitedDirectors({ ...base, members }).map((member) => member.id)).toEqual(["active"]);
    expect(uninvitedDirectors({ ...base, members, invitations: [{ memberId: "active" }] as RecruitmentData["invitations"] }))
      .toHaveLength(0);
  });
});
