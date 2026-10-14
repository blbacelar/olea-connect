export type AssessmentQuestion = {
  id: string;
  lesson: string;
  answer: string;
  options: Array<{ id: string }>;
};

export function gradeTrainingAssessment(
  questions: readonly AssessmentQuestion[],
  answers: Record<string, string>,
  passMarkPercent: number,
) {
  const expected = new Set(questions.map((question) => question.id));
  if (
    Object.keys(answers).length !== questions.length ||
    Object.keys(answers).some((id) => !expected.has(id)) ||
    questions.some((question) => !question.options.some((option) => option.id === answers[question.id]))
  ) {
    throw new Error("Answer every question before submitting the assessment.");
  }
  const topicScores: Record<string, { correct: number; total: number }> = {};
  let score = 0;
  for (const question of questions) {
    const correct = answers[question.id] === question.answer;
    if (correct) score += 1;
    topicScores[question.lesson] ??= { correct: 0, total: 0 };
    topicScores[question.lesson].total += 1;
    if (correct) topicScores[question.lesson].correct += 1;
  }
  return {
    score,
    total: questions.length,
    passed: score * 100 >= passMarkPercent * questions.length,
    topicScores,
  };
}

export function trainingCertificateExpiry(issuedAt: Date, validMonths: number) {
  const targetFirstDay = new Date(Date.UTC(
    issuedAt.getUTCFullYear(), issuedAt.getUTCMonth() + validMonths, 1,
    issuedAt.getUTCHours(), issuedAt.getUTCMinutes(), issuedAt.getUTCSeconds(), issuedAt.getUTCMilliseconds(),
  ));
  const lastDay = new Date(Date.UTC(targetFirstDay.getUTCFullYear(), targetFirstDay.getUTCMonth() + 1, 0)).getUTCDate();
  targetFirstDay.setUTCDate(Math.min(issuedAt.getUTCDate(), lastDay));
  return targetFirstDay;
}

export function aggregateTrainingReport(rows: Array<{
  confidenceBefore: Record<string, number>;
  confidenceAfter: Record<string, number>;
  topicScores: Record<string, { correct: number; total: number }>;
  actionPlan: string[];
  followUp: Record<string, string>;
}>, topicIds: readonly string[], allowedCommitments: readonly string[]) {
  if (rows.length < 3) return null;
  const topics = topicIds.map((id) => {
    const before = rows.map((row) => row.confidenceBefore[id]).filter(Number.isFinite);
    const after = rows.map((row) => row.confidenceAfter[id]).filter(Number.isFinite);
    const correct = rows.reduce((sum, row) => sum + (row.topicScores[id]?.correct ?? 0), 0);
    const total = rows.reduce((sum, row) => sum + (row.topicScores[id]?.total ?? 0), 0);
    return {
      id,
      before: before.length ? before.reduce((sum, value) => sum + value, 0) / before.length : null,
      after: after.length ? after.reduce((sum, value) => sum + value, 0) / after.length : null,
      assessmentPercent: total ? Math.round((correct / total) * 100) : null,
    };
  });
  const commitments = new Map<string, number>();
  const allowed = new Set(allowedCommitments);
  const followUp = { done: 0, partly: 0, not_yet: 0 };
  for (const row of rows) {
    for (const plan of new Set(row.actionPlan)) {
      if (allowed.has(plan)) commitments.set(plan, (commitments.get(plan) ?? 0) + 1);
    }
    for (const status of new Set(Object.values(row.followUp))) {
      if (status in followUp) followUp[status as keyof typeof followUp] += 1;
    }
  }
  return {
    respondents: rows.length,
    topics,
    commitments: [...commitments].filter(([, count]) => count >= 3).sort((a, b) => b[1] - a[1]).slice(0, 5),
    followUp: Object.fromEntries(Object.entries(followUp).map(([status, count]) => [status, count >= 3 ? count : null])),
  };
}
