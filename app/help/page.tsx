import { CircleHelp } from "lucide-react";

import { FeaturePlaceholder } from "@/components/FeaturePlaceholder";

export default function HelpPage() {
  return (
    <FeaturePlaceholder
      title="Help"
      description="Guides, answers, and a real person when you need one."
      icon={CircleHelp}
    />
  );
}
