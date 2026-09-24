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

import type { GrantPlatformWorkspaceData } from "@/lib/data/grant-platform";
import { buildPdfFooter, normalizePdfBrand } from "@/lib/pdf/brand-export";
import { getEmbeddedLogo } from "@/lib/template-renderer/logo-data";
import { sanitizePdfText } from "@/lib/template-renderer/pdf-export";
import type { BrandProfile } from "@/lib/types";

const styles = StyleSheet.create({
  cover: { padding: 56, fontFamily: "Helvetica", color: "#172033" },
  accent: { position: "absolute", top: 0, left: 0, right: 0, height: 14 },
  coverLogo: { width: 176, height: 72, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  coverLogoImage: { width: 158, height: 56, objectFit: "contain" },
  coverContent: { position: "absolute", left: 56, right: 56, bottom: 120 },
  eyebrow: { fontSize: 10, letterSpacing: 1.5, color: "#64748B", marginBottom: 12 },
  coverTitle: { fontSize: 32, fontFamily: "Helvetica-Bold", lineHeight: 1.2 },
  coverRule: { width: 96, height: 4, marginTop: 24, marginBottom: 24 },
  coverOrganization: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 8 },
  page: { paddingTop: 86, paddingRight: 42, paddingBottom: 64, paddingLeft: 42, fontFamily: "Helvetica", fontSize: 9, color: "#172033" },
  header: { position: "absolute", top: 24, left: 42, right: 42, height: 42, borderBottomWidth: 1, borderBottomColor: "#DCE3E8", flexDirection: "row", alignItems: "center" },
  headerLogo: { width: 92, height: 30, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  headerLogoImage: { width: 82, height: 25, objectFit: "contain" },
  headerTitle: { marginLeft: "auto", fontSize: 9, color: "#64748B" },
  footer: { position: "absolute", bottom: 30, left: 42, right: 42, borderTopWidth: 1, borderTopColor: "#DCE3E8", paddingTop: 10, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: "#64748B" },
  title: { fontSize: 23, fontFamily: "Helvetica-Bold", marginBottom: 10 },
  subtitle: { fontSize: 10, color: "#52637A", marginBottom: 20 },
  summary: { flexDirection: "row", gap: 10, marginBottom: 22 },
  stat: { flexGrow: 1, borderWidth: 1, borderColor: "#DCE3E8", borderRadius: 7, padding: 12 },
  statLabel: { fontSize: 8, color: "#64748B", marginBottom: 5 },
  statValue: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  sectionTitle: { fontSize: 15, fontFamily: "Helvetica-Bold", marginBottom: 10 },
  card: { borderWidth: 1, borderColor: "#DCE3E8", borderRadius: 7, padding: 12, marginBottom: 10 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginBottom: 5 },
  cardTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", flexGrow: 1 },
  cardStatus: { fontSize: 8, fontFamily: "Helvetica-Bold" },
  cardMeta: { color: "#52637A", marginBottom: 5 },
  cardDetail: { color: "#334155", lineHeight: 1.35 },
  empty: { color: "#52637A", padding: 16, borderWidth: 1, borderColor: "#DCE3E8", borderRadius: 7 },
});

export async function renderGrantBoardReportPdfBuffer(
  data: GrantPlatformWorkspaceData,
  brand: BrandProfile,
) {
  const safeBrand = normalizePdfBrand(brand, "#2F6B4F", "#D97757");
  const logo = getEmbeddedLogo(brand.logoUrl);
  const footer = buildPdfFooter(safeBrand, "Grant Board Report");
  const requestedTotal = data.applications.reduce(
    (total, application) => total + application.requestedAmountCents,
    0,
  );
  const activeCount = data.applications.filter(
    (application) => !["approved", "declined", "withdrawn"].includes(application.status),
  ).length;
  const reportDate = new Date().toLocaleDateString("en-CA", {
    year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
  });

  const mark = (variant: "cover" | "header") => (
    <View style={[variant === "cover" ? styles.coverLogo : styles.headerLogo, { backgroundColor: safeBrand.primaryColor }]}>
      {logo ? (
        <Image src={logo.dataUrl} style={variant === "cover" ? styles.coverLogoImage : styles.headerLogoImage} />
      ) : (
        <Text style={{ color: "#FFFFFF", fontFamily: "Helvetica-Bold", fontSize: variant === "cover" ? 20 : 11 }}>
          {sanitizePdfText(safeBrand.logoInitials || "OC")}
        </Text>
      )}
    </View>
  );

  return renderToBuffer(
    <Document title={`${data.organizationName} Grant Board Report`} author={data.organizationName} creator="Olea Connects™" producer="Olea Connects™">
      <Page size="LETTER" style={styles.cover}>
        <View style={[styles.accent, { backgroundColor: safeBrand.secondaryColor }]} />
        {mark("cover")}
        <View style={styles.coverContent}>
          <Text style={styles.eyebrow}>GRANT PLATFORM REPORT</Text>
          <Text style={[styles.coverTitle, { color: safeBrand.primaryColor }]}>Grant Board Report</Text>
          <View style={[styles.coverRule, { backgroundColor: safeBrand.secondaryColor }]} />
          <Text style={styles.coverOrganization}>{sanitizePdfText(data.organizationName)}</Text>
          <Text style={styles.subtitle}>Generated {reportDate}</Text>
        </View>
        <View style={styles.footer}>
          <Text>{sanitizePdfText(footer)}</Text>
          <Text>Page 1</Text>
        </View>
      </Page>
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.header} fixed>
          {mark("header")}
          <Text style={styles.headerTitle}>{sanitizePdfText(data.organizationName)} · Grant Board Report</Text>
        </View>
        <Text style={[styles.title, { color: safeBrand.primaryColor }]}>Funding pipeline</Text>
        <Text style={styles.subtitle}>Current saved applications and their next steps as of {reportDate}.</Text>
        <View style={styles.summary}>
          <View style={styles.stat}><Text style={styles.statLabel}>APPLICATIONS</Text><Text style={styles.statValue}>{data.applications.length}</Text></View>
          <View style={styles.stat}><Text style={styles.statLabel}>ACTIVE</Text><Text style={styles.statValue}>{activeCount}</Text></View>
          <View style={styles.stat}><Text style={styles.statLabel}>REQUESTED</Text><Text style={styles.statValue}>{formatCurrency(requestedTotal)}</Text></View>
        </View>
        <Text style={[styles.sectionTitle, { color: safeBrand.primaryColor }]}>Applications</Text>
        {data.applications.length ? data.applications.map((application) => (
          <View key={application.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>{sanitizePdfText(application.roundName)}</Text>
              <Text style={[styles.cardStatus, { color: safeBrand.primaryColor }]}>{sanitizePdfText(application.status.replace(/_/g, " ").toUpperCase())}</Text>
            </View>
            <Text style={styles.cardMeta}>
              {sanitizePdfText(application.funderName)} · Requested {formatCurrency(application.requestedAmountCents)} · Deadline {formatDate(application.deadlineAt)}
            </Text>
            <Text style={styles.cardDetail}>Next: {sanitizePdfText(application.nextMilestone)}</Text>
          </View>
        )) : <Text style={styles.empty}>No saved grant applications are available for this workspace.</Text>}
        <View style={styles.footer} fixed>
          <Text>{sanitizePdfText(footer)}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>,
  );
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
}

function formatDate(value: string | null) {
  if (!value) return "not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "not set"
    : date.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}
