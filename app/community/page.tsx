import { MessageSquareText } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";

const channels = [
  "Welcome & Introductions",
  "Governance Questions",
  "Grants & Funding",
  "Wins & Shoutouts",
  "Resource Sharing",
];

export default function CommunityPage() {
  return (
    <div>
      <PageHeader
        title="Community"
        description="Connect with nonprofit leaders across the country. You're already signed in."
      />
      <div className="overflow-hidden rounded-[14px] border bg-white shadow-soft">
        <div className="flex items-center gap-2.5 border-b bg-[#FAFBFA] px-[22px] py-4 text-[13.5px] font-medium text-slate-500">
          <span className="size-[9px] rounded-full bg-olea-green" />
          Connected via single sign-on · powered by Circle
        </div>
        <div className="grid min-h-[390px] md:grid-cols-[240px_1fr]">
          <aside className="border-r bg-slate-50/60 p-4">
            <p className="px-2.5 pb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">
              Channels
            </p>
            {channels.map((channel) => (
              <div
                key={channel}
                className="rounded-lg px-3 py-2.5 text-sm text-slate-600 hover:bg-white"
              >
                # {channel}
              </div>
            ))}
          </aside>
          <div className="grid place-items-center p-8 text-center">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-xl bg-olea-light text-olea-green">
                <MessageSquareText className="size-6" />
              </span>
              <h2 className="mt-4 text-[15px] font-semibold text-slate-600">
                Open Olea Connects on Circle
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-6 text-slate-400">
                Active members are passed through with single sign-on and the
                right tier access.
              </p>
              <Link
                href="/api/circle-sso"
                prefetch={false}
                className="mt-5 inline-flex h-10 items-center rounded-full bg-black px-5 text-[13px] font-semibold text-white"
              >
                Continue to community
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
