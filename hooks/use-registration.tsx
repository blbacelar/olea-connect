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
  billingCycle: "annual",
  organizationName: "",
  fullName: "",
  email: "",
  password: "",
  province: "AB",
  organizationKind: "",
  annualBudgetRange: "",
  boardSizeRange: "",
  phone: "",
  acquisitionSource: "",
  referralCode: "",
  consents: {
    terms: false,
    privacy: false,
    dataOwnership: false,
    confidentiality: false,
  },
  emailVerified: false,
  brandComplete: false,
  selectedTemplateIds: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeStoredRegistration(stored: unknown): RegistrationState {
  if (!isRecord(stored)) return initialState;

  const candidate = stored as Partial<RegistrationState>;
  const billingCycle =
    candidate.billingCycle === "annual" ? "annual" : "quarterly";
  const storedConsents: Record<string, unknown> = isRecord(candidate.consents)
    ? candidate.consents
    : {};

  return {
    ...initialState,
    ...candidate,
    billingCycle,
    consents: {
      terms: storedConsents.terms === true,
      privacy: storedConsents.privacy === true,
      dataOwnership: storedConsents.dataOwnership === true,
      confidentiality: storedConsents.confidentiality === true,
    },
  };
}

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
      try {
        setRegistration(normalizeStoredRegistration(JSON.parse(stored)));
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
        setRegistration(initialState);
      }
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
