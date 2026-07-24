"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { BrandPreview } from "@/components/BrandPreview";
import { LogoUpload } from "@/components/LogoUpload";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRegistration } from "@/hooks/use-registration";
import { useSession } from "@/hooks/use-session";
import type { BrandProfile } from "@/lib/types";
import { saveBrandProfile } from "@/app/settings/brand/actions";

export default function BrandSetupPage() {
  const router = useRouter();
  const session = useSession();
  const { registration, updateRegistration } = useRegistration();
  const [organizationName, setOrganizationName] = useState(
    session?.organization.brand.organizationName ||
      registration.organizationName ||
      "",
  );
  const [primaryColor, setPrimaryColor] = useState(
    session?.organization.brand.primaryColor ?? "#446B52",
  );
  const [secondaryColor, setSecondaryColor] = useState(
    session?.organization.brand.secondaryColor ?? "#F4EFE4",
  );
  const [logoUrl, setLogoUrl] = useState<string | undefined>(
    session?.organization.brand.logoUrl,
  );
  const [logoPath, setLogoPath] = useState<string | undefined>(
    session?.organization.brand.logoPath,
  );
  const [address, setAddress] = useState(session?.organization.brand.address ?? "");
  const [phone, setPhone] = useState(session?.organization.brand.phone ?? "");
  const [contactEmail, setContactEmail] = useState(
    session?.organization.brand.contactEmail ?? session?.member.email ?? "",
  );
  const [website, setWebsite] = useState(session?.organization.brand.website ?? "");
  const [error, setError] = useState("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isPending, startTransition] = useTransition();

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
      logoUrl,
      logoPath,
      primaryColor,
      secondaryColor,
      address,
      phone,
      contactEmail,
      website,
    }),
    [
      address,
      contactEmail,
      logoPath,
      logoUrl,
      organizationName,
      phone,
      primaryColor,
      secondaryColor,
      website,
    ],
  );

  const updateLogo = (logo?: { path: string; signedUrl?: string }) => {
    setLogoPath(logo?.path);
    setLogoUrl(logo?.signedUrl);
  };

  const continueFlow = (complete: boolean) => {
    startTransition(async () => {
      try {
        if (complete) await saveBrandProfile(brand);
        updateRegistration({
          organizationName,
          brandComplete: complete,
        });
        router.push(
          (session?.organization.tier ?? registration.tier) === "seedling"
            ? "/onboarding/template-selection"
            : "/dashboard",
        );
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : "Unable to save your brand profile.",
        );
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <OnboardingHeader />
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
                value={logoUrl}
                onChange={updateLogo}
                onUploadingChange={setIsUploadingLogo}
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

            <div className="mt-6 space-y-2 border-t border-slate-100 pt-5">
              <Label htmlFor="brandAddress">Footer address</Label>
              <Textarea
                id="brandAddress"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="123 Main Street, Calgary, AB"
              />
              <p className="text-xs leading-5 text-slate-400">
                Used in the footer of future PDF exports.
              </p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="brandPhone">Footer phone</Label>
                <Input
                  id="brandPhone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+1 555 123 4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brandContactEmail">Footer email</Label>
                <Input
                  id="brandContactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  placeholder="hello@example.org"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="brandWebsite">Footer website</Label>
                <Input
                  id="brandWebsite"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  placeholder="https://example.org"
                />
              </div>
            </div>

            <Button
              className="mt-7 w-full"
              disabled={!organizationName.trim() || isPending || isUploadingLogo}
              onClick={() => continueFlow(true)}
            >
              {isUploadingLogo
                ? "Uploading logo..."
                : isPending
                  ? "Saving..."
                  : "Save brand and continue →"}
            </Button>
            <button
              onClick={() => continueFlow(false)}
              disabled={isPending || isUploadingLogo}
              className="mt-4 w-full text-sm font-medium text-slate-500"
            >
              Skip for now — set up later
            </button>
            {error ? (
              <p role="alert" className="mt-4 text-sm font-medium text-red-600">
                {error}
              </p>
            ) : null}
          </section>

          <div className="lg:sticky lg:top-6">
            <BrandPreview brand={brand} />
          </div>
        </div>
      </main>
    </div>
  );
}
