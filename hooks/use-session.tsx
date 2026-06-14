"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { mockSession } from "@/lib/mock-data";
import type { Session } from "@/lib/types";
import { createClient } from "@/utils/supabase/client";

const SessionContext = createContext<Session>(mockSession);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [authIdentity, setAuthIdentity] = useState<{
    email?: string;
    fullName?: string;
  }>({});

  useEffect(() => {
    const supabase = createClient();

    void supabase.auth.getUser().then(({ data }) => {
      setAuthIdentity({
        email: data.user?.email,
        fullName: data.user?.user_metadata.full_name,
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthIdentity({
        email: session?.user.email,
        fullName: session?.user.user_metadata.full_name,
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  const session = useMemo<Session>(() => {
    const fullName = authIdentity.fullName?.trim();
    return {
      ...mockSession,
      member: {
        ...mockSession.member,
        name: fullName || mockSession.member.name,
        firstName: fullName?.split(/\s+/)[0] || mockSession.member.firstName,
        email: authIdentity.email || mockSession.member.email,
      },
    };
  }, [authIdentity]);

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
