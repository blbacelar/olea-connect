"use client";

import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  replayIntegrationEvent,
  type ReplayIntegrationEventState,
} from "./actions";

const initialState: ReplayIntegrationEventState = {
  message: "",
  status: "idle",
};

function ReplayButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} size="sm" type="submit" variant="outline">
      {pending ? "Queueing..." : "Replay"}
    </Button>
  );
}

export function ReplayIntegrationEventForm({ eventId }: { eventId: string }) {
  const [state, formAction] = useFormState(
    replayIntegrationEvent,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-2">
      <input name="eventId" type="hidden" value={eventId} />
      <ReplayButton />
      {state.message ? (
        <p
          className={
            state.status === "success"
              ? "text-xs font-semibold text-olea-green"
              : "text-xs font-semibold text-red-600"
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
