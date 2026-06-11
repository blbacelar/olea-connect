"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { BrandPreview } from "@/components/BrandPreview";
import { LogoUpload } from "@/components/LogoUpload";
import { PublicHeader } from "@/components/auth/PublicHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegistration } from "@/hooks/use-registration";
import type { BrandProfile } from "@/lib/types";

export default function BrandSetupPage() {
  const router = useRouter();
  const { registration, updateRegistration } = useRegistration();
  const [organizationName, setOrganizationName] = useState(
    registration.organizationName || "JP Centre for Youth",
  );
  const [primaryColor, setPrimaryColor] = useState("#4A7C59");
  const [secondaryColor, setSecondaryColor] = useState("#2D5C3E");
  const [logoDataUrl, setLogoDataUrl] = useState<string | undefined>(
    registration.logoDataUrl,
  );

  const brand = useMemo<BrandProfile>(
    () => ({
      organizationName,
      logoInitials:
        organizationName
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((word) => word.charAt(0))
          .join("")
          .toUpperCase() || "OC",
      logoUrl: logoDataUrl,
      primaryColor,
      secondaryColor,
    }),
    [logoDataUrl, organizationName, primaryColor, secondaryColor],
  );

  const continueFlow = (complete: boolean) => {
    updateRegistration({
      organizationName,
      brandComplete: complete,
      logoDataUrl,
    });
    router.push(
      registration.tier === "seedling"
        ? "/onboarding/template-selection"
        : "/dashboard",
    );
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-7">
          <p className="text-sm font-semibold text-olea-green">
            Step 1 of {registration.tier === "seedling" ? "2" : "1"}
          </p>
          <h1 className="mt-1 text-3xl font-bold">Set up your brand</h1>
          <p className="mt-2 text-slate-500">
            Your logo and colours are applied automatically to every template.
          </p>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-2">
          <section className="rounded-[14px] border bg-white p-6 shadow-soft">
            <div className="space-y-2">
              <Label htmlFor="brandOrg">Organization name</Label>
              <Input
                id="brandOrg"
                value={organizationName}
                onChange={(event) => setOrganizationName(event.target.value)}
              />
            </div>

            <div className="mt-6 space-y-2">
              <Label>Logo</Label>
              <LogoUpload
                value={logoDataUrl}
                onChange={setLogoDataUrl}
                initials={brand.logoInitials}
                color={primaryColor}
              />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                {
                  id: "primary",
                  label: "Primary colour",
                  value: primaryColor,
                  setter: setPrimaryColor,
                },
                {
                  id: "secondary",
                  label: "Secondary colour",
                  value: secondaryColor,
                  setter: setSecondaryColor,
                },
              ].map((colour) => (
                <div key={colour.id}>
                  <Label htmlFor={colour.id}>{colour.label}</Label>
                  <div className="mt-2 flex h-11 items-center gap-2.5 rounded-md border px-2.5">
                    <input
                      id={colour.id}
                      type="color"
                      value={colour.value}
                      onChange={(event) => colour.setter(event.target.value)}
                      className="size-[30px] cursor-pointer border-0 bg-transparent p-0"
                    />
                    <input
                      value={colour.value}
                      onChange={(event) => colour.setter(event.target.value)}
                      className="min-w-0 flex-1 bg-transparent font-mono text-sm uppercase outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            <Button
              className="mt-7 w-full"
              disabled={!organizationName.trim()}
              onClick={() => continueFlow(true)}
            >
              Save brand and continue →
            </Button>
            <button
              onClick={() => continueFlow(false)}
              className="mt-4 w-full text-sm font-medium text-slate-500"
            >
              Skip for now — set up later
            </button>
          </section>

          <div className="lg:sticky lg:top-6">
            <BrandPreview brand={brand} />
          </div>
        </div>
      </main>
    </div>
  );
}
