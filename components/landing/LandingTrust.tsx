import { Accessibility, BadgeCheck, Globe2, HandHeart } from "lucide-react";

const signals = [
  {
    icon: BadgeCheck,
    value: "Every tier",
    label: "includes the full peer community",
  },
  {
    icon: HandHeart,
    value: "Up to 33%",
    label: "of sponsorship fees flow to Olea Gives",
  },
  {
    icon: Globe2,
    value: "English + French",
    label: "core governance resources",
  },
  {
    icon: Accessibility,
    value: "WCAG 2.1 AA",
    label: "accessibility standard",
  },
];

export function LandingTrust() {
  return (
    <section className="border-y bg-white px-4 py-16">
      <div className="mx-auto max-w-7xl">
        <p className="text-center text-sm font-semibold text-slate-500">
          An independent Canadian social enterprise built around nonprofit
          capacity, inclusion, and belonging.
        </p>
        <div className="mt-9 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {signals.map((signal) => {
            const Icon = signal.icon;
            return (
              <div key={signal.value} className="text-center">
                <Icon className="mx-auto size-5 text-olea-green" />
                <p className="mt-3 text-2xl font-extrabold text-slate-900">
                  {signal.value}
                </p>
                <p className="mt-1 text-sm text-slate-500">{signal.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
