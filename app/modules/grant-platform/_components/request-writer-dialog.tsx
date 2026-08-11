"use client";

import { Send, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface RequestWriterDialogProps {
  grantName?: string;
  trigger?: React.ReactNode;
}

export function RequestWriterDialog({ grantName, trigger }: RequestWriterDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [grantType, setGrantType] = useState("community_arts");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    // Simulate request submit
    await new Promise((resolve) => setTimeout(resolve, 600));

    setPending(false);
    setMessage("✅ Request received! We'll contact you within 2 business days with matched writer options.");

    setTimeout(() => {
      setOpen(false);
      setMessage(null);
    }, 1800);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline" className="gap-2 bg-slate-100 font-semibold text-slate-900 hover:bg-slate-200">
            <Sparkles className="size-4 text-olea-green" />
            Request Writer
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-olea-green" />
            Request Professional Grant Writer
          </DialogTitle>
          <DialogDescription>
            Connect with vetted grant writers specialized in non-profit, gaming, and arts grant applications.
          </DialogDescription>
        </DialogHeader>

        {grantName ? (
          <div className="rounded-md border border-olea-green/30 bg-olea-light/50 p-3 text-sm">
            <p className="font-semibold text-slate-900">Grant Selected:</p>
            <p className="text-slate-700">{grantName}</p>
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input type="hidden" name="grantType" value={grantType} />
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label htmlFor="writer-name">Your Name</Label>
              <Input id="writer-name" name="name" placeholder="e.g. Jane Doe" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="writer-email">Email Address</Label>
              <Input id="writer-email" name="email" type="email" placeholder="jane@organization.org" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="writer-type">Grant Type / Category</Label>
              <Select value={grantType} onValueChange={setGrantType}>
                <SelectTrigger id="writer-type" className="w-full">
                  <SelectValue placeholder="Select grant type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="community_arts">Community Arts & Culture</SelectItem>
                  <SelectItem value="youth_mentorship">Youth Development & Leadership</SelectItem>
                  <SelectItem value="health_wellness">Health & Wellness</SelectItem>
                  <SelectItem value="capital_equipment">Capital & Equipment Grant</SelectItem>
                  <SelectItem value="other">Other Grant Type</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="writer-timeline">Timeline / Preferred Turnaround</Label>
              <Input id="writer-timeline" name="timeline" placeholder="e.g. Need first draft in 2 weeks" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="writer-details">Project Summary / Specific Assistance Needed</Label>
              <Textarea id="writer-details" name="details" placeholder="Briefly describe what you need help writing (problem statement, logic model, full proposal review)..." rows={3} />
            </div>
          </div>

          {message ? <p className="text-sm font-medium text-olea-green">{message}</p> : null}

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={pending} type="submit" className="gap-2 bg-olea-green text-white hover:bg-olea-green/90">
              <Send className="size-4" />
              {pending ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
