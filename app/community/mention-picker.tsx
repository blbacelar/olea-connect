"use client";

import { AtSign, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CommunityMentionCandidate } from "@/lib/types";
import { cn } from "@/lib/utils";

export function MentionPicker({
  candidates,
  defaultSelectedUserIds = [],
  description = "Mention members who should be notified about this conversation.",
}: {
  candidates: CommunityMentionCandidate[];
  defaultSelectedUserIds?: string[];
  description?: string;
}) {
  const [query, setQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    defaultSelectedUserIds.filter((userId) =>
      candidates.some((candidate) => candidate.userId === userId),
    ),
  );
  const selectedCandidates = selectedUserIds
    .map((userId) =>
      candidates.find((candidate) => candidate.userId === userId),
    )
    .filter(Boolean) as CommunityMentionCandidate[];
  const normalizedQuery = query.trim().toLowerCase();
  const filteredCandidates = useMemo(() => {
    if (!normalizedQuery) return [];

    return candidates
      .filter(
        (candidate) =>
          !selectedUserIds.includes(candidate.userId) &&
          `${candidate.name} ${candidate.organizationName}`
            .toLowerCase()
            .includes(normalizedQuery),
      )
      .slice(0, 6);
  }, [candidates, normalizedQuery, selectedUserIds]);

  function addMention(userId: string) {
    setSelectedUserIds((current) =>
      current.includes(userId) ? current : [...current, userId],
    );
    setQuery("");
  }

  function removeMention(userId: string) {
    setSelectedUserIds((current) => current.filter((id) => id !== userId));
  }

  return (
    <div className="space-y-2">
      {selectedUserIds.map((userId) => (
        <input
          key={userId}
          type="hidden"
          name="mentionedUserIds"
          value={userId}
        />
      ))}
      <Label htmlFor="community-mentions">Mention members</Label>
      <div className="relative">
        <AtSign className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400" />
        <Input
          id="community-mentions"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            candidates.length
              ? "Search by name or organization"
              : "No mentionable members yet"
          }
          className="pl-9"
          disabled={!candidates.length}
        />
        {filteredCandidates.length ? (
          <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border bg-white shadow-elevated">
            {filteredCandidates.map((candidate) => (
              <button
                key={candidate.userId}
                type="button"
                aria-label={`Mention ${candidate.name} from ${candidate.organizationName}`}
                className="flex w-full flex-col px-3 py-2 text-left text-sm transition hover:bg-slate-50"
                onClick={() => addMention(candidate.userId)}
              >
                <span className="font-semibold text-slate-800">
                  {candidate.name}
                </span>
                <span className="text-xs text-slate-500">
                  {candidate.organizationName}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <p className="text-xs leading-5 text-slate-500">{description}</p>
      {selectedCandidates.length ? (
        <div className="flex flex-wrap gap-2">
          {selectedCandidates.map((candidate) => (
            <Badge
              key={candidate.userId}
              variant="outline"
              className="gap-1.5 rounded-full bg-white py-1 pl-2 pr-1"
            >
              <span className="max-w-[220px] truncate">
                {candidate.name} · {candidate.organizationName}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "size-5 rounded-full text-slate-400 hover:text-red-600",
                )}
                aria-label={`Remove mention for ${candidate.name}`}
                onClick={() => removeMention(candidate.userId)}
              >
                <X className="size-3" />
              </Button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
