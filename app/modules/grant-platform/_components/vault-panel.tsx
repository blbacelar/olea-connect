"use client";

import { FileText, FolderOpen, Paperclip } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { GrantPlatformWorkspaceData } from "@/lib/data/grant-platform";

export function VaultPanel({ data }: { data: GrantPlatformWorkspaceData }) {
  const [vaultItems, setVaultItems] = useState(data.vaultItems);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [fileNameInput, setFileNameInput] = useState("");
  const [contentTypeInput, setContentTypeInput] = useState("Grant Template / Narrative");

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileNameInput.trim()) return;

    const newItem = {
      id: `vault-custom-${Date.now()}`,
      fileName: fileNameInput.trim(),
      contentType: contentTypeInput,
      sizeBytes: 1024 * 512,
      createdAt: new Date().toISOString(),
    };

    setVaultItems((prev) => [newItem, ...prev]);
    setFileNameInput("");
    setUploadDialogOpen(false);
  };

  const handleDeleteItem = (id: string) => {
    setVaultItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <FolderOpen className="size-5 text-olea-green" />
              Cross-Grant File Vault
            </CardTitle>
            <div className="group relative">
              <button
                type="button"
                className="grid size-7 place-items-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-olea-green hover:text-white"
                aria-label="Vault tips"
              >
                <HelpCircle className="size-4" />
              </button>
              <div className="pointer-events-none absolute left-0 top-9 z-30 w-80 scale-95 rounded-xl border border-slate-200 bg-white p-4 shadow-xl opacity-0 transition-all duration-150 group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100">
                <p className="mb-2 font-bold text-slate-900 text-xs">Vault Tips & Guidance</p>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <p>• Store templates and reusable documents here.</p>
                  <p>• Download files when working on a grant opportunity.</p>
                  <p>• Keep files updated as best practices evolve.</p>
                </div>
              </div>
            </div>
          </div>
          <Button
            type="button"
            className="gap-2 bg-olea-orange text-white hover:bg-olea-orange/90"
            onClick={() => setUploadDialogOpen(true)}
          >
            <Paperclip className="size-4" />
            Upload to Vault
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-slate-600">Store reusable files, templates, and resources that can be used across multiple grants.</p>

        {/* Vault Data Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft">
          <Table>
            <TableHeader className="bg-slate-100/70">
              <TableRow>
                <TableHead className="w-[300px]">File Name</TableHead>
                <TableHead>Category / Type</TableHead>
                <TableHead className="w-[160px]">Uploaded Date</TableHead>
                <TableHead className="w-[180px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vaultItems.length ? (
                vaultItems.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/80">
                    <TableCell className="font-semibold text-slate-900 text-xs">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-olea-green shrink-0" />
                        <span>{item.fileName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      <Badge variant="outline" className="bg-slate-50 text-slate-700">
                        {item.contentType ?? "Reusable file"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          type="button"
                          className="bg-olea-orange text-white hover:bg-olea-orange/90 text-xs h-8"
                          onClick={() => alert(`Downloading "${item.fileName}"...`)}
                        >
                          Download
                        </Button>
                        <Button
                          size="sm"
                          type="button"
                          variant="outline"
                          className="text-xs h-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-xs text-slate-500">
                    No files uploaded to vault yet. Click &quot;Upload to Vault&quot; to add your first document.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Upload Modal Dialog */}
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Paperclip className="size-5 text-olea-orange" />
                Upload File to Cross-Grant Vault
              </DialogTitle>
              <DialogDescription>
                Add reusable templates, organizational policies, or budgets to the central vault.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Document Title / File Name</label>
                <Input
                  placeholder="e.g. 2026 Master Budget Template.xlsx"
                  value={fileNameInput}
                  onChange={(e) => setFileNameInput(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Document Category</label>
                <Select value={contentTypeInput} onValueChange={setContentTypeInput}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Grant Template / Narrative">Grant Template / Narrative</SelectItem>
                    <SelectItem value="Financial Budget / Audit">Financial Budget / Audit</SelectItem>
                    <SelectItem value="Board Resolution / Governance">Board Resolution / Governance</SelectItem>
                    <SelectItem value="Letters of Support">Letters of Support</SelectItem>
                    <SelectItem value="Impact & Evaluation Metrics">Impact & Evaluation Metrics</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Choose File</label>
                <Input type="file" className="text-xs cursor-pointer" />
              </div>
              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setUploadDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-olea-orange text-white hover:bg-olea-orange/90">
                  Upload Document
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
