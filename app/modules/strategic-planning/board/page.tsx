import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getStrategicBoardData } from "@/lib/data/strategic-board";

import { SharedBoardDashboard } from "./shared-board-dashboard";

export const dynamic = "force-dynamic";

export default async function StrategicBoardPage() {
  const data = await getStrategicBoardData();
  return <main className="space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-olea-green">Strategic Planning</p>
        <h1 className="mt-1 text-3xl font-bold">Board dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">Quarterly reports shared with the board.</p></div>
      <Button asChild variant="outline"><Link href="/modules/strategic-planning">Back to Strategic Planning</Link></Button>
    </header>
    {!data.hasAccess ? <Card><CardContent className="p-5 text-sm">This dashboard is included with Canopy or an active add-on.</CardContent></Card> :
      <SharedBoardDashboard snapshots={data.snapshots} />}
  </main>;
}
