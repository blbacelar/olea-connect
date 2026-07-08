"use server";

import { revalidatePath } from "next/cache";

import { requireIntegrationAdmin } from "@/lib/data/integration-events";

export type ReplayIntegrationEventState = {
  message: string;
  status: "error" | "idle" | "success";
};

const initialReplayState: ReplayIntegrationEventState = {
  message: "",
  status: "idle",
};

function getReplayErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "We could not replay this integration event.";
}

export async function replayIntegrationEvent(
  _previousState: ReplayIntegrationEventState = initialReplayState,
  formData: FormData,
): Promise<ReplayIntegrationEventState> {
  try {
    const eventId = String(formData.get("eventId") ?? "").trim();
    if (!eventId) throw new Error("Choose an integration event to replay.");

    const { admin } = await requireIntegrationAdmin();
    const { data, error } = await admin.rpc("replay_integration_event", {
      target_event_id: eventId,
    });

    if (error) throw error;
    if (!data) {
      return {
        message: "Only failed or dead-letter events can be replayed.",
        status: "error",
      };
    }

    revalidatePath("/settings/integrations");
    return {
      message: "Integration event queued for replay.",
      status: "success",
    };
  } catch (error) {
    return {
      message: getReplayErrorMessage(error),
      status: "error",
    };
  }
}
