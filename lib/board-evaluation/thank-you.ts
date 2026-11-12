export const defaultBoardEvaluationThankYou = {
  enTitle: "Thank you — your response is in.",
  frTitle: "Merci — votre réponse a été reçue.",
  enMessage: "Your input helps the board improve. Only anonymized, aggregated findings will be shared.",
  frMessage: "Votre contribution aide le conseil à s’améliorer. Seuls les résultats regroupés et anonymisés seront partagés.",
};

export function boardEvaluationThankYouCopy(value: unknown) {
  const copy = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
  return Object.fromEntries(Object.entries(defaultBoardEvaluationThankYou).map(([key, fallback]) => [
    key, typeof copy[key] === "string" && copy[key].trim() ? copy[key].trim() : fallback,
  ])) as typeof defaultBoardEvaluationThankYou;
}
