import { describe, expect, it } from "vitest";

import { normalizeBoardCalendarMemberAssignments } from "@/lib/template-renderer/board-calendar-chairs";

const members = [
  {
    id: "member-bruno",
    name: "Bruno Bacelar",
    email: "bruno@example.org",
  },
  {
    id: "member-rosalyn",
    name: "Rosalyn Grant",
    email: "rosalyn@example.org",
  },
];

describe("Board Calendar member assignments", () => {
  it("canonicalizes the administrator to an active workspace member and derives their email", () => {
    expect(
      normalizeBoardCalendarMemberAssignments(
        {
          administrator: "Old administrator label",
          administrator_email: "wrong@example.org",
          administrator_user_id: "member-bruno",
          committees: [],
        },
        members,
      ),
    ).toMatchObject({
      administrator: "Bruno Bacelar",
      administrator_email: "bruno@example.org",
      administrator_user_id: "member-bruno",
    });
  });

  it("rejects an administrator who is not an active workspace member", () => {
    expect(() =>
      normalizeBoardCalendarMemberAssignments(
        {
          administrator: "External person",
          administrator_user_id: "external-user",
          committees: [],
        },
        members,
      ),
    ).toThrow(/Administrator must be assigned to an active workspace member/i);
  });

  it("migrates an administrator through their unique legacy email", () => {
    expect(
      normalizeBoardCalendarMemberAssignments(
        {
          administrator: "Bruno",
          administrator_email: "bruno@example.org",
          committees: [],
        },
        members,
      ),
    ).toMatchObject({
      administrator: "Bruno Bacelar",
      administrator_email: "bruno@example.org",
      administrator_user_id: "member-bruno",
    });
  });

  it("canonicalizes board and committee chairs to active workspace members", () => {
    expect(
      normalizeBoardCalendarMemberAssignments(
        {
          board_chair: "Old label",
          board_chair_user_id: "member-bruno",
          committees: [
            {
              name: "Finance Committee",
              chair: "Someone else",
              chair_user_id: "member-rosalyn",
            },
          ],
        },
        members,
      ),
    ).toMatchObject({
      board_chair: "Bruno Bacelar",
      board_chair_user_id: "member-bruno",
      committees: [
        {
          name: "Finance Committee",
          chair: "Rosalyn Grant",
          chair_user_id: "member-rosalyn",
        },
      ],
    });
  });

  it("migrates a unique legacy display name to its active workspace member", () => {
    expect(
      normalizeBoardCalendarMemberAssignments(
        {
          board_chair: "Bruno Bacelar",
          committees: [],
        },
        members,
      ),
    ).toMatchObject({
      board_chair: "Bruno Bacelar",
      board_chair_user_id: "member-bruno",
    });
  });

  it("allows an unassigned chair", () => {
    expect(
      normalizeBoardCalendarMemberAssignments(
        { board_chair: "", committees: [{ name: "Finance Committee" }] },
        members,
      ),
    ).toMatchObject({
      board_chair: "",
      board_chair_user_id: "",
      committees: [{ name: "Finance Committee" }],
    });
  });

  it("rejects chair data that does not belong to the active workspace directory", () => {
    expect(() =>
      normalizeBoardCalendarMemberAssignments(
        {
          board_chair: "External person",
          board_chair_user_id: "external-user",
          committees: [],
        },
        members,
      ),
    ).toThrow(/Board Chair must be assigned to an active workspace member/i);
  });

  it("preserves unchanged legacy assignments while saving unrelated calendar changes", () => {
    const previous = {
      administrator: "Former administrator",
      administrator_email: "former@example.org",
      board_chair: "Former chair",
      committees: [
        { name: "Governance", chair: "Former committee chair", chair_user_id: "inactive-user", notes: "Old note" },
      ],
      meetings: [{ title: "Past meeting" }],
    };

    expect(normalizeBoardCalendarMemberAssignments(
      {
        ...previous,
        committees: [{ ...previous.committees[0], notes: "Updated note" }],
        meetings: [],
      },
      members,
      previous,
    )).toMatchObject({
      administrator: "Former administrator",
      board_chair: "Former chair",
      committees: [{ name: "Governance", chair: "Former committee chair", chair_user_id: "inactive-user", notes: "Updated note" }],
      meetings: [],
    });
  });

  it("rejects a new invalid assignment even when other legacy assignments are unchanged", () => {
    const previous = {
      committees: [{ name: "Governance", chair: "Former chair" }],
    };

    expect(() => normalizeBoardCalendarMemberAssignments(
      { committees: [{ name: "Governance", chair: "External person" }] },
      members,
      previous,
    )).toThrow(/Committee 1 chair must be assigned to an active workspace member/i);
    expect(() => normalizeBoardCalendarMemberAssignments(
      { committees: [{ name: "New committee", chair: "Former chair" }] },
      members,
      previous,
    )).toThrow(/Committee 1 chair must be assigned to an active workspace member/i);
  });
});
