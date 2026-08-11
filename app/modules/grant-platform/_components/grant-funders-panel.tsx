"use client";

import { Edit3, Handshake, HelpCircle, Plus, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedFunder, setSelectedFunder] = useState<{ id: string; name: string; notes: string } | null>(null);
  const [editNotesModalOpen, setEditNotesModalOpen] = useState(false);
  const [notesInput, setNotesInput] = useState("");

  const filteredFunders = useMemo(() => {
    return funders.filter((funder) => {
      const matchesSearch =
        funder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        funder.grants.toLowerCase().includes(searchQuery.toLowerCase()) ||
        funder.notes.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && funder.activeRelationship) ||
        (statusFilter === "pipeline" && !funder.activeRelationship && funder.status !== "Declined") ||
        (statusFilter === "declined" && funder.status === "Declined");

      return matchesSearch && matchesStatus;
    });
  }, [funders, searchQuery, statusFilter]);

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
        <h2 className="text-2xl font-bold text-navy-blue">Funder Relationships</h2>
        <Button
          type="button"
          className="gap-2 bg-orange-600 font-bold text-white hover:bg-orange-700"
          onClick={() => setAddModalOpen(true)}
        >
          <Plus className="size-4" />
          Add Funder Relationship
        </Button>
      </div>

      {/* Funders DataTable Card */}
      <Card className="shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Handshake className="size-5 text-olea-green" />
            Funder Roster & History
          </CardTitle>
          <div className="group relative">
            <button
              type="button"
              className="grid size-7 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-olea-green hover:text-white"
              aria-label="How to track funder relationships"
            >
              <HelpCircle className="size-4" />
            </button>
            <div className="pointer-events-none absolute right-0 top-9 z-30 w-80 scale-95 rounded-xl border border-slate-200 bg-white p-4 shadow-xl opacity-0 transition-all duration-150 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100">
              <p className="mb-2 font-bold text-slate-900 text-xs">How to Track Funder Relationships</p>
              <div className="space-y-2 text-xs text-slate-600">
                <p>✓ <strong>Add Funder:</strong> Register new foundations or government program officers.</p>
                <p>✓ <strong>Notes & Feedback:</strong> Click &quot;Edit Notes&quot; or double-click to record program officer contacts and guidance.</p>
                <p>✓ <strong>Track Success:</strong> Maintain historical memory across cycles so your team understands funder expectations.</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Table Search & Filter Toolbar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-3 bg-slate-50/50">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
              <Input
                placeholder="Search funders, programs, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 text-xs bg-white"
              />
            </div>
            <div className="w-[160px]">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-xs"
              >
                <option value="all">All Relationships</option>
                <option value="active">Active Relationship</option>
                <option value="pipeline">Pipeline / Prospect</option>
                <option value="declined">Declined</option>
              </select>
            </div>
          </div>

          <Table>
            <TableHeader className="bg-slate-100/70">
              <TableRow>
                <TableHead className="w-[200px]">Funder Name</TableHead>
                <TableHead className="w-[260px]">Grants / Programs</TableHead>
                <TableHead className="w-[140px]">Relationship Status</TableHead>
                <TableHead>Notes & Insights</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFunders.length ? (
                filteredFunders.map((funder) => (
                  <TableRow
                    key={funder.id}
                    className="group cursor-pointer hover:bg-slate-50/80"
                    onDoubleClick={() => handleEditNotesClick(funder)}
                  >
                    <TableCell className="font-semibold text-slate-900 text-xs">
                      {funder.name}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {funder.grants}
                    </TableCell>
                    <TableCell>
                      {funder.activeRelationship ? (
                        <Badge className="bg-emerald-100 font-bold text-emerald-800 text-[11px]">
                          ✓ Active partner
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[11px] text-slate-700">
                          {funder.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 max-w-[320px]">
                      {funder.notes ? (
                        <p className="line-clamp-2">{funder.notes}</p>
                      ) : (
                        <span className="italic text-slate-400">No notes added yet</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1 text-xs text-slate-600 hover:text-olea-green"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditNotesClick(funder);
                        }}
                      >
                        <Edit3 className="size-3.5" />
                        Edit Notes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-xs text-slate-500">
                    No funder relationships found matching your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
              <Edit3 className="size-5 text-olea-green" />
              Funder Notes: {selectedFunder?.name}
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
