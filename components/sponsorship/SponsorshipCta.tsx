import { ArrowUpRight, CalendarDays, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  sponsorshipCalendlyUrl,
  sponsorshipContactEmail,
} from "@/lib/sponsorship-content";

type SponsorshipCtaProps = {
  children: React.ReactNode;
  className?: string;
  label?: string;
  fallbackLabel?: string;
  fallbackAria?: string;
  forceEmail?: boolean;
  variant?: "primary" | "outline";
};

export function SponsorshipCta({
  children,
  className,
  label,
  fallbackLabel,
  fallbackAria,
  forceEmail = false,
  variant = "primary",
}: SponsorshipCtaProps) {
  const opensCalendly = Boolean(sponsorshipCalendlyUrl) && !forceEmail;
  const href = opensCalendly ? sponsorshipCalendlyUrl : `mailto:${sponsorshipContactEmail}`;

  return (
    <Button
      asChild
      variant={variant === "primary" ? "default" : "outline"}
      className={className}
    >
      <a
        href={href}
        target={opensCalendly ? "_blank" : undefined}
        rel={opensCalendly ? "noreferrer" : undefined}
        aria-label={opensCalendly ? label : fallbackAria ?? fallbackLabel}
        data-testid="sponsorship-booking-cta"
      >
        {opensCalendly ? (
          <CalendarDays className="size-4" aria-hidden="true" />
        ) : (
          <Mail className="size-4" aria-hidden="true" />
        )}
        {opensCalendly ? children : fallbackLabel ?? children}
        {opensCalendly ? (
          <ArrowUpRight className="size-4" aria-hidden="true" />
        ) : null}
      </a>
    </Button>
  );
}
