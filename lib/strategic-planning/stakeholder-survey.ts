import * as z from "zod";

import bank from "./stakeholder-survey-bank.json";

export const stakeholderAudiences = bank.audiences;
export const stakeholderThemes = bank.themes;
export const stakeholderQuestionBank = bank.questions;
export type StakeholderQuestionType = "open" | "agree" | "rating" | "choice" | "multi";
export type StakeholderQuestion = {
  id: string;
  theme: string;
  type: StakeholderQuestionType;
  text: string;
  options: string[];
  defaultOn: boolean;
};

const audienceValues = [...stakeholderAudiences.map((audience) => audience.v), "everyone"];
const bankIds = new Set(stakeholderQuestionBank.map((question) => question.id));
const questionSchema = z.object({
  id: z.string().regex(/^[a-z_0-9]{1,40}$/),
  theme: z.string().max(40),
  type: z.enum(["open", "agree", "rating", "choice", "multi"]),
  text: z.string().trim().min(5).max(500),
  options: z.array(z.string().trim().min(1).max(120)).max(20),
  defaultOn: z.boolean(),
}).strict();

export function questionsForAudience(audience: string, equityOn: boolean, organizationName: string) {
  if (!audienceValues.includes(audience)) throw new Error("Choose a supported audience.");
  return stakeholderQuestionBank.filter((question) =>
    (!question.eq || equityOn) &&
    (question.aud === "all" || (audience !== "everyone" && Array.isArray(question.aud) && question.aud.includes(audience))))
    .map((question) => ({
      id: question.id,
      theme: question.th,
      type: question.t as StakeholderQuestionType,
      text: question.q.replaceAll("{org}", organizationName),
      options: question.o ?? [],
      defaultOn: Boolean(question.on),
    }));
}

export function parsePublishedStakeholderQuestions(input: unknown, audience: string): StakeholderQuestion[] {
  if (!audienceValues.includes(audience)) throw new Error("Choose a supported audience.");
  const questions = z.array(questionSchema).min(1).max(45).parse(input);
  const ids = new Set<string>();
  for (const question of questions) {
    if (ids.has(question.id)) throw new Error("A survey question appears more than once.");
    ids.add(question.id);
    const original = stakeholderQuestionBank.find((item) => item.id === question.id);
    if (original) {
      if (original.aud !== "all" &&
        (!Array.isArray(original.aud) || !original.aud.includes(audience))) {
        throw new Error("A question is not intended for this audience.");
      }
    } else if (!/^c\d+$/.test(question.id) || bankIds.has(question.id)) {
      throw new Error("Unknown custom survey question.");
    }
    if (["choice", "multi"].includes(question.type) && question.options.length < 2) {
      throw new Error("Choice questions need at least two options.");
    }
  }
  return questions;
}

export function parseStakeholderAnswers(input: unknown, questions: StakeholderQuestion[]) {
  const values = z.record(z.string(), z.union([z.string(), z.array(z.string())])).parse(input);
  if (!Object.keys(values).length) throw new Error("Answer at least one question before submitting.");
  const byId = new Map(questions.map((question) => [question.id, question]));
  for (const [id, answer] of Object.entries(values)) {
    const question = byId.get(id);
    if (!question) throw new Error("Unknown survey question.");
    if (question.type === "multi") {
      if (!Array.isArray(answer) || answer.length < 1 || answer.length > 3 ||
        new Set(answer).size !== answer.length ||
        answer.some((option) => !question.options.includes(option))) {
        throw new Error("Choose up to three listed options.");
      }
      continue;
    }
    if (typeof answer !== "string" || answer.length > 2000 || !answer.trim()) {
      throw new Error("Enter a valid answer.");
    }
    if (question.type === "choice" && !question.options.includes(answer)) {
      throw new Error("Choose a listed option.");
    }
    if (question.type === "agree" && !["1", "2", "3", "4", "5"].includes(answer)) {
      throw new Error("Choose a rating from 1 to 5.");
    }
    if (question.type === "rating" && !["1", "2", "3", "4", "5"].includes(answer)) {
      throw new Error("Choose a rating from 1 to 5.");
    }
  }
  return values;
}
