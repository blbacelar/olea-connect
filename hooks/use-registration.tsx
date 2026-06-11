"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { RegistrationState } from "@/lib/types";

const STORAGE_KEY = "olea-registration-demo";

const initialState: RegistrationState = {
  tier: "roots",
  billingCycle: "monthly",
  organizationName: "",
  fullName: "",
  email: "",
  password: "",
  province: "AB",
  emailVerified: false,
  brandComplete: false,
  selectedTemplateIds: [],
};

interface RegistrationContextValue {
  registration: RegistrationState;
  hydrated: boolean;
  updateRegistration: (updates: Partial<RegistrationState>) => void;
  resetRegistration: () => void;
}

const RegistrationContext = createContext<RegistrationContextValue | null>(
  null,
);

export function RegistrationProvider({ children }: { children: ReactNode }) {
  const [registration, setRegistration] =
    useState<RegistrationState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setRegistration({ ...initialState, ...JSON.parse(stored) });
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...registration, password: "" }),
    );
  }, [hydrated, registration]);

  const updateRegistration = useCallback((updates: Partial<RegistrationState>) => {
    setRegistration((current) => ({ ...current, ...updates }));
  }, []);

  const resetRegistration = useCallback(() => setRegistration(initialState), []);

  return (
    <RegistrationContext.Provider
      value={{
        registration,
        hydrated,
        updateRegistration,
        resetRegistration,
      }}
    >
      {children}
    </RegistrationContext.Provider>
  );
}

export function useRegistration() {
  const context = useContext(RegistrationContext);
  if (!context) {
    throw new Error("useRegistration must be used inside RegistrationProvider");
  }
  return context;
}
