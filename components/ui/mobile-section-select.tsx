"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useLocaleContext } from "@/components/i18n/LocaleProvider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { translateFrenchUiText } from "@/lib/i18n/french-runtime-translations";

type SectionOption = { value: string; label: string };

export function MobileSectionSelect({
  label = "Section",
  onValueChange,
  options,
  value,
  hideAt = "md",
  variant = "select",
}: {
  label?: string;
  onValueChange: (value: string) => void;
  options: readonly SectionOption[];
  value: string;
  hideAt?: "md" | "lg";
  variant?: "select" | "dialog";
}) {
  const { locale } = useLocaleContext();
  const [open, setOpen] = useState(false);
  const translate = (text: string) =>
    locale === "fr-CA" ? translateFrenchUiText(text) : text;
  const currentLabel = translate(options.find((option) => option.value === value)?.label ?? label);
  const responsiveClass = hideAt === "lg" ? "space-y-2 lg:hidden" : "space-y-2 md:hidden";

  if (variant === "dialog") return <div className={responsiveClass}>
    <Label>{translate(label)}</Label>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button type="button" variant="outline" className="min-h-11 w-full justify-between gap-3 bg-white text-left font-medium"
        aria-label={`${translate(label)}: ${currentLabel}`}>
        <span className="min-w-0 truncate">{currentLabel}</span><ChevronDown className="size-4 shrink-0" />
      </Button></DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader><DialogTitle>{translate(label)}</DialogTitle>
          <DialogDescription>{locale === "fr-CA" ? "Choisissez un module ou une vue du cahier." : "Choose a module or workbook view."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1" role="group" aria-label={translate(label)}>
          {options.map((option) => <Button key={option.value} type="button"
            variant={option.value === value ? "secondary" : "ghost"}
            className="min-h-11 w-full justify-between whitespace-normal text-left"
            aria-current={option.value === value ? "page" : undefined}
            onClick={() => { setOpen(false); onValueChange(option.value); }}>
            {translate(option.label)}{option.value === value ? <Check className="size-4 shrink-0" /> : null}
          </Button>)}
        </div>
      </DialogContent>
    </Dialog>
  </div>;

  return (
    <div className={responsiveClass}>
      <Label htmlFor="mobile-section-select">{translate(label)}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id="mobile-section-select" className="w-full bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {translate(option.label)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
