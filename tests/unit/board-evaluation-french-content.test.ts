import { describe, expect, it } from "vitest";

import { questionBankCategories } from "@/lib/board-evaluation/prototype-content";
import { meetingBank, meetingOpenBank, openBank, ratedBank } from "@/lib/board-evaluation/question-bank";
import { meetingBankFr, meetingOpenBankFr, openBankFr, ratedBankFr } from "@/lib/board-evaluation/question-bank-fr";

describe("French board evaluation question bank", () => {
  it("keeps every stable question ID with a French translation", () => {
    expect(questionBankCategories.length).toBe(10);
    expect(ratedBankFr.map((question) => question.id)).toEqual(ratedBank.map((question) => question.id));
    expect(openBankFr.map((question) => question.id)).toEqual(openBank.map((question) => question.id));
    expect(meetingBankFr.map((question) => question[0])).toEqual(meetingBank.map((question) => question.id));
    expect(meetingOpenBankFr.map((question) => question.id)).toEqual(meetingOpenBank.map((question) => question.id));
    expect(ratedBankFr.every((question, index) => question.text !== ratedBank[index].text)).toBe(true);
    expect(meetingBankFr.every((question, index) => String(question[1]) !== String(meetingBank[index].text))).toBe(true);
  });
});
