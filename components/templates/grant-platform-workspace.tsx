import { ArrowRight, BarChart3, BookOpen, CircleCheckBig, FileText, Settings2, Sparkles, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildGrantPlatformTemplate } from "@/lib/templates/grant-platform";

export function GrantPlatformWorkspace() {
  const template = buildGrantPlatformTemplate();

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-olea-green/20 bg-gradient-to-br from-olea-green/10 via-white to-olea-light p-6 shadow-soft">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-olea-green">
              Grant management workspace
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">
              {template.name}
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {template.summary}
            </p>
          </div>
          <Button className="w-fit">
            Review workspace
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Active grants", value: "12", icon: FileText },
          { label: "Upcoming deadlines", value: "5", icon: Sparkles },
          { label: "Collaboration threads", value: "18", icon: Users },
          { label: "Board-ready reports", value: "4", icon: BarChart3 },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="shadow-soft">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="grid size-10 place-items-center rounded-xl bg-olea-light text-olea-green">
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-900">{item.value}</p>
                  <p className="text-sm text-slate-500">{item.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {template.sections.map((section) => {
          const icon =
            section.id === "dashboard"
              ? FileText
              : section.id === "pipeline"
                ? Users
                : section.id === "coaching"
                  ? BookOpen
                  : section.id === "reports"
                    ? BarChart3
                    : Settings2;
          const Icon = icon;

          return (
            <Card key={section.id} className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className="grid size-8 place-items-center rounded-lg bg-olea-light text-olea-green">
                    <Icon className="size-4" />
                  </span>
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm leading-6 text-slate-600">{section.description}</p>
                <ul className="space-y-2">
                  {section.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-2 text-sm text-slate-600">
                      <CircleCheckBig className="mt-0.5 size-4 shrink-0 text-olea-green" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
