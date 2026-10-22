"use client";

import { Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { getCommitteeRowKey, getString, type TemplateRecord } from "./workflow-utils";

export function DirectoryTable({
  committees,
  onEditCommittee,
  onRemoveCommittee,
}: {
  committees: Array<{ committee: TemplateRecord; index: number }>;
  onEditCommittee: (index: number) => void;
  onRemoveCommittee: (index: number) => void;
}) {
  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Committee</TableHead>
            <TableHead>Chair</TableHead>
            <TableHead className="w-[120px]">Notes</TableHead>
            <TableHead className="w-[210px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {committees.map(({ committee, index }) => (
            <TableRow key={getCommitteeRowKey(committee, index)}>
              <TableCell className="min-w-[220px] font-semibold text-slate-950">
                {getString(committee, "name") || "Untitled committee"}
              </TableCell>
              <TableCell className="min-w-[180px] text-slate-700">
                {getString(committee, "chair") || "No chair assigned"}
              </TableCell>
              <TableCell className="whitespace-nowrap text-slate-500">
                {getString(committee, "notes") ? (
                  <Badge
                    variant="outline"
                    className="border-olea-green/20 bg-olea-light text-olea-dark"
                  >
                    Has notes
                  </Badge>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Edit committee ${index + 1}`}
                    onClick={() => onEditCommittee(index)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-red-700 hover:bg-red-50 hover:text-red-800"
                    aria-label={`Remove committee ${index + 1}`}
                    onClick={() => onRemoveCommittee(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
