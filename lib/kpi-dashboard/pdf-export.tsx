import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import React from "react";

import type {
  KpiDashboardData,
  KpiDefinition,
  KpiQuarterResult,
} from "@/lib/data/kpi-dashboard";
import {
  calculatePercentToTarget,
  calculateTrend,
  calculateVariance,
  formatNumber,
  formatPercent,
  milestoneLabels,
  monthOptions,
  ragLabels,
  type QuarterNumber,
  type RagStatus,
} from "@/lib/kpi-dashboard/domain";
import type { BrandProfile } from "@/lib/types";
import { buildPdfFooter, normalizePdfBrand } from "@/lib/pdf/brand-export";
import { getEmbeddedLogo } from "@/lib/template-renderer/logo-data";

type PdfStyle = Style;

const fallbackPrimaryColor = "#446B52";
const fallbackSecondaryColor = "#F4EFE4";
const quarterValues: QuarterNumber[] = [1, 2, 3, 4];

const styles = StyleSheet.create({
  cover: {
    padding: 56,
    color: "#172033",
    fontFamily: "Helvetica",
  },
  coverAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 14,
  },
  coverLogo: {
    width: 84,
    height: 84,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    color: "#FFFFFF",
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
  },
  coverLogoImage: {
    width: 70,
    height: 70,
    objectFit: "contain",
  },
  coverContent: {
    position: "absolute",
    left: 56,
    right: 56,
    bottom: 112,
  },
  eyebrow: {
    color: "#718096",
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.6,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  coverTitle: {
    fontSize: 34,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.1,
    maxWidth: 520,
  },
  coverRule: {
    width: 94,
    height: 5,
    borderRadius: 999,
    marginTop: 28,
    marginBottom: 26,
  },
  coverOrganization: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  coverMeta: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 1.45,
  },
  coverFooter: {
    position: "absolute",
    left: 56,
    right: 56,
    bottom: 34,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#DCE3E8",
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#718096",
    fontSize: 8,
  },
  page: {
    paddingTop: 84,
    paddingRight: 38,
    paddingBottom: 58,
    paddingLeft: 38,
    color: "#172033",
    fontFamily: "Helvetica",
    fontSize: 9,
    lineHeight: 1.4,
  },
  pageHeader: {
    position: "absolute",
    top: 24,
    left: 38,
    right: 38,
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#DCE3E8",
  },
  headerLogo: {
    width: 30,
    height: 30,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    color: "#FFFFFF",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  headerLogoImage: {
    width: 25,
    height: 25,
    objectFit: "contain",
  },
  headerOrganization: {
    marginLeft: 9,
    flexGrow: 1,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  headerTitle: {
    color: "#718096",
    fontSize: 8,
  },
  section: {
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.2,
    marginBottom: 10,
  },
  subtitle: {
    color: "#5E7087",
    fontSize: 11,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    marginBottom: 5,
  },
  sectionDescription: {
    color: "#5E7087",
    marginBottom: 10,
  },
  scorecardRow: {
    flexDirection: "row",
    marginBottom: 18,
  },
  scorecard: {
    width: "24%",
    marginRight: "1.33%",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DCE3E8",
    backgroundColor: "#F8FAFB",
  },
  scorecardLast: {
    marginRight: 0,
  },
  scorecardLabel: {
    color: "#718096",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  scorecardValue: {
    fontSize: 23,
    fontFamily: "Helvetica-Bold",
    marginTop: 5,
  },
  table: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 6,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#DCE3E8",
    minHeight: 34,
    alignItems: "stretch",
  },
  tableHeaderRow: {
    backgroundColor: "#334155",
    borderBottomColor: "#334155",
  },
  tableCell: {
    padding: 6,
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "#DCE3E8",
  },
  tableHeaderCell: {
    borderRightColor: "#64748B",
  },
  tableHeaderText: {
    color: "#FFFFFF",
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
  },
  tableText: {
    color: "#253247",
    fontSize: 7,
  },
  tableStrong: {
    color: "#172033",
    fontFamily: "Helvetica-Bold",
  },
  tableMuted: {
    color: "#64748B",
    fontSize: 6.5,
  },
  tableCellDomain: { width: "10%" },
  tableCellKpi: { width: "15%" },
  tableCellOutcome: { width: "12%" },
  tableCellTarget: { width: "9%" },
  tableCellQuarter: { width: "10.5%" },
  tableCellProgress: { width: "8%" },
  tableCellVariance: { width: "8%" },
  tableCellRag: { width: "6%", borderRightWidth: 0 },
  quarterValue: {
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  callout: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 14,
  },
  calloutLabel: {
    color: "#FFFFFF",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  calloutText: {
    color: "#FFFFFF",
    fontSize: 9,
  },
  narrative: {
    padding: 12,
    marginBottom: 10,
    borderRadius: 7,
    backgroundColor: "#F8FAFB",
    borderLeftWidth: 4,
  },
  narrativeTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 5,
  },
  narrativeText: {
    color: "#46566D",
    fontSize: 9,
  },
  footerRule: {
    position: "absolute",
    left: 38,
    right: 38,
    top: 735,
    borderTopWidth: 1,
    borderTopColor: "#DCE3E8",
  },
  footerText: {
    position: "absolute",
    left: 38,
    right: 132,
    top: 748,
    color: "#718096",
    fontSize: 7,
  },
  footerPage: {
    position: "absolute",
    right: 38,
    top: 748,
    color: "#718096",
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
  },
});

type ReportBrand = BrandProfile & {
  primaryColor: string;
  secondaryColor: string;
};

export async function renderKpiDashboardPdfBuffer(
  data: KpiDashboardData,
  brand: BrandProfile,
) {
  const safeBrand: ReportBrand = normalizePdfBrand(
    brand,
    fallbackPrimaryColor,
    fallbackSecondaryColor,
  ) as ReportBrand;
  const logo = getEmbeddedLogo(brand.logoUrl);

  return renderToBuffer(
    <KpiDashboardDocument data={data} brand={safeBrand} logoDataUrl={logo?.dataUrl} />,
  );
}

function KpiDashboardDocument({
  brand,
  data,
  logoDataUrl,
}: {
  brand: ReportBrand;
  data: KpiDashboardData;
  logoDataUrl?: string;
}) {
  const scorecard = getScorecard(data);
  const footer = buildPdfFooter(brand, "Board Reporting Dashboard");

  return (
    <Document
      title={`${data.dashboard.organizationName} ${data.dashboard.title}`}
      author={data.dashboard.organizationName}
      subject="KPI Dashboard and Board Reporting"
      creator="Olea Connects™"
      producer="Olea Connects™"
      keywords="KPI, board reporting, nonprofit governance"
    >
      <Page size="LETTER" style={styles.cover}>
        <View style={[styles.coverAccent, { backgroundColor: brand.secondaryColor }]} />
        <BrandMark
          backgroundColor={brand.primaryColor}
          initials={brand.logoInitials}
          logoDataUrl={logoDataUrl}
          variant="cover"
        />
        <View style={styles.coverContent}>
          <Text style={styles.eyebrow}>Board reporting</Text>
          <Text style={[styles.coverTitle, { color: brand.primaryColor }]}>
            {clean(data.dashboard.title)}
          </Text>
          <View style={[styles.coverRule, { backgroundColor: brand.secondaryColor }]} />
          <Text style={styles.coverOrganization}>
            {clean(data.dashboard.organizationName)}
          </Text>
          <Text style={styles.coverMeta}>
            Reporting year: {data.dashboard.reportingYear}{"\n"}
            Generated {formatDate(new Date())}
          </Text>
        </View>
        <View style={styles.coverFooter}>
          <Text>{footer}</Text>
          <Text>Page 1</Text>
        </View>
      </Page>

      <ReportPage brand={brand} data={data} footer={footer} logoDataUrl={logoDataUrl}>
        <Text style={[styles.title, { color: brand.primaryColor }]}>Executive summary</Text>
        <Text style={styles.subtitle}>
          A board-ready snapshot of KPI performance, quarterly movement, milestones,
          risks, and annual narrative reporting.
        </Text>
        <Scorecards scorecard={scorecard} brand={brand} />
        <View style={[styles.callout, { backgroundColor: brand.primaryColor }]}>
          <Text style={styles.calloutLabel}>Reporting context</Text>
          <Text style={styles.calloutText}>
            {clean(data.dashboard.organizationName)} · Reporting year {data.dashboard.reportingYear}
            {data.dashboard.financialYearEnd
              ? ` · Financial year end ${data.dashboard.financialYearEnd}`
              : ""}
          </Text>
        </View>
        <Text style={[styles.sectionTitle, { color: brand.primaryColor }]}>Report contents</Text>
        <Text style={styles.sectionDescription}>
          Quarterly results are shown using the organization&apos;s configured reporting
          periods. Full-year RAG assessments are set by the Board and remain separate
          from the calculated quarterly suggestions.
        </Text>
        <MiniContents brand={brand} />
      </ReportPage>

      <Page size="LETTER" orientation="landscape" style={styles.page} wrap>
        <PageHeader brand={brand} title={data.dashboard.title} logoDataUrl={logoDataUrl} />
        <Text style={[styles.title, { color: brand.primaryColor }]}>Full-year KPI results</Text>
        <Text style={styles.subtitle}>
          Quarterly results, trend, RAG status, progress, variance, and full-year Board
          assessment.
        </Text>
        <KpiResultsTable data={data} brand={brand} />
        <Footer footer={footer} />
      </Page>

      <ReportPage brand={brand} data={data} footer={footer} logoDataUrl={logoDataUrl}>
        <Text style={[styles.title, { color: brand.primaryColor }]}>Milestones &amp; risks</Text>
        <Text style={styles.subtitle}>
          Current operational milestones and risks captured in the reporting workspace.
        </Text>
        <ReportTable
          brand={brand}
          columns={["Milestone", "Owner", "Due date", "Status", "Notes"]}
          emptyMessage="No milestones have been added."
          rows={data.milestones.map((item) => [
            item.title,
            item.owner || "—",
            item.dueDate || "—",
            milestoneLabels[item.status],
            item.notes || "—",
          ])}
        />
        <View style={styles.section} />
        <ReportTable
          brand={brand}
          columns={["Area", "Risk", "Mitigation", "Owner", "RAG"]}
          emptyMessage="No risks have been added."
          rows={data.risks.map((item) => [
            item.area,
            item.description,
            item.mitigation,
            item.owner || "—",
            ragLabels[item.ragStatus],
          ])}
        />
      </ReportPage>

      <ReportPage brand={brand} data={data} footer={footer} logoDataUrl={logoDataUrl}>
        <Text style={[styles.title, { color: brand.primaryColor }]}>Annual summary</Text>
        <Text style={styles.subtitle}>
          Narrative sections prepared by the organization for its annual impact report.
        </Text>
        <NarrativeSections summary={data.annualSummary} brand={brand} />
      </ReportPage>
    </Document>
  );
}

function ReportPage({
  brand,
  children,
  data,
  footer,
  logoDataUrl,
}: {
  brand: ReportBrand;
  children: React.ReactNode;
  data: KpiDashboardData;
  footer: string;
  logoDataUrl?: string;
}) {
  return (
    <Page size="LETTER" style={styles.page} wrap>
      <PageHeader brand={brand} title={data.dashboard.title} logoDataUrl={logoDataUrl} />
      {children}
      <Footer footer={footer} />
    </Page>
  );
}

function PageHeader({
  brand,
  logoDataUrl,
  title,
}: {
  brand: ReportBrand;
  logoDataUrl?: string;
  title: string;
}) {
  return (
    <View style={styles.pageHeader} fixed>
      <BrandMark
        backgroundColor={brand.primaryColor}
        initials={brand.logoInitials}
        logoDataUrl={logoDataUrl}
      />
      <Text style={styles.headerOrganization}>{clean(brand.organizationName)}</Text>
      <Text style={styles.headerTitle}>{clean(title)}</Text>
    </View>
  );
}

function Footer({ footer }: { footer: string }) {
  return (
    <>
      <View style={styles.footerRule} fixed />
      <Text style={styles.footerText} fixed wrap={false}>
        {footer}
      </Text>
      <Text
        style={styles.footerPage}
        fixed
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </>
  );
}

function BrandMark({
  backgroundColor,
  initials,
  logoDataUrl,
  variant = "header",
}: {
  backgroundColor: string;
  initials: string;
  logoDataUrl?: string;
  variant?: "cover" | "header";
}) {
  const cover = variant === "cover";

  return (
    <View style={[cover ? styles.coverLogo : styles.headerLogo, { backgroundColor }]}>
      {logoDataUrl ? (
        // react-pdf's Image does not expose the web-only alt prop.
        // eslint-disable-next-line jsx-a11y/alt-text
        <Image
          src={logoDataUrl}
          style={cover ? styles.coverLogoImage : styles.headerLogoImage}
        />
      ) : (
        <Text>{clean(initials || "OC")}</Text>
      )}
    </View>
  );
}

function Scorecards({
  brand,
  scorecard,
}: {
  brand: ReportBrand;
  scorecard: ReturnType<typeof getScorecard>;
}) {
  const cards = [
    ["KPIs", scorecard.total, "#64748B"],
    ["Green", scorecard.green, "#27834A"],
    ["Amber", scorecard.amber, "#B65D13"],
    ["Red", scorecard.red, "#C62828"],
  ] as const;

  return (
    <View style={styles.scorecardRow}>
      {cards.map(([label, value, color], index) => (
        <View
          key={label}
          style={[
            styles.scorecard,
            ...(index === cards.length - 1 ? [styles.scorecardLast] : []),
          ]}
        >
          <Text style={[styles.scorecardLabel, { color }]}>{label}</Text>
          <Text style={[styles.scorecardValue, { color: brand.primaryColor }]}>
            {value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function MiniContents({ brand }: { brand: ReportBrand }) {
  return (
    <View>
      {[
        ["01", "Quarterly performance", "Full-year KPI results by quarter"],
        ["02", "Operational oversight", "Milestones and risk register"],
        ["03", "Annual narrative", "Impact reporting context and next steps"],
      ].map(([number, title, description]) => (
        <View
          key={number}
          style={{ flexDirection: "row", marginBottom: 10, alignItems: "center" }}
        >
          <Text
            style={{
              color: brand.secondaryColor,
              backgroundColor: brand.primaryColor,
              borderRadius: 5,
              padding: 7,
              width: 34,
              textAlign: "center",
              fontFamily: "Helvetica-Bold",
            }}
          >
            {number}
          </Text>
          <View style={{ marginLeft: 10 }}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10 }}>{title}</Text>
            <Text style={{ color: "#5E7087", fontSize: 9 }}>{description}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function KpiResultsTable({
  brand,
  data,
}: {
  brand: ReportBrand;
  data: KpiDashboardData;
}) {
  const headers = [
    ["Domain", styles.tableCellDomain],
    ["KPI", styles.tableCellKpi],
    ["Outcome", styles.tableCellOutcome],
    ["Target", styles.tableCellTarget],
    ...quarterValues.map((quarter) => [
      getQuarterPeriodLabel(data, quarter),
      styles.tableCellQuarter,
    ] as const),
    ["Progress", styles.tableCellProgress],
    ["Variance", styles.tableCellVariance],
    ["Full-year RAG", styles.tableCellRag],
  ] as const;

  return (
    <View style={styles.table}>
      <View style={[styles.tableRow, styles.tableHeaderRow]} wrap={false}>
        {headers.map(([label, width]) => (
          <View key={label} style={[styles.tableCell, styles.tableHeaderCell, width]}>
            <Text style={styles.tableHeaderText}>{label}</Text>
          </View>
        ))}
      </View>
      {data.kpis.length === 0 ? (
        <View style={styles.tableRow}>
          <Text style={[styles.tableText, { padding: 10 }]}>No KPIs have been added.</Text>
        </View>
      ) : (
        data.kpis.map((kpi) => <KpiResultRow key={kpi.id} data={data} kpi={kpi} />)
      )}
      <View style={[styles.callout, { backgroundColor: brand.primaryColor, marginTop: 12 }]}>
        <Text style={styles.calloutText}>
          RAG: GREEN = on target · AMBER = needs attention · RED = off track · N/A = not enough data.
        </Text>
      </View>
    </View>
  );
}

function KpiResultRow({ data, kpi }: { data: KpiDashboardData; kpi: KpiDefinition }) {
  const latest = getLatestResult(data, kpi.id);
  const progress = calculatePercentToTarget(latest?.result.currentValue ?? null, kpi.targetNumber);
  const variance = calculateVariance(latest?.result.currentValue ?? null, kpi.targetNumber);
  const assessment = data.assessments.find((item) => item.kpiId === kpi.id);

  return (
    <View style={styles.tableRow} wrap={false}>
      <TableTextCell style={styles.tableCellDomain} strong value={kpi.domain} />
      <TableTextCell style={styles.tableCellKpi} strong value={kpi.name} />
      <TableTextCell style={styles.tableCellOutcome} value={kpi.outcomeArea || "—"} />
      <TableTextCell
        style={styles.tableCellTarget}
        value={kpi.targetDisplay || formatNumber(kpi.targetNumber)}
      />
      {quarterValues.map((quarter) => {
        const result = data.results.find(
          (item) => item.kpiId === kpi.id && item.quarter === quarter,
        );
        const previous = quarter === 1
          ? null
          : data.results.find(
              (item) => item.kpiId === kpi.id && item.quarter === quarter - 1,
            );
        const trend = calculateTrend(result?.currentValue ?? null, previous?.currentValue ?? null);
        return (
          <View key={quarter} style={[styles.tableCell, styles.tableCellQuarter]}>
            <Text style={[styles.tableText, styles.quarterValue]}>
              {formatNumber(result?.currentValue)}
            </Text>
            <Text style={styles.tableMuted}>
              {trendLabel(trend)} · {ragLabels[result?.ragStatus ?? "na"]}
            </Text>
          </View>
        );
      })}
      <TableTextCell
        style={styles.tableCellProgress}
        strong
        value={`${formatPercent(progress)}${latest ? `\nLatest: Q${latest.quarter}` : ""}`}
      />
      <TableTextCell style={styles.tableCellVariance} value={formatNumber(variance)} />
      <TableTextCell
        style={styles.tableCellRag}
        strong
        value={ragLabels[assessment?.fullYearRag ?? "na"]}
      />
    </View>
  );
}

function TableTextCell({
  strong = false,
  style,
  value,
}: {
  strong?: boolean;
  style: PdfStyle;
  value: string;
}) {
  return (
    <View style={[styles.tableCell, style]}>
      <Text style={[styles.tableText, ...(strong ? [styles.tableStrong] : [])]}>
        {clean(value)}
      </Text>
    </View>
  );
}

function ReportTable({
  brand,
  columns,
  emptyMessage,
  rows,
}: {
  brand: ReportBrand;
  columns: string[];
  emptyMessage: string;
  rows: string[][];
}) {
  return (
    <View style={styles.table}>
      <View style={[styles.tableRow, styles.tableHeaderRow]} wrap={false}>
        {columns.map((column) => (
          <View key={column} style={[styles.tableCell, { width: `${100 / columns.length}%` }, styles.tableHeaderCell]}>
            <Text style={styles.tableHeaderText}>{column}</Text>
          </View>
        ))}
      </View>
      {rows.length === 0 ? (
        <View style={styles.tableRow}>
          <Text style={[styles.tableText, { padding: 10 }]}>{emptyMessage}</Text>
        </View>
      ) : (
        rows.map((row, rowIndex) => (
          <View key={`${row[0]}-${rowIndex}`} style={styles.tableRow}>
            {row.map((value, cellIndex) => (
              <View
                key={`${cellIndex}-${value}`}
                style={[
                  styles.tableCell,
                  { width: `${100 / columns.length}%` },
                  ...(cellIndex === row.length - 1
                    ? [{ borderRightWidth: 0 }]
                    : []),
                ]}
              >
                <Text
                  style={[
                    styles.tableText,
                    ...(cellIndex === 0 ? [styles.tableStrong] : []),
                  ]}
                >
                  {clean(value)}
                </Text>
              </View>
            ))}
          </View>
        ))
      )}
      <View style={[styles.callout, { backgroundColor: brand.secondaryColor, marginTop: 12 }]}>
        <Text style={{ color: "#46566D", fontSize: 8 }}>
          Values shown are the latest saved workspace data at the time this report was generated.
        </Text>
      </View>
    </View>
  );
}

function NarrativeSections({
  brand,
  summary,
}: {
  brand: ReportBrand;
  summary: KpiDashboardData["annualSummary"];
}) {
  const sections = [
    ["Overview", summary.overview],
    ["Key achievements", summary.achievements],
    ["Challenges and learning", summary.challenges],
    ["Stakeholder story", summary.stakeholderStory],
    ["Financial context", summary.financialContext],
    ["Risk response", summary.riskResponse],
    ["Next steps", summary.nextSteps],
  ];

  return (
    <View>
      {sections.map(([title, value]) => (
        <View key={title} style={[styles.narrative, { borderLeftColor: brand.primaryColor }]} wrap={false}>
          <Text style={[styles.narrativeTitle, { color: brand.primaryColor }]}>{title}</Text>
          <Text style={styles.narrativeText}>{clean(value || "Not provided.")}</Text>
        </View>
      ))}
    </View>
  );
}

function getScorecard(data: KpiDashboardData) {
  const statuses = data.kpis.map(
    (kpi) => data.assessments.find((assessment) => assessment.kpiId === kpi.id)?.fullYearRag ?? "na",
  );
  return {
    total: data.kpis.length,
    green: statuses.filter((status) => status === "green").length,
    amber: statuses.filter((status) => status === "amber").length,
    red: statuses.filter((status) => status === "red").length,
  };
}

function getLatestResult(data: KpiDashboardData, kpiId: string) {
  for (const quarter of [...quarterValues].reverse()) {
    const result = data.results.find(
      (item) => item.kpiId === kpiId && item.quarter === quarter && item.currentValue !== null,
    );
    if (result) return { quarter, result };
  }
  return null;
}

function getQuarterPeriodLabel(data: KpiDashboardData, quarter: QuarterNumber) {
  const months = data.quarters
    .filter((assignment) => assignment.quarter === quarter)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((assignment) => monthOptions.find((month) => month.value === assignment.monthNumber)?.label.slice(0, 3))
    .filter(Boolean) as string[];

  if (months.length === 0) return `Q${quarter}`;
  if (months.length === 1) return `Q${quarter} · ${months[0]}`;
  return `Q${quarter} · ${months[0]} – ${months[months.length - 1]}`;
}

function trendLabel(trend: ReturnType<typeof calculateTrend>) {
  return {
    improving: "Improving",
    declining: "Declining",
    stable: "Stable",
    not_available: "—",
  }[trend];
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "long",
  }).format(value);
}

function clean(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n?/g, "\n")
    .trim();
}
