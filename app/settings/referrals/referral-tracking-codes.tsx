import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReferralLinkCopy } from "@/app/referrals/dashboard/referral-link-copy";
import type { ReferralAdminData } from "@/lib/data/referrals";
import { getAppUrl } from "@/lib/email/server";

export function ReferralTrackingCodes({ data }: { data: ReferralAdminData }) {
  if (data.trackingCodes.length === 0) return null;

  return (
    <section className="space-y-4 rounded-xl border bg-white p-5 shadow-soft">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Tracking-only codes</h2>
        <p className="mt-1 text-sm text-slate-600">
          These codes attribute signups. They do not create referral payouts.
        </p>
      </div>
      {data.trackingCodes.map((trackingCode) => {
        const url = new URL(`/ref/${trackingCode.code}`, getAppUrl()).toString();
        const signups = data.trackedSignups.filter(
          (signup) => signup.code === trackingCode.code,
        );
        return (
          <div key={trackingCode.code} className="space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-semibold text-slate-900">{trackingCode.label}</h3>
              <code className="text-sm text-slate-700">{trackingCode.code}</code>
              <Badge variant="outline">{trackingCode.active ? "Active" : "Inactive"}</Badge>
              <Button asChild size="sm" variant="outline">
                <a href={`/ref/${trackingCode.code}`} target="_blank" rel="noreferrer">
                  Open link <ExternalLink className="size-4" />
                </a>
              </Button>
            </div>
            <ReferralLinkCopy
              copy={{ copied: "Copied", copyLink: "Copy share link", copyFailed: "Copy failed. Select the link above and copy it manually." }}
              referralUrl={url}
            />
            <p className="text-sm font-medium text-slate-700">Recent signups</p>
            {signups.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="border-b text-xs uppercase tracking-wide text-slate-500">
                    <tr><th className="py-2">Organization</th><th className="py-2">Email</th><th className="py-2">Checkout status</th><th className="py-2">Date</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {signups.map((signup) => (
                      <tr key={signup.id}>
                        <td className="py-2 font-medium text-slate-800">{signup.organizationName}</td>
                        <td className="py-2 text-slate-600">{signup.email}</td>
                        <td className="py-2 text-slate-600">{signup.status.replaceAll("_", " ")}</td>
                        <td className="py-2 text-slate-600">{new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(new Date(signup.createdAt))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No signups with this code yet.</p>
            )}
          </div>
        );
      })}
    </section>
  );
}
