import { Gift } from "lucide-react";

import { EmptyPanel } from "@/components/EmptyPanel";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeading } from "@/components/SectionHeading";
import { getGrantsData } from "@/lib/data/grants";

import { AdminBoard } from "./grant-admin-board";
import { ApplicationForm } from "./grant-application-form";
import { ApplicationHistory } from "./grant-application-history";
import { RoundHero } from "./grant-round-hero";

export default async function GrantsPage() {
  const {
    adminApplications,
    applications,
    canAdministerGrants,
    organizationDefaults,
    rounds,
  } = await getGrantsData();
  const featuredRound =
    rounds.find((round) => round.status === "open") ?? rounds[0];
  const openRounds = rounds.filter((round) => round.status === "open");

  return (
    <div>
      <PageHeader
        title="Olea Gives Fund"
        description="Apply for sponsor-funded grants and track decisions from one trusted workspace."
      />

      {featuredRound ? (
        <RoundHero round={featuredRound} />
      ) : (
        <div className="mb-7">
          <EmptyPanel
            title="No grant round is available"
            description="Upcoming Olea Gives rounds will appear here when applications open."
            icon={<Gift className="size-5" />}
          />
        </div>
      )}

      <SectionHeading>Active rounds</SectionHeading>
      {openRounds.length ? (
        <div className="mb-7 grid gap-5">
          {openRounds.map((round) => (
            <ApplicationForm
              application={applications.find(
                (application) => application.roundId === round.id,
              )}
              defaults={organizationDefaults}
              key={round.id}
              round={round}
            />
          ))}
        </div>
      ) : (
        <div className="mb-7">
          <EmptyPanel
            title="No open applications"
            description="You can review upcoming rounds and return when the application window opens."
            icon={<Gift className="size-5" />}
          />
        </div>
      )}

      <SectionHeading>Your application history</SectionHeading>
      <ApplicationHistory applications={applications} />

      {canAdministerGrants ? (
        <AdminBoard applications={adminApplications} />
      ) : null}
    </div>
  );
}
