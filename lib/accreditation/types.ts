export type AccreditationSectionId = "A" | "B" | "C" | "D" | "E";

export type AccreditationTemplateKind =
  | "policy"
  | "procedure"
  | "document"
  | "plan";

export type AccreditationDocumentMode = "not_started" | "have" | "create";

export type AccreditationApprovalStatus =
  | "not_required"
  | "needs_board_approval"
  | "ready_for_board"
  | "board_approved";

export interface AccreditationSection {
  description: string;
  id: AccreditationSectionId;
  name: string;
}

export interface AccreditationTemplateDefinition {
  boardApprovalRequired: boolean;
  checklist: string[];
  code: string;
  commonMistakes: string[];
  defaultDraft: string;
  icRequirement: string;
  kind: AccreditationTemplateKind;
  sectionId: AccreditationSectionId;
  structure: string[];
  title: string;
  whoCompletes: string;
}

export interface AccreditationSettings {
  charityNumber: string;
  leadEmail: string;
  leadName: string;
  organizationName: string;
  targetDate: string;
  teamRoles: string[];
}

export interface AccreditationEvidenceFile {
  name: string;
  path: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface AccreditationTemplateResponse {
  approvalStatus: AccreditationApprovalStatus;
  documentMode: AccreditationDocumentMode;
  evidenceFile: AccreditationEvidenceFile | null;
  evidenceLocation: string;
  evidenceName: string;
  notes: string;
  templateId: string;
  textDraft: string;
  updatedAt: string;
}

export interface AccreditationSectionProgress extends AccreditationSection {
  approved: number;
  completed: number;
  readyForBoard: number;
  total: number;
}

export interface AccreditationWorkspaceData {
  configured: boolean;
  completionPercent: number;
  instanceId: string;
  lastUpdatedAt: string;
  resourceId: string;
  responses: AccreditationTemplateResponse[];
  sections: AccreditationSectionProgress[];
  settings: AccreditationSettings;
  templates: AccreditationTemplateDefinition[];
  totals: {
    approved: number;
    boardApprovalNeeded: number;
    completed: number;
    readyForBoard: number;
    total: number;
  };
}
