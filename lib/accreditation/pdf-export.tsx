import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import React from "react";

import type { BrandProfile } from "@/lib/types";
import type { AccreditationWorkspaceData } from "@/lib/accreditation/types";

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 36,
    fontFamily: "Helvetica",
    color: "#0f172a",
  },
  heading: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  subheading: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 18,
  },
  section: {
    marginTop: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
  },
  label: {
    fontSize: 9,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  value: {
    fontSize: 11,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  chip: {
    fontSize: 10,
    color: "#14532d",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
});

export async function renderAccreditationPdfBuffer(
  data: AccreditationWorkspaceData,
  brand: Pick<BrandProfile, "organizationName" | "logoInitials" | "primaryColor" | "secondaryColor">,
) {
  const document = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.heading}>Accreditation Preparation Workspace</Text>
        <Text style={styles.subheading}>
          {brand.organizationName || "Organization"} · Prepared {new Date(data.lastUpdatedAt).toLocaleDateString("en-CA")}
        </Text>

        <View style={styles.section}>
          <Text style={styles.label}>Overview</Text>
          <View style={styles.row}>
            <Text style={styles.value}>Completion: {data.completionPercent}%</Text>
            <Text style={styles.chip}>{data.totals.completed}/{data.totals.total} templates complete</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.value}>Board approvals needed: {data.totals.boardApprovalNeeded}</Text>
            <Text style={styles.value}>Ready for board: {data.totals.readyForBoard}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Organization details</Text>
          <Text style={styles.value}>Organization: {data.settings.organizationName || brand.organizationName}</Text>
          <Text style={styles.value}>Lead: {data.settings.leadName || "Not provided"}</Text>
          <Text style={styles.value}>Target date: {data.settings.targetDate || "Not provided"}</Text>
          <Text style={styles.value}>Charity number: {data.settings.charityNumber || "Not provided"}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Progress by section</Text>
          {data.sections.map((section) => (
            <View key={section.id} style={styles.row}>
              <Text style={styles.value}>{section.name}</Text>
              <Text style={styles.value}>{section.completed}/{section.total} complete</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Template status</Text>
          {data.responses.map((response) => {
            const template = data.templates.find((item) => item.code === response.templateId);
            return (
              <View key={response.templateId} style={{ marginBottom: 8 }}>
                <Text style={styles.value}>{template?.title ?? response.templateId}</Text>
                <Text style={styles.value}>{response.approvalStatus.replace(/_/g, " ")}</Text>
              </View>
            );
          })}
        </View>
      </Page>
    </Document>
  );

  return renderToBuffer(document);
}
