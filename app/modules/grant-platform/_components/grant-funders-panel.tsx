"use client";

import { Handshake, MessageSquareText, Plus, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function GrantFundersPanel() {
  const [funders, setFunders] = useState([
    {
      id: "funder-1",
      name: "Province of BC",
      grants: "BC Community Gaming Grant - Arts (In Progress, $50K)",
      status: "Active Pipeline",
      activeRelationship: false,
      notes: "Met with program officer in Jan. Emphasis on community benefit and local arts participation.",
    },
    {
      id: "funder-2",
      name: "Arts Council of BC",
      grants: "Arts Futures Fund (Planning, $35K)",
      status: "Planning",
      activeRelationship: false,
      notes: "Review guidelines thoroughly before May deadline.",
    },
    {
      id: "funder-3",
      name: "Community Foundation",
      grants: "Youth Leadership Initiative (Approved, $42K awarded)",
      status: "Approved Partner",
      activeRelationship: true,
      notes: "Strong alignment! Excellent relationship. Annual report due Dec 20, 2026.",
    },
    {
      id: "funder-4",
      name: "Provincial Health Ministry",
      grants: "Health & Wellness Program Grant (Declined, $65K requested)",
      status: "Declined",
      activeRelationship: false,
      notes: "Declined due to 75% govt funding limit. Re-evaluate funding mix before reapplying.",
    },
  ]);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedFunder, setSelectedFunder] = useState<{ id: string; name: string; notes: string } | null>(null);
  const [editNotesModalOpen, setEditNotesModalOpen] = useState(false);
  const [notesInput, setNotesInput] = useState("");

  const handleAddFunderSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const grants = String(formData.get("grants") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    if (!name) return;

    setFunders((prev) => [
      ...prev,
      {
        id: `funder-${Date.now()}`,
        name,
        grants: grants || "New Opportunity",
        status: "Prospect",
        activeRelationship: false,
        notes,
      },
    ]);

    setAddModalOpen(false);
  };

  const handleEditNotesClick = (funder: { id: string; name: string; notes: string }) => {
    setSelectedFunder(funder);
    setNotesInput(funder.notes);
    setEditNotesModalOpen(true);
  };

  const handleSaveNotesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFunder) return;

    setFunders((prev) =>
      prev.map((f) => (f.id === selectedFunder.id ? { ...f, notes: notesInput.trim() } : f))
    );

    setEditNotesModalOpen(false);
    setSelectedFunder(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-navy-blue">🤝 Funder Relationships</h2>
        <Button
          type="button"
          className="gap-2 bg-orange-600 font-bold text-white hover:bg-orange-700"
          onClick={() => setAddModalOpen(true)}
        >
          <Plus className="size-4" />
          Add Funder Relationship
        </Button>
      </div>

      {/* Funders List Card */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Handshake className="size-5 text-olea-green" />
            Funder Roster & History
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100 p-0">
          {funders.map((funder) => (
            <div
              key={funder.id}
              className="group cursor-pointer p-4 transition-colors hover:bg-slate-50/80"
              onDoubleClick={() => handleEditNotesClick(funder)}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-base text-navy-blue">{funder.name}</p>
                  <p className="mt-0.5 text-xs text-slate-600">{funder.grants}</p>
                </div>
                <div className="flex items-center gap-2">
                  {funder.activeRelationship ? (
                    <Badge className="bg-emerald-100 font-bold text-emerald-800">✓ Active relationship</Badge>
                  ) : (
                    <Badge variant="outline">{funder.status}</Badge>
                  )}
                </div>
              </div>

              {funder.notes ? (
                <div className="mt-2 rounded border border-slate-100 bg-slate-50 p-2.5 text-xs text-slate-700">
                  <p className="font-semibold text-slate-900">📝 Notes:</p>
                  <p className="mt-0.5">{funder.notes}</p>
                </div>
              ) : null}

              <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                <span className="text-orange-600 font-medium group-hover:underline">
                  📝 Double-click to add or edit notes
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-slate-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditNotesClick(funder);
                  }}
                >
                  Edit Notes
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Guide Card */}
      <Card className="border-l-4 border-olea-green bg-slate-50 shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-navy-blue">
            <ShieldCheck className="size-5 text-olea-green" />
            How to Track Funder Relationships:
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-slate-600">
          <p>
            ✓ <strong>Add Funder:</strong> Click &quot;+ Add Funder Relationship&quot; button to register new organizations.
          </p>
          <p>
            ✓ <strong>Add Notes:</strong> Double-click any funder to record contact details, feedback, and officer guidance.
          </p>
          <p>
            ✓ <strong>Track Success:</strong> Maintain historical memory across cycles so team members understand funder expectations.
          </p>
        </CardContent>
      </Card>

      {/* Add Funder Dialog Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Handshake className="size-5 text-orange-600" />
              Add Funder Relationship
            </DialogTitle>
            <DialogDescription>
              Register a new foundation, ministry, or corporate sponsor to track relationship history.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddFunderSubmit} className="space-y-3 text-xs">
            <div className="space-y-1">
              <Label htmlFor="funder-name">Funder Name</Label>
              <Input id="funder-name" name="name" placeholder="e.g. BC Community Gaming" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="funder-grants">Grant Program / Focus</Label>
              <Input id="funder-grants" name="grants" placeholder="e.g. Community Arts Grant ($50K)" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="funder-notes">Initial Relationship Notes</Label>
              <Textarea
                id="funder-notes"
                name="notes"
                placeholder="Include program officer contacts, past feedback, funding focus..."
                rows={3}
              />
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-orange-600 text-white hover:bg-orange-700">
                Save Funder
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Notes Dialog Modal */}
      <Dialog open={editNotesModalOpen} onOpenChange={setEditNotesModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquareText className="size-5 text-olea-green" />
              📝 Funder Notes: {selectedFunder?.name}
            </DialogTitle>
            <DialogDescription>
              Record communication notes, meeting feedback, and key contacts for this funder.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveNotesSubmit} className="space-y-3">
            <Textarea
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="Record notes on feedback received, contact persons, application history, and relationship status..."
              rows={5}
              className="text-xs"
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditNotesModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-olea-green text-white hover:bg-olea-green/90">
                Save Notes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
