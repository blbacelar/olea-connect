import { cn } from "@/lib/utils";

export function StepIndicator({
  current,
  total = 3,
}: {
  current: number;
  total?: number;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={cn(
            "h-2 rounded-full transition-all",
            index + 1 <= current
              ? "w-8 bg-olea-green"
              : "w-2 bg-slate-200",
          )}
        />
      ))}
    </div>
  );
}
