import type { SurveySectionData } from "@/lib/types";

export const surveySections: SurveySectionData[] = [
  {
    id: "mission",
    title: "Mission, Vision & Strategic Direction",
    questions: [
      "I can clearly articulate our organization's mission and vision.",
      "The board regularly reviews the mission to ensure it remains relevant and impactful.",
      "The board provides meaningful input into the strategic planning process.",
      "The board monitors progress toward strategic goals at each meeting.",
      "The board effectively evaluates and responds to changes in the external environment.",
    ].map((text, index) => ({ id: index + 1, text })),
  },
  {
    id: "governance",
    title: "Governance & Board Structure",
    questions: [
      "The board has clearly defined roles and responsibilities.",
      "Board members understand the distinction between governance and management.",
      "The board operates according to its bylaws and governing documents.",
      "Board meetings are well-organized and make effective use of time.",
      "The board chair provides effective leadership.",
    ].map((text, index) => ({ id: index + 6, text })),
  },
  {
    id: "financial",
    title: "Financial Oversight",
    questions: [
      "I receive financial reports that are clear, accurate, and timely.",
      "I have sufficient financial literacy to understand the organization's financial statements.",
      "The board actively monitors the organization's financial health throughout the year.",
      "The board ensures that appropriate financial controls and auditing processes are in place.",
      "The board understands and approves major financial decisions and expenditures.",
    ].map((text, index) => ({ id: index + 11, text })),
  },
  {
    id: "executive",
    title: "Executive Director Relationship",
    questions: [
      "The board provides the ED with clear direction and support.",
      "The board conducts a fair and timely performance review of the ED.",
      "The ED provides the board with sufficient and useful information between meetings.",
      "The relationship between the board and the ED is collaborative and respectful.",
      "The board appropriately delegates operational authority to the ED.",
    ].map((text, index) => ({ id: index + 16, text })),
  },
  {
    id: "composition",
    title: "Board Composition & Inclusion",
    questions: [
      "The board has the right mix of skills, experience, and perspectives to govern effectively.",
      "The board proactively identifies and addresses gaps in its composition.",
      "New board members receive adequate orientation and onboarding.",
      "The board reflects the diversity of the communities we serve.",
      "The board actively promotes equity, diversity, and inclusion in its governance practices.",
    ].map((text, index) => ({ id: index + 21, text })),
  },
  {
    id: "engagement",
    title: "Individual Engagement",
    questions: [
      "I attend board and committee meetings consistently.",
      "I come to meetings prepared, having reviewed materials in advance.",
      "I actively participate in board discussions and deliberations.",
      "I fulfill the commitments I make as a board member.",
      "I feel that my participation on this board is meaningful and impactful.",
    ].map((text, index) => ({ id: index + 26, text })),
  },
  {
    id: "fundraising",
    title: "Fundraising & Resource Development",
    questions: [
      "The board understands its role in fundraising and resource development.",
      "Individual board members participate in fundraising activities.",
      "The board reviews and monitors fundraising performance regularly.",
      "I am comfortable asking others to support the organization financially.",
    ].map((text, index) => ({ id: index + 31, text })),
  },
  {
    id: "risk",
    title: "Risk Management & Compliance",
    questions: [
      "The board has reviewed and understands the organization's primary risks.",
      "The board reviews and monitors compliance with relevant laws and regulations.",
      "Board members annually disclose potential conflicts of interest.",
      "The board is aware of and addresses ethical concerns when they arise.",
    ].map((text, index) => ({ id: index + 35, text })),
  },
];

export const openEndedQuestions = [
  {
    id: "strengths",
    text: "What is the board doing particularly well that we should continue?",
  },
  {
    id: "improvement",
    text: "What is the single most important area where the board needs to improve?",
  },
  {
    id: "support",
    text: "What resources, training, or support would help you be a more effective board member?",
  },
  {
    id: "other",
    text: "Is there anything else you would like to share about the state of board governance this year?",
  },
] as const;
