import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import React from "react";

import { openEndedQuestions, surveySections } from "@/lib/survey-content";
import type {
  Organization,
  SurveyScore,
  TemplateSession,
} from "@/lib/types";

const styles = StyleSheet.create({
  page: {
    padding: 42,
    fontFamily: "Helvetica",
    color: "#1F2937",
    fontSize: 9,
    lineHeight: 1.45,
  },
  cover: {
    padding: 56,
    fontFamily: "Helvetica",
    color: "#1F2937",
  },
  coverAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 14,
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 38,
    color: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    marginBottom: 22,
  },
  orgName: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    marginBottom: 76,
  },
  coverTitle: {
    fontSize: 32,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.1,
    maxWidth: 380,
  },
  subtitle: {
    marginTop: 10,
    fontSize: 17,
    color: "#6B7280",
  },
  coverMeta: {
    position: "absolute",
    left: 56,
    bottom: 56,
    right: 56,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#6B7280",
    fontSize: 10,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    padding: 9,
    marginBottom: 7,
  },
  question: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 7,
    alignItems: "center",
  },
  questionText: {
    flex: 1,
    paddingRight: 10,
  },
  scoreRow: {
    flexDirection: "row",
    gap: 3,
  },
  score: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 7,
  },
  scoreSelected: {
    color: "#FFFFFF",
    borderColor: "transparent",
    fontFamily: "Helvetica-Bold",
  },
  openAnswer: {
    marginBottom: 13,
    padding: 11,
    backgroundColor: "#F9FAFB",
    borderRadius: 5,
  },
  openQuestion: {
    fontFamily: "Helvetica-Bold",
    marginBottom: 5,
  },
  summaryRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 9,
  },
  summaryTitle: {
    flex: 1,
  },
  summaryScore: {
    width: 70,
    textAlign: "right",
    fontFamily: "Helvetica-Bold",
  },
  heading: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.2,
    marginBottom: 10,
  },
  subheading: {
    color: "#6B7280",
    fontSize: 10,
    marginBottom: 24,
  },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 42,
    right: 42,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#9CA3AF",
    fontSize: 7,
  },
});

const scores: SurveyScore[] = [1, 2, 3, 4, 5, "na"];

function PdfFooter({ organization }: { organization: Organization }) {
  return (
    <View style={styles.footer} fixed>
      <Text>{organization.name} · Board Self-Evaluation</Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  );
}

export function BoardEvaluationPdf({
  organization,
  session,
}: {
  organization: Organization;
  session: TemplateSession;
}) {
  const sectionAverages = surveySections.map((section) => {
    const numericScores = section.questions.flatMap((question) => {
      const answer = session.answers[question.id];
      return typeof answer === "number" ? [answer] : [];
    });
    return {
      title: section.title,
      average:
        numericScores.length > 0
          ? numericScores.reduce((total, score) => total + score, 0) /
            numericScores.length
          : null,
    };
  });

  return (
    <Document
      title={`${organization.name} Board Self-Evaluation`}
      author="Olea Connects"
    >
      <Page size="LETTER" style={styles.cover}>
        <View
          style={[
            styles.coverAccent,
            { backgroundColor: organization.brand.secondaryColor },
          ]}
        />
        <View
          style={[
            styles.logo,
            { backgroundColor: organization.brand.primaryColor },
          ]}
        >
          <Text>{organization.brand.logoInitials}</Text>
        </View>
        <Text style={styles.orgName}>{organization.name}</Text>
        <Text
          style={[
            styles.coverTitle,
            { color: organization.brand.primaryColor },
          ]}
        >
          Board Self-Evaluation
        </Text>
        <Text style={styles.subtitle}>Annual Survey Template</Text>
        <View style={styles.coverMeta}>
          <Text>Board Year: {session.boardYear || "Not specified"}</Text>
          <Text>Survey Period: {session.surveyPeriod || "Not specified"}</Text>
        </View>
      </Page>

      <Page size="LETTER" style={styles.page} wrap>
        <Text style={[styles.heading, { color: organization.brand.primaryColor }]}>
          Board Self-Evaluation
        </Text>
        <Text style={styles.subheading}>
          Select the response that best reflects your experience. 1 = Strongly
          Disagree, 5 = Strongly Agree.
        </Text>
        {surveySections.map((section, sectionIndex) => (
          <View key={section.id} style={styles.section} wrap={false}>
            <Text
              style={[
                styles.sectionHeader,
                { backgroundColor: organization.brand.primaryColor },
              ]}
            >
              {sectionIndex + 1}. {section.title}
            </Text>
            {section.questions.map((question) => (
              <View key={question.id} style={styles.question}>
                <Text style={styles.questionText}>
                  {question.id}. {question.text}
                </Text>
                <View style={styles.scoreRow}>
                  {scores.map((score) => {
                    const selected = session.answers[question.id] === score;
                    return (
                      <View
                        key={String(score)}
                        style={[
                          styles.score,
                          ...(selected
                            ? [
                                styles.scoreSelected,
                                {
                                  backgroundColor:
                                    organization.brand.primaryColor,
                                },
                              ]
                            : []),
                        ]}
                      >
                        <Text>{score === "na" ? "N/A" : score}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        ))}
        <PdfFooter organization={organization} />
      </Page>

      <Page size="LETTER" style={styles.page}>
        <Text style={[styles.heading, { color: organization.brand.primaryColor }]}>
          Open-Ended Responses
        </Text>
        <Text style={styles.subheading}>
          Additional reflections on board governance and effectiveness.
        </Text>
        {openEndedQuestions.map((question) => (
          <View key={question.id} style={styles.openAnswer}>
            <Text style={styles.openQuestion}>{question.text}</Text>
            <Text>
              {session.openEndedAnswers[question.id] ||
                "No response provided."}
            </Text>
          </View>
        ))}
        <View style={{ marginTop: 14 }}>
          <Text style={styles.openQuestion}>Survey administration</Text>
          <Text>Administrator: {session.administrator || "Not specified"}</Text>
          <Text>Contact: {session.contact || "Not specified"}</Text>
          <Text>Deadline: {session.deadline || "Not specified"}</Text>
        </View>
        <PdfFooter organization={organization} />
      </Page>

      <Page size="LETTER" style={styles.page}>
        <Text style={[styles.heading, { color: organization.brand.primaryColor }]}>
          Results Summary
        </Text>
        <Text style={styles.subheading}>
          Administrator view · Section averages exclude N/A responses.
        </Text>
        <View
          style={[
            styles.summaryRow,
            {
              backgroundColor: organization.brand.primaryColor,
              color: "#FFFFFF",
              paddingHorizontal: 9,
            },
          ]}
        >
          <Text style={[styles.summaryTitle, { fontFamily: "Helvetica-Bold" }]}>
            Section
          </Text>
          <Text style={styles.summaryScore}>Average</Text>
        </View>
        {sectionAverages.map((section) => (
          <View key={section.title} style={styles.summaryRow}>
            <Text style={styles.summaryTitle}>{section.title}</Text>
            <Text style={styles.summaryScore}>
              {section.average === null ? "—" : section.average.toFixed(2)}
            </Text>
          </View>
        ))}
        <View style={{ marginTop: 28, padding: 16, backgroundColor: "#F3F4F6" }}>
          <Text style={styles.openQuestion}>Response tracking</Text>
          <Text>Responses received: __________</Text>
          <Text>Total board members invited: __________</Text>
          <Text>Response rate: __________ %</Text>
        </View>
        <PdfFooter organization={organization} />
      </Page>
    </Document>
  );
}
