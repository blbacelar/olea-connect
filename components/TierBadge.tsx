import { Leaf, Trees } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { Tier } from "@/lib/types";
import { cn } from "@/lib/utils";

const tierStyles: Record<Tier, string> = {
  seedling: "border-transparent bg-lime-100 text-lime-800",
  roots: "border-transparent bg-green-100 text-green-800",
  canopy: "border-transparent bg-emerald-100 text-emerald-800",
  harvest: "border-transparent bg-orange-50 text-orange-800",
};

export function TierBadge({
  tier,
  className,
}: {
  tier: Tier;
  className?: string;
}) {
  const Icon = tier === "roots" ? Leaf : Trees;
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 capitalize", tierStyles[tier], className)}
    >
      <Icon className="size-3.5" />
      {tier}
    </Badge>
  );
}
