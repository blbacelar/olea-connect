export function stakeholderSurveyCloseDate(details: { closesAt?: string; deadline?: string } | null | undefined) {
  return details?.closesAt || details?.deadline || "";
}

export function stakeholderSurveyHasClosed(details: { closesAt?: string; deadline?: string } | null | undefined,
  today = new Date().toISOString().slice(0, 10)) {
  const closesAt = stakeholderSurveyCloseDate(details);
  return Boolean(closesAt && closesAt < today);
}
