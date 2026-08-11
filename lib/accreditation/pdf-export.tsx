import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import React from "react";

import type { BrandProfile } from "@/lib/types";
import type { AccreditationWorkspaceData } from "@/lib/accreditation/types";
import { buildPdfFooter, normalizePdfBrand } from "@/lib/pdf/brand-export";
import { getEmbeddedLogo } from "@/lib/template-renderer/logo-data";

const styles = StyleSheet.create({
  cover: {
    paddingTop: 60,
    paddingRight: 56,
    paddingBottom: 56,
    paddingLeft: 56,
    fontFamily: "Helvetica",
    color: "#1f2937",
    fontSize: 10,
  },
  coverLogo: {
    width: 76,
    height: 76,
    borderRadius: 12,
    color: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
  },
  coverLogoImage: {
    width: 64,
    height: 64,
    objectFit: "contain",
  },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 8,
    color: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  headerLogoImage: {
    width: 28,
    height: 28,
    objectFit: "contain",
  },
  coverContent: {
    position: "absolute",
    left: 56,
    right: 56,
    bottom: 104,
  },
  coverEyebrow: {
    color: "#94a3b8",
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.6,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  coverTitle: {
    fontSize: 32,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.15,
    maxWidth: 450,
  },
  coverRule: {
    width: 96,
    height: 4,
    borderRadius: 999,
    marginTop: 24,
    marginBottom: 24,
  },
  coverOrg: {
    fontSize: 17,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  coverMeta: {
    color: "#64748b",
    fontSize: 12,
  },
  coverFooter: {
    position: "absolute",
    bottom: 34,
    left: 56,
    right: 56,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#94a3b8",
    fontSize: 9,
  },
  page: {
    paddingTop: 110,
    paddingRight: 42,
    paddingBottom: 96,
    paddingLeft: 42,
    fontFamily: "Helvetica",
    color: "#1f2937",
    fontSize: 10,
    lineHeight: 1.45,
  },
  accent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 12,
  },
  header: {
    position: "absolute",
    top: 28,
    left: 42,
    right: 42,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerText: {
    marginLeft: 10,
    flexGrow: 1,
    height: 34,
    justifyContent: "center",
  },
  headerOrg: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1f2937",
  },
  title: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.2,
    marginBottom: 6,
  },
  intro: {
    fontSize: 11,
    color: "#4b5563",
    marginBottom: 22,
  },
  section: {
    marginTop: 18,
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
    marginBottom: 6,
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
  footerRule: {
    position: "absolute",
    top: 735,
    left: 42,
    right: 42,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  footerText: {
    position: "absolute",
    top: 748,
    left: 42,
    right: 42,
    color: "#4b5563",
    fontSize: 7,
    textAlign: "center",
  },
});

function sanitizer(value: string | undefined | null) {
  return (value ?? "").replace(/[\u0000-\u001F]/g, "").trim();
}

function formatWebsite(value: string) {
  if (!value) return "oleaconnects.ca";
  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function BrandLogo({
  brand,
  logo,
  variant,
}: {
  brand: Pick<BrandProfile, "logoInitials" | "primaryColor" | "secondaryColor">;
  logo: ReturnType<typeof getEmbeddedLogo>;
  variant: "cover" | "header";
}) {
  const initials = sanitizer(brand.logoInitials || "OC").slice(0, 2).toUpperCase();

  if (logo?.dataUrl) {
    return (
      <Image
        src={logo.dataUrl}
        style={variant === "cover" ? styles.coverLogoImage : styles.headerLogoImage}
      />
    );
  }

  return (
    <View
      style={[
        variant === "cover" ? styles.coverLogo : styles.logo,
        { backgroundColor: brand.primaryColor || "#14532d" },
      ]}
    >
      <Text style={{ color: "#ffffff", fontSize: variant === "cover" ? 20 : 11 }}>
        {initials}
      </Text>
    </View>
  );
}

export async function renderAccreditationPdfBuffer(
  data: AccreditationWorkspaceData,
  brand: Pick<
    BrandProfile,
    | "organizationName"
    | "logoInitials"
    | "logoUrl"
    | "primaryColor"
    | "secondaryColor"
    | "website"
  >,
) {
  const safeBrand = normalizePdfBrand(brand, "#14532d", "#dcfce7");
  const logo = getEmbeddedLogo(brand.logoUrl);
  const organizationName = sanitizer(
    safeBrand.organizationName || data.settings.organizationName || "Organization",
  );
  const reportTitle = "Accreditation Preparation Workspace";
  const preparedOn = new Date(data.lastUpdatedAt).toLocaleDateString("en-CA");
  const footerText = buildPdfFooter(safeBrand, reportTitle, preparedOn);

  const document = (
    <Document
      title={reportTitle}
      author={organizationName}
      subject="Accreditation preparation workspace generated by Olea Connects™"
      keywords="Olea Connects™, nonprofit governance, accreditation"
      creator="Olea Connects™"
      producer="Olea Connects™"
    >
      <Page size="LETTER" style={styles.cover}>
        <View style={[styles.coverLogo, { backgroundColor: safeBrand.primaryColor }]}> 
          <BrandLogo brand={safeBrand} logo={logo} variant="cover" />
        </View>
        <View style={styles.coverContent}>
          <Text style={styles.coverEyebrow}>Accreditation workspace</Text>
          <Text style={[styles.coverTitle, { color: safeBrand.primaryColor }]}>
            {reportTitle}
          </Text>
          <View style={[styles.coverRule, { backgroundColor: safeBrand.secondaryColor }]} />
          <Text style={styles.coverOrg}>{organizationName}</Text>
          <Text style={styles.coverMeta}>Generated by Olea Connects™</Text>
        </View>
        <View style={styles.coverFooter}>
          <Text>{formatWebsite(brand.website || "oleaconnects.ca")}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>

      <Page size="LETTER" style={styles.page} wrap>
        <View style={[styles.accent, { backgroundColor: safeBrand.secondaryColor }]} fixed />
        <View style={styles.header} fixed>
          <View style={[styles.logo, { backgroundColor: safeBrand.primaryColor }]}> 
            <BrandLogo brand={safeBrand} logo={logo} variant="header" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerOrg}>{organizationName}</Text>
          </View>
        </View>
        <Text style={styles.title}>{reportTitle}</Text>
        <Text style={styles.intro}>
          Prepared for {organizationName} on {preparedOn}. This summary captures the current completion status,
          key settings, and template progress for the accreditation preparation workspace.
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
          <Text style={styles.value}>Organization: {data.settings.organizationName || organizationName}</Text>
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
                <Text style={styles.value}>{sanitizer(response.approvalStatus).replace(/_/g, " ")}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.footerRule} fixed />
        <Text
          fixed
          wrap={false}
          style={styles.footerText}
          render={({ pageNumber, totalPages }) => `${footerText} | Page ${pageNumber}/${totalPages}`}
        />
      </Page>
    </Document>
  );

  return renderToBuffer(document);
}
