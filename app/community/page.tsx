import {
  ArrowRight,
  CalendarDays,
  MessageSquareText,
  ShieldCheck,
  Users,
} from "lucide-react";

import { EmptyPanel } from "@/components/EmptyPanel";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeading } from "@/components/SectionHeading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCommunityHome } from "@/lib/data/community";

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function CommunityPage() {
  const community = await getCommunityHome();

  if (!community) {
    return (
      <div>
        <PageHeader
          title="Community"
          description="A private member space for nonprofit operators and board leaders."
        />
        <EmptyPanel
          title="Community is coming soon"
          description="The Olea Connects community has not been seeded in this environment yet."
          icon={<MessageSquareText className="size-5" />}
        />
      </div>
    );
  }

  const featuredPosts = community.posts.slice(0, 3);

  return (
    <div>
      <PageHeader
        title="Community"
        description={
          community.description ??
          "A private member space for nonprofit operators and board leaders."
        }
        action={
          community.canManage ? (
            <Badge className="rounded-full bg-olea-light px-3 py-1 text-olea-green hover:bg-olea-light">
              <ShieldCheck className="mr-1.5 size-3.5" />
              Community manager
            </Badge>
          ) : null
        }
      />

      <section className="mb-7 overflow-hidden rounded-[14px] border bg-white shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-[#FAFBFA] px-[22px] py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-olea-green">
              Native Olea community
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              {community.name}
            </h2>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">
            <Users className="size-4 text-olea-green" />
            Included with your membership
          </span>
        </div>

        <div className="grid gap-0 lg:grid-cols-[280px_1fr]">
          <aside className="border-b bg-slate-50/70 p-4 lg:border-b-0 lg:border-r">
            <p className="px-2.5 pb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">
              Spaces
            </p>
            <div className="space-y-1">
              {community.spaces.map((space) => (
                <div
                  key={space.id}
                  className="rounded-lg px-3 py-2.5 text-sm text-slate-700"
                >
                  <span className="font-semibold"># {space.name}</span>
                  {space.description ? (
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                      {space.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </aside>

          <div className="p-5 md:p-6">
            <SectionHeading
              action={
                <Button disabled variant="outline" size="sm">
                  Create post
                </Button>
              }
            >
              Featured conversations
            </SectionHeading>

            {featuredPosts.length ? (
              <div className="space-y-3">
                {featuredPosts.map((post) => (
                  <article
                    key={post.id}
                    className="rounded-xl border border-slate-100 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {post.kind}
                      </Badge>
                      {post.pinnedAt ? (
                        <Badge className="bg-olea-light text-olea-green hover:bg-olea-light">
                          Pinned
                        </Badge>
                      ) : null}
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-slate-900">
                      {post.title}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                      {post.body}
                    </p>
                    {post.resourceUrl ? (
                      <a
                        href={post.resourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-olea-green"
                      >
                        Open resource
                        <ArrowRight className="size-3.5" />
                      </a>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <EmptyPanel
                title="Conversations are coming soon"
                description="Community managers will be able to create announcements, resources, and discussion posts here."
                icon={<MessageSquareText className="size-5" />}
              />
            )}
          </div>
        </div>
      </section>

      <section>
        <SectionHeading>Upcoming community events</SectionHeading>
        {community.events.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {community.events.map((event) => (
              <article
                key={event.id}
                className="rounded-[14px] border bg-white p-5 shadow-soft"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-olea-light text-olea-green">
                  <CalendarDays className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {event.title}
                </h3>
                <p className="mt-1 text-[13px] text-slate-500">
                  {formatEventDate(event.startsAt)} · {event.timezone}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {event.summary}
                </p>
                {event.zoomUrl ? (
                  <Button asChild className="mt-4" size="sm">
                    <a href={event.zoomUrl} target="_blank" rel="noreferrer">
                      Join on Zoom
                    </a>
                  </Button>
                ) : (
                  <Badge variant="outline" className="mt-4">
                    Zoom link coming soon
                  </Badge>
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyPanel
            title="No community events scheduled"
            description="Live calls and webinars can be added with Zoom links once the manager workflow is ready."
            icon={<CalendarDays className="size-5" />}
          />
        )}
      </section>
    </div>
  );
}
