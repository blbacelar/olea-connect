import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { confirmedOptions } from "./workbench-options";

export function MeetingFields({
  entryConfirmed,
  entryLeadContact,
  entryLocation,
  entryTime,
  entryVirtualLink,
  onConfirmedChange,
  onLeadContactChange,
  onLocationChange,
  onTimeChange,
  onVirtualLinkChange,
}: {
  entryConfirmed: string;
  entryLeadContact: string;
  entryLocation: string;
  entryTime: string;
  entryVirtualLink: string;
  onConfirmedChange: (value: string) => void;
  onLeadContactChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onVirtualLinkChange: (value: string) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="calendar-entry-time">Time</Label>
        <Input
          id="calendar-entry-time"
          type="time"
          value={entryTime}
          onChange={(event) => onTimeChange(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="calendar-entry-location">Location / platform</Label>
        <Input
          id="calendar-entry-location"
          placeholder="Boardroom, Zoom, community hall"
          value={entryLocation}
          onChange={(event) => onLocationChange(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="calendar-entry-virtual-link">Virtual link</Label>
        <Input
          id="calendar-entry-virtual-link"
          type="url"
          placeholder="https://zoom.us/j/..."
          value={entryVirtualLink}
          onChange={(event) => onVirtualLinkChange(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="calendar-entry-lead-contact">Lead contact</Label>
        <Input
          id="calendar-entry-lead-contact"
          placeholder="Administrator, Treasurer, Board Chair"
          value={entryLeadContact}
          onChange={(event) => onLeadContactChange(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="calendar-entry-confirmed">Confirmed?</Label>
        <Select
          value={entryConfirmed || undefined}
          onValueChange={onConfirmedChange}
        >
          <SelectTrigger id="calendar-entry-confirmed">
            <SelectValue placeholder="Choose confirmation" />
          </SelectTrigger>
          <SelectContent>
            {confirmedOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

export function OwnerFields({
  entryRelatedMeeting,
  entryResponsible,
  onRelatedMeetingChange,
  onResponsibleChange,
}: {
  entryRelatedMeeting: string;
  entryResponsible: string;
  onRelatedMeetingChange: (value: string) => void;
  onResponsibleChange: (value: string) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="calendar-entry-related-meeting">Related meeting</Label>
        <Input
          id="calendar-entry-related-meeting"
          placeholder="Board budget review"
          value={entryRelatedMeeting}
          onChange={(event) => onRelatedMeetingChange(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="calendar-entry-responsible">Responsible</Label>
        <Input
          id="calendar-entry-responsible"
          placeholder="Administrator"
          value={entryResponsible}
          onChange={(event) => onResponsibleChange(event.target.value)}
        />
      </div>
    </>
  );
}

export function AgmFields({
  entryResponsible,
  entryWeeksBefore,
  onResponsibleChange,
  onWeeksBeforeChange,
}: {
  entryResponsible: string;
  entryWeeksBefore: string;
  onResponsibleChange: (value: string) => void;
  onWeeksBeforeChange: (value: string) => void;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="calendar-entry-days-before-agm">Days before AGM</Label>
        <Input
          id="calendar-entry-days-before-agm"
          step={1}
          type="number"
          placeholder="30"
          value={entryWeeksBefore}
          onChange={(event) => onWeeksBeforeChange(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="calendar-entry-responsible">Responsible</Label>
        <Input
          id="calendar-entry-responsible"
          placeholder="Administrator"
          value={entryResponsible}
          onChange={(event) => onResponsibleChange(event.target.value)}
        />
      </div>
    </>
  );
}
