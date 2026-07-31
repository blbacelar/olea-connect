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
});
