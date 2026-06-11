"use client";

import { createContext, useContext, type ReactNode } from "react";

import { mockSession } from "@/lib/mock-data";
import type { Session } from "@/lib/types";

const SessionContext = createContext<Session>(mockSession);

export function SessionProvider({ children }: { children: ReactNode }) {
  return (
    <SessionContext.Provider value={mockSession}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
