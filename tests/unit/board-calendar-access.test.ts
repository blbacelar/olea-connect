import { describe, expect, it } from "vitest";

import {
  canEditBoardCalendarDocuments,
  canManageBoardCalendar,
  canViewBoardCalendarMeetingsAndWorkflows,
  effectiveBoardCalendarRole,
  isValidBoardCalendarInvitationRole,
  canUpdateBoardCalendarTaskStatus,
} from "@/lib/board-calendar/access";
import { isTaskStatusOnlyChange } from "@/lib/board-calendar/task-status-access";

describe("Board Calendar roles", () => {
  it("keeps global organization administrators in full control", () => {
    expect(effectiveBoardCalendarRole({ membershipRole: "owner", boardCalendarRole: "member" })).toBe("administrator");
    expect(effectiveBoardCalendarRole({ membershipRole: "admin", boardCalendarRole: "chair" })).toBe("administrator");
    expect(canManageBoardCalendar("administrator")).toBe(true);
  });

  it("defaults existing members to Board Member and separates view from write capabilities", () => {
    expect(effectiveBoardCalendarRole({ membershipRole: "member" })).toBe("member");
    expect(canViewBoardCalendarMeetingsAndWorkflows("member")).toBe(false);
    expect(canViewBoardCalendarMeetingsAndWorkflows("executive")).toBe(true);
    expect(canEditBoardCalendarDocuments("executive")).toBe(false);
    expect(canUpdateBoardCalendarTaskStatus("executive")).toBe(true);
    expect(canEditBoardCalendarDocuments("chair")).toBe(true);
    expect(canManageBoardCalendar("chair")).toBe(false);
  });

  it("allows an executive to advance status but rejects task or calendar edits", () => {
    const before = { meetings: [{ id: "meeting-1", title: "Board" }], tasks: [{ id: "task-1", task: "Send agenda", status: "Not Started", responsible: "ED" }] };
    expect(isTaskStatusOnlyChange(before, { ...before, tasks: [{ ...before.tasks[0], status: "In Progress" }] })).toBe(true);
    expect(isTaskStatusOnlyChange(before, { ...before, tasks: [{ ...before.tasks[0], task: "Delete agenda" }] })).toBe(false);
    expect(isTaskStatusOnlyChange(before, { ...before, meetings: [] })).toBe(false);
    expect(isTaskStatusOnlyChange(before, { ...before, tasks: [{ ...before.tasks[0], status: "Invalid" }] })).toBe(false);
  });

  it("preserves untouched legacy and generated statuses while updating one task", () => {
    const before = { tasks: [
      { id: "generated", task: "Prepare agenda", status: "" },
      { id: "legacy", task: "Await approval", status: "Blocked" },
      { id: "manual", task: "Send minutes", status: "Not Started" },
    ] };
    expect(isTaskStatusOnlyChange(before, { ...before, tasks: [
      before.tasks[0], before.tasks[1], { ...before.tasks[2], status: "In Progress" },
    ] })).toBe(true);
    expect(isTaskStatusOnlyChange(before, { ...before, tasks: [
      { ...before.tasks[0], status: "Blocked" }, before.tasks[1], before.tasks[2],
    ] })).toBe(false);
  });

  it("rejects invitation roles that overstate or reduce global administrator access", () => {
    expect(isValidBoardCalendarInvitationRole("admin", "administrator")).toBe(true);
    expect(isValidBoardCalendarInvitationRole("admin", "chair")).toBe(false);
    expect(isValidBoardCalendarInvitationRole("member", "administrator")).toBe(false);
    expect(isValidBoardCalendarInvitationRole("member", "chair")).toBe(true);
  });
});
