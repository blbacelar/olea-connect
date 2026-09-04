export const documentCategories = [
  "Agenda",
  "Minutes",
  "Financial report",
  "Board report",
  "Policy",
  "Supporting document",
  "Other",
];

export const emptyUploadForm = {
  category: "Agenda",
  confidential: true,
  name: "",
  sizeLabel: "",
  url: "",
};

export type UploadFormState = typeof emptyUploadForm;
