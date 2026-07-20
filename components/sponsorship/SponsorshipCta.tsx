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
  variant?: "primary" | "outline";
};

export function SponsorshipCta({
  children,
  className,
  label,
  variant = "primary",
}: SponsorshipCtaProps) {
  const href = sponsorshipCalendlyUrl || `mailto:${sponsorshipContactEmail}`;
  const opensCalendly = Boolean(sponsorshipCalendlyUrl);

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
        aria-label={label}
        data-testid="sponsorship-booking-cta"
      >
        {opensCalendly ? (
          <CalendarDays className="size-4" aria-hidden="true" />
        ) : (
          <Mail className="size-4" aria-hidden="true" />
        )}
        {children}
        {opensCalendly ? (
          <ArrowUpRight className="size-4" aria-hidden="true" />
        ) : null}
      </a>
    </Button>
  );
}
