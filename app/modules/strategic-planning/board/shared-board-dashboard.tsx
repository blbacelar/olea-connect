"use client";

import { useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormSelect } from "@/components/ui/form-select";
import type { getStrategicBoardData } from "@/lib/data/strategic-board";

import { BoardSnapshotView } from "../workbook/board-dashboard";

type SnapshotRow = Awaited<ReturnType<typeof getStrategicBoardData>>["snapshots"][number];

export function SharedBoardDashboard({ snapshots }: { snapshots: SnapshotRow[] }) {
  const [selectedId, setSelectedId] = useState(snapshots[0]?.id ?? "");
  const selected = snapshots.find((snapshot) => snapshot.id === selectedId);
  if (!selected) return <Card><CardContent className="p-5 text-sm text-slate-600">
    Your organization has not shared a strategic planning dashboard with the board yet.
  </CardContent></Card>;
  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="w-full max-w-md space-y-2">
        <label htmlFor="board-dashboard-version" className="text-sm font-medium">Shared report</label>
        <FormSelect id="board-dashboard-version" name="board-dashboard-version" value={selectedId}
          onValueChange={setSelectedId} placeholder="Choose a shared report"
          options={snapshots.map((snapshot) => ({ value: snapshot.id,
            label: `${snapshot.title} · ${new Date(snapshot.created_at).toLocaleDateString("en-CA")}` }))} />
      </div>
      <Button asChild variant="outline"><Link href={`/api/strategic-planning/export?kind=board&snapshot=${selected.id}`}
        target="_blank" rel="noopener noreferrer"><Download className="size-4" />Download branded PDF</Link></Button>
      <Button asChild variant="outline"><Link href={`/api/strategic-planning/export?kind=board&snapshot=${selected.id}&format=html`}
        target="_blank" rel="noopener noreferrer"><Download className="size-4" />Download HTML</Link></Button>
    </div>
    <BoardSnapshotView snapshot={selected.summary} />
  </div>;
}
