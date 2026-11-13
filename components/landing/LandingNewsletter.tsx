"use client";

import { ArrowRight, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/lib/i18n/locales";

const copy = {
  "en-CA": {
    eyebrow: "Stay connected",
    title: "Get Olive's quarterly newsletter",
    email: "Email address",
    placeholder: "you@organization.ca",
    hint: "Use an address like name@organization.ca.",
    consent: "I agree to receive the Olive Social Impact newsletter. I can unsubscribe at any time.",
    submit: "Subscribe",
    sending: "Subscribing…",
    success: "You're subscribed. Look for our next quarterly update.",
    invalid: "Enter a valid email address and agree to receive the newsletter.",
    error: "We could not subscribe you right now. Please try again.",
  },
  "fr-CA": {
    eyebrow: "Restons en contact",
    title: "Recevez le bulletin trimestriel d'Olive",
    email: "Adresse courriel",
    placeholder: "vous@organisme.ca",
    hint: "Utilisez une adresse comme nom@organisme.ca.",
    consent: "J'accepte de recevoir le bulletin d'Olive Social Impact. Je peux me désabonner en tout temps.",
    submit: "S'abonner",
    sending: "Abonnement en cours…",
    success: "Votre abonnement est confirmé. À bientôt dans notre prochain bulletin.",
    invalid: "Entrez une adresse courriel valide et acceptez de recevoir le bulletin.",
    error: "Impossible de vous abonner pour le moment. Veuillez réessayer.",
  },
} as const;

export function LandingNewsletter({ locale }: { locale: Locale }) {
  const text = copy[locale];
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !consent) {
      setStatus("error");
      return;
    }
    setStatus("sending");
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), consent, website: "" }),
      });
      if (!response.ok) throw new Error("newsletter request failed");
      setStatus("success");
      setEmail("");
      setConsent(false);
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="border-b border-olea-green/20 bg-olea-light/30 px-4 py-5" aria-labelledby="newsletter-title">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[1fr_1.6fr] lg:items-center">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-olea-green"><Mail className="size-4" aria-hidden="true" />{text.eyebrow}</p>
          <h2 id="newsletter-title" className="mt-1 text-lg font-semibold text-slate-900">{text.title}</h2>
        </div>
        <form onSubmit={submit} className="space-y-2" noValidate>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input type="email" autoComplete="email" inputMode="email" aria-label={text.email} aria-describedby="newsletter-hint newsletter-status" aria-invalid={status === "error" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())} placeholder={text.placeholder} value={email} onChange={(event) => { setEmail(event.target.value); if (status === "error") setStatus("idle"); }} required maxLength={254} disabled={status === "sending" || status === "success"} className="h-11 bg-white" />
            <Button type="submit" disabled={status === "sending" || status === "success"} className="h-11 shrink-0">{status === "sending" ? text.sending : text.submit}<ArrowRight className="ml-2 size-4" aria-hidden="true" /></Button>
          </div>
          <p id="newsletter-hint" className="text-xs text-slate-600">{text.hint}</p>
          <label className="flex items-start gap-2 text-xs leading-5 text-slate-600"><Checkbox checked={consent} onChange={(event) => { setConsent(event.target.checked); if (status === "error") setStatus("idle"); }} required disabled={status === "sending" || status === "success"} aria-label={text.consent} className="mt-0.5" /><span>{text.consent}</span></label>
          <p id="newsletter-status" role="status" aria-live="polite" className={`text-xs ${status === "error" ? "text-red-700" : "text-teal-800"}`}>{status === "success" ? text.success : status === "error" ? (!consent || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? text.invalid : text.error) : ""}</p>
        </form>
      </div>
    </section>
  );
}
