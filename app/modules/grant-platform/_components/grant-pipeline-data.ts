export interface GrantPipelineNote {
  author: string;
  date: string;
  text: string;
}

export interface GrantPipelineGrant {
  awardDate?: string;
  awarded: string;
  coachingStage?: string;
  collaborators: Array<{ name: string; role: string; status: string }>;
  compliance?: Array<{ done: boolean; note: string; title: string }>;
  daysAway: string;
  deadline: string;
  declineReason?: string;
  files: Array<{ date: string; name: string }>;
  funder: string;
  funderFocus: string;
  id: string;
  learningNote?: string;
  name: string;
  postAwardReports?: Array<{ due: string; name: string; status: string }>;
  progress: string;
  requested: string;
  status: string;
}

export const grantPipelineGrants: GrantPipelineGrant[] = [
  {
    id: "grant-1",
    name: "BC Community Gaming Grant - Arts",
    funder: "Province of BC",
    funderFocus: "Public benefit, community-led arts programming",
    status: "in_progress",
    requested: "$50,000",
    awarded: "-",
    deadline: "Apr 30, 2026",
    daysAway: "67 days away",
    progress: "65%",
    coachingStage: "Drafting",
    collaborators: [
      { name: "Community Arts Centre", role: "Partner", status: "Confirmed" },
      { name: "Sarah Chen", role: "Grant Writer", status: "Active" },
    ],
    files: [
      { name: "BC Gaming Grant Guidelines.pdf", date: "uploaded Jan 15" },
      { name: "Logic Model - DRAFT.xlsx", date: "uploaded Jan 18" },
      { name: "Community Arts Centre Letter.pdf", date: "uploaded Jan 20" },
    ],
  },
  {
    id: "grant-2",
    name: "Arts Futures Fund",
    funder: "Arts Council of BC",
    funderFocus: "Artistic innovation and creative expression",
    status: "planning",
    requested: "$35,000",
    awarded: "-",
    deadline: "May 15, 2026",
    daysAway: "82 days away",
    progress: "20%",
    coachingStage: "Planning",
    collaborators: [
      { name: "Arts Council Advisory", role: "Advisor", status: "Assigned" },
    ],
    files: [{ name: "Arts Futures Guidelines 2026.pdf", date: "uploaded Feb 01" }],
  },
  {
    id: "grant-3",
    name: "Youth Leadership Initiative",
    funder: "Community Foundation",
    funderFocus: "Youth empowerment and leadership skills",
    status: "approved",
    requested: "$45,000",
    awarded: "$42,000 (93%)",
    deadline: "Dec 20, 2025",
    daysAway: "Awarded",
    progress: "100%",
    awardDate: "Dec 20, 2025",
    postAwardReports: [
      { name: "Interim Report", status: "Pending", due: "Jun 20, 2026" },
      { name: "Final Report", status: "Pending", due: "Dec 20, 2026" },
    ],
    compliance: [
      {
        title: "Funder acknowledgment in program materials",
        done: true,
        note: "Completed: Jan 5, 2026",
      },
      {
        title: "Mid-year check-in call with funder",
        done: false,
        note: "Due: Jun 15, 2026",
      },
      {
        title: "Outcome data collection",
        done: false,
        note: "Due: Oct 31, 2026",
      },
      {
        title: "Final financial report",
        done: false,
        note: "Due: Dec 10, 2026",
      },
    ],
    collaborators: [
      { name: "Leadership Committee", role: "Execution", status: "Active" },
    ],
    files: [
      { name: "Signed Funding Agreement.pdf", date: "uploaded Dec 22" },
      { name: "Final Grant Narrative.pdf", date: "uploaded Dec 18" },
    ],
  },
  {
    id: "grant-4",
    name: "Health & Wellness Program Grant",
    funder: "Provincial Health Ministry",
    funderFocus: "Community health initiatives",
    status: "declined",
    requested: "$65,000",
    awarded: "-",
    deadline: "Sep 30, 2025",
    daysAway: "Decision: Nov 15, 2025",
    progress: "0%",
    declineReason:
      "Government funding threshold exceeded. Guidelines state max 75% government funding per program. Your program was at 76%.",
    learningNote:
      "Reduce government funding dependency. Could reapply next cycle if we diversify funding.",
    collaborators: [],
    files: [{ name: "Application Submission Copy.pdf", date: "uploaded Sep 29" }],
  },
];

export const initialGrantPipelineNotes: Record<string, GrantPipelineNote[]> = {
  "grant-1": [
    {
      author: "Sarah Chen",
      date: "Today, 2:30pm",
      text: "First draft of problem statement ready. Waiting on youth testimonials by Friday.",
    },
    {
      author: "Mike Rodriguez",
      date: "Yesterday, 10am",
      text: "Community Arts Centre confirmed - strong alignment with their 2026 priorities!",
    },
  ],
};
