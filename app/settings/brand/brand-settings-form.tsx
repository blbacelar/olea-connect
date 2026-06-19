"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { BrandPreview } from "@/components/BrandPreview";
import { LogoUpload } from "@/components/LogoUpload";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BrandProfile } from "@/lib/types";

import { saveBrandProfile } from "./actions";
export function BrandSettingsForm({
  initialBrand,
}: {
  initialBrand: BrandProfile;
}) {
  const router = useRouter();
  const [brand, setBrand] = useState(initialBrand);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const updateBrand = (field: keyof BrandProfile, value: string) => {
    setSaved(false);
    setBrand((current) => ({ ...current, [field]: value }));
  };

  const handleSave = () => {
    startTransition(async () => {
      setBrand(await saveBrandProfile(brand));
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <div>
      <PageHeader
        title="Brand profile"
        description="Your logo and colors flow into every document you download — automatically."
      />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="rounded-[14px] border bg-white p-6 shadow-soft md:p-[26px]">
          <div className="space-y-2">
            <Label htmlFor="organizationName">Organization name</Label>
            <Input
              id="organizationName"
              value={brand.organizationName}
              onChange={(event) =>
                updateBrand("organizationName", event.target.value)
              }
            />
          </div>

          <div className="mt-6 space-y-2">
            <Label>Logo</Label>
            <LogoUpload
              value={brand.logoUrl}
              onChange={(value) => updateBrand("logoUrl", value ?? "")}
              initials={brand.logoInitials}
              color={brand.primaryColor}
            />
          </div>

          <div className="mt-6 grid gap-[18px] sm:grid-cols-2">
            {(
              [
                ["primaryColor", "Primary color"],
                ["secondaryColor", "Secondary color"],
              ] as const
            ).map(([field, label]) => (
              <div key={field}>
                <Label htmlFor={field}>{label}</Label>
                <div className="mt-2 flex h-11 items-center gap-2.5 rounded-md border border-input px-2.5">
                  <input
                    id={field}
                    type="color"
                    value={brand[field]}
                    onChange={(event) => updateBrand(field, event.target.value)}
                    className="size-[30px] cursor-pointer border-0 bg-transparent p-0"
                  />
                  <input
                    aria-label={`${label} hex value`}
                    value={brand[field]}
                    onChange={(event) => updateBrand(field, event.target.value)}
                    className="min-w-0 flex-1 bg-transparent font-mono text-[13.5px] uppercase outline-none"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-2 border-t border-slate-100 pt-5">
            <Label htmlFor="address">Footer address</Label>
            <Textarea
              id="address"
              value={brand.address ?? ""}
              onChange={(event) => updateBrand("address", event.target.value)}
              placeholder="123 Main Street, Calgary, AB"
            />
            <p className="text-xs leading-5 text-slate-400">
              Appears in the footer of future PDF exports.
            </p>
          </div>

          <div className="mt-5 grid gap-[18px] sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Footer phone</Label>
              <Input
                id="phone"
                value={brand.phone ?? ""}
                onChange={(event) => updateBrand("phone", event.target.value)}
                placeholder="+1 555 123 4567"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Footer email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={brand.contactEmail ?? ""}
                onChange={(event) =>
                  updateBrand("contactEmail", event.target.value)
                }
                placeholder="hello@example.org"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="website">Footer website</Label>
              <Input
                id="website"
                value={brand.website ?? ""}
                onChange={(event) => updateBrand("website", event.target.value)}
                placeholder="https://example.org"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3 border-t border-slate-100 pt-5">
            <Button onClick={handleSave} disabled={isPending}>
              {saved ? <Check className="size-4" /> : null}
              {isPending ? "Saving..." : saved ? "Changes saved" : "Save changes"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setBrand(initialBrand);
                setSaved(false);
              }}
            >
              Discard
            </Button>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-400">
            Changing your brand affects future downloads only. Past PDFs are
            not updated.
          </p>
        </div>

        <div className="lg:sticky lg:top-0">
          <BrandPreview brand={brand} />
        </div>
      </div>
    </div>
  );
}
