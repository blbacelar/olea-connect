"use server";

import { z } from "zod";

import { requireMemberContext } from "@/lib/data/member-context";
import { buildBoardPackageMeetings } from "@/lib/template-renderer/board-calendar-packages";
import type { TemplateFormData } from "@/lib/template-renderer/types";
import { createAdminClient } from "@/utils/supabase/admin";

const calendarSchema = z.string().uuid();
const responseSchema = z.object({
  templateInstanceId: calendarSchema,
  meetingId: z.string().min(1).max(200),
  response: z.enum(["attending", "not_attending", "maybe"]),
});

async function context(templateInstanceId: string) {
  const { member, organization } = await requireMemberContext();
  const { data: instance, error } = await createAdminClient().from("template_instances")
    .select("form_data,resources!inner(slug)")
    .eq("id", templateInstanceId).eq("organization_id", organization.id)
    .eq("resources.slug", "board-calendar-operational-workflow").single();
  if (error || !instance) throw new Error("This board calendar is unavailable.");
  return { member, organization, meetings: buildBoardPackageMeetings(instance.form_data as TemplateFormData) };
}

export async function getBoardCalendarRsvps(templateInstanceId: string) {
  const id = calendarSchema.parse(templateInstanceId);
  const { member, organization, meetings } = await context(id);
  const { data, error } = await createAdminClient().from("board_calendar_rsvps")
    .select("meeting_id,user_id,response")
    .eq("organization_id", organization.id).eq("template_instance_id", id);
  if (error) throw error;
  return meetings.map((meeting) => {
    const rows = (data ?? []).filter((row) => row.meeting_id === meeting.id);
    const mine = rows.find((row) => row.user_id === member.id)?.response ?? null;
    return {
      meetingId: meeting.id, title: meeting.title, date: meeting.date, time: meeting.time,
      mine: mine === "tentative" ? "maybe" : mine,
      attending: rows.filter((row) => row.response === "attending").length,
      maybe: rows.filter((row) => row.response === "tentative").length,
      notAttending: rows.filter((row) => row.response === "not_attending").length,
    };
  });
}

export async function getBoardCalendarRsvpRoster(templateInstanceId: string, meetingId: string) {
  const id = calendarSchema.parse(templateInstanceId);
  const targetMeetingId = z.string().min(1).max(200).parse(meetingId);
  const { member, organization, meetings } = await context(id);
  if (member.membershipRole === "member") throw new Error("Only an organization administrator can view the RSVP roster.");
  if (!meetings.some((meeting) => meeting.id === targetMeetingId)) {
    throw new Error("This meeting is no longer in the board calendar.");
  }
  const { data, error } = await createAdminClient().from("board_calendar_rsvps")
    .select("user_id,response")
    .eq("organization_id", organization.id).eq("template_instance_id", id)
    .eq("meeting_id", targetMeetingId);
  if (error) throw error;
  return (data ?? []).map((row) => ({ userId: row.user_id, response: row.response }));
}

export async function saveBoardCalendarRsvp(input: z.infer<typeof responseSchema>) {
  const parsed = responseSchema.parse(input);
  const { member, organization, meetings } = await context(parsed.templateInstanceId);
  if (!meetings.some((meeting) => meeting.id === parsed.meetingId)) {
    throw new Error("This meeting is no longer in the board calendar.");
  }
  const { error } = await createAdminClient().from("board_calendar_rsvps").upsert({
    organization_id: organization.id,
    template_instance_id: parsed.templateInstanceId,
    meeting_id: parsed.meetingId,
    user_id: member.id,
    response: parsed.response === "maybe" ? "tentative" : parsed.response,
    responded_at: new Date().toISOString(),
  }, { onConflict: "template_instance_id,meeting_id,user_id" });
  if (error) throw error;
  return getBoardCalendarRsvps(parsed.templateInstanceId);
}
