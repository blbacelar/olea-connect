import { Badge } from "@/components/ui/badge";

export function GrantPipelineStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "planning":
      return (
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
          Planning
        </Badge>
      );
    case "in_progress":
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
          In Progress
        </Badge>
      );
    case "applied":
      return (
        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
          Applied
        </Badge>
      );
    case "approved":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
          Approved
        </Badge>
      );
    case "declined":
      return (
        <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100">
          Declined
        </Badge>
      );
    default:
      return <Badge className="bg-slate-100 text-slate-800">{status}</Badge>;
  }
}
