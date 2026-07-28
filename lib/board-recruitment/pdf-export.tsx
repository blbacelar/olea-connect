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
import { getEmbeddedLogo } from "@/lib/template-renderer/logo-data";
import { calculateTerm, coverageLevel, officerLabels } from "./domain";
import type { RecruitmentData, RecruitmentMember } from "./types";

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
  coverContent: {
    position: "absolute",
    left: 56,
    right: 56,
    bottom: 112,
  },
  coverEyebrow: {
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
    paddingTop: 88,
    paddingRight: 38,
    paddingBottom: 58,
    paddingLeft: 38,
    color: "#172033",
    fontFamily: "Helvetica",
    fontSize: 9,
    lineHeight: 1.4,
  },
  header: {
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
  logo: {
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
  logoImage: {
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
  title: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.2,
    marginBottom: 8,
  },
  subtitle: {
    color: "#5E7087",
    fontSize: 11,
    marginBottom: 18,
  },
  section: {
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
  statRow: {
    flexDirection: "row",
    marginBottom: 18,
  },
  stat: {
    width: "32%",
    marginRight: "2%",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DCE3E8",
    backgroundColor: "#F8FAFB",
  },
  statLast: { marginRight: 0 },
  statLabel: {
    color: "#718096",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  statValue: {
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
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#DCE3E8",
    minHeight: 32,
    alignItems: "stretch",
  },
  headerRow: {
    backgroundColor: "#334155",
    borderBottomColor: "#334155",
  },
  cell: {
    padding: 6,
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "#DCE3E8",
  },
  headerCell: { borderRightColor: "#64748B" },
  headerText: {
    color: "#FFFFFF",
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
  },
  cellText: { color: "#253247", fontSize: 7 },
  strong: { color: "#172033", fontFamily: "Helvetica-Bold" },
  muted: { color: "#64748B", fontSize: 7 },
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
    right: 38,
    top: 748,
    color: "#718096",
    fontSize: 7,
    textAlign: "center",
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
  calloutText: { color: "#FFFFFF", fontSize: 9 },
});

type ReportBrand = BrandProfile & {
  primaryColor: string;
  secondaryColor: string;
};

export async function renderBoardRecruitmentPdfBuffer(
  data: RecruitmentData,
  brand: BrandProfile,
  identified: boolean,
) {
  const safeBrand: ReportBrand = {
    ...brand,
    primaryColor: safeColor(brand.primaryColor, "#446B52"),
    secondaryColor: safeColor(brand.secondaryColor, "#F4EFE4"),
  };
  const logo = getEmbeddedLogo(brand.logoUrl);
  const activeDirectors = data.members.filter(
    (member) => member.active && member.memberType === "director",
  );
  const gaps = data.skills.filter(
    (skill) =>
      !data.responses.some(
        (response) => response.skillId === skill.id && response.hasSkill,
      ),
  );
  const footer = buildFooter(safeBrand);

  return renderToBuffer(
    <Document
      title={`${data.workspace.organizationName} Board Recruitment Report`}
      author={data.workspace.organizationName}
      subject="Board Recruitment Toolkit report"
      creator="Olea Connects"
      producer="Olea Connects"
    >
      <Page size="LETTER" style={styles.cover}>
        <View
          style={[
            styles.coverAccent,
            { backgroundColor: safeBrand.secondaryColor },
          ]}
        />
        <BrandMark
          brand={safeBrand}
          logoDataUrl={logo?.dataUrl}
          variant="cover"
        />
        <View style={styles.coverContent}>
          <Text style={styles.coverEyebrow}>Board recruitment report</Text>
          <Text style={[styles.coverTitle, { color: safeBrand.primaryColor }]}>
            Board Recruitment Toolkit
          </Text>
          <View
            style={[
              styles.coverRule,
              { backgroundColor: safeBrand.secondaryColor },
            ]}
          />
          <Text style={styles.coverOrganization}>
            {data.workspace.organizationName}
          </Text>
          <Text style={styles.coverMeta}>
            Survey year: {data.workspace.surveyYear}
            {"\n"}
            {identified ? "Identified view" : "Anonymous view"}
            {"\n"}
            Generated {formatDate(new Date())}
          </Text>
        </View>
        <View style={styles.coverFooter}>
          <Text>{footer}</Text>
          <Text>Page 1</Text>
        </View>
      </Page>

      <ReportPage brand={safeBrand} logoDataUrl={logo?.dataUrl} footer={footer}>
        <Text style={[styles.title, { color: safeBrand.primaryColor }]}>
          Executive summary
        </Text>
        <Text style={styles.subtitle}>
          Board composition, skills coverage, succession planning, and
          recruitment priorities for the current survey year.
        </Text>
        <View style={styles.statRow}>
          <Stat
            label="Active directors"
            value={activeDirectors.length}
            brand={safeBrand}
          />
          <Stat
            label="Skills tracked"
            value={data.skills.length}
            brand={safeBrand}
          />
          <Stat
            label="Recruitment priorities"
            value={gaps.length}
            brand={safeBrand}
            last
          />
        </View>
        <View
          style={[styles.callout, { backgroundColor: safeBrand.primaryColor }]}
        >
          <Text style={styles.calloutLabel}>Report context</Text>
          <Text style={styles.calloutText}>
            {identified
              ? "Names are included in this report."
              : "Names are anonymized for this report."}{" "}
            Survey invitations and responses are scoped to the organization and
            survey year.
          </Text>
        </View>
        <Text style={[styles.sectionTitle, { color: safeBrand.primaryColor }]}>
          Report contents
        </Text>
        <Text style={styles.sectionDescription}>
          Skills coverage, recruitment priorities, board terms, committee
          assignments, and survey invitation status are included in the
          following pages.
        </Text>
        <Contents />
      </ReportPage>

      <ReportPage brand={safeBrand} logoDataUrl={logo?.dataUrl} footer={footer}>
        <Text style={[styles.title, { color: safeBrand.primaryColor }]}>
          Skills coverage
        </Text>
        <Text style={styles.subtitle}>
          Current coverage across active directors and the skills that require
          recruitment attention.
        </Text>
        <SkillsTable
          data={data}
          directors={activeDirectors}
          identified={identified}
        />
        <View style={styles.section} />
        <Text style={[styles.sectionTitle, { color: safeBrand.primaryColor }]}>
          Recruitment priorities
        </Text>
        {gaps.length ? (
          <View style={styles.table}>
            {gaps.map((skill) => (
              <View key={skill.id} style={styles.row} wrap={false}>
                <Text style={[styles.cellText, styles.strong, { padding: 8 }]}>
                  {skill.categoryName}
                </Text>
                <Text style={[styles.cellText, { padding: 8 }]}>
                  {skill.name}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>No uncovered skills.</Text>
        )}
      </ReportPage>

      <ReportPage brand={safeBrand} logoDataUrl={logo?.dataUrl} footer={footer}>
        <Text style={[styles.title, { color: safeBrand.primaryColor }]}>
          Board terms & succession
        </Text>
        <Text style={styles.subtitle}>
          Term calculations and succession status for active directors.
        </Text>
        <TermsTable
          data={data}
          directors={activeDirectors}
          identified={identified}
        />
      </ReportPage>

      <ReportPage brand={safeBrand} logoDataUrl={logo?.dataUrl} footer={footer}>
        <Text style={[styles.title, { color: safeBrand.primaryColor }]}>
          Committees & survey status
        </Text>
        <Text style={styles.subtitle}>
          Committee assignments, chairs, invitation progress, and response
          progress.
        </Text>
        <CommitteeTable
          data={data}
          directors={activeDirectors}
          identified={identified}
        />
        <View style={styles.section} />
        <SurveyTable
          data={data}
          directors={activeDirectors}
          identified={identified}
        />
      </ReportPage>
    </Document>,
  );
}

function ReportPage({
  brand,
  children,
  footer,
  logoDataUrl,
}: {
  brand: ReportBrand;
  children: React.ReactNode;
  footer: string;
  logoDataUrl?: string;
}) {
  return (
    <Page size="LETTER" style={styles.page} wrap>
      <View style={styles.header} fixed>
        <BrandMark brand={brand} logoDataUrl={logoDataUrl} />
        <Text style={styles.headerOrganization}>{brand.organizationName}</Text>
        <Text style={styles.headerTitle}>Board Recruitment Toolkit</Text>
      </View>
      {children}
      <View style={styles.footerRule} fixed />
      <Text
        style={styles.footerText}
        fixed
        render={({ pageNumber, totalPages }) =>
          `${footer}  ·  Page ${pageNumber} of ${totalPages}`
        }
      />
    </Page>
  );
}

function BrandMark({
  brand,
  logoDataUrl,
  variant = "header",
}: {
  brand: ReportBrand;
  logoDataUrl?: string;
  variant?: "cover" | "header";
}) {
  const cover = variant === "cover";
  return (
    <View
      style={[
        styles.logo,
        ...(cover
          ? [{ width: 84, height: 84, borderRadius: 16, fontSize: 22 }]
          : []),
        { backgroundColor: brand.primaryColor },
      ]}
    >
      {logoDataUrl ? (
        // eslint-disable-next-line jsx-a11y/alt-text
        <Image
          src={logoDataUrl}
          style={
            cover
              ? { width: 70, height: 70, objectFit: "contain" }
              : styles.logoImage
          }
        />
      ) : (
        <Text>{brand.logoInitials || "OC"}</Text>
      )}
    </View>
  );
}

function Stat({
  label,
  value,
  brand,
  last = false,
}: {
  label: string;
  value: number;
  brand: ReportBrand;
  last?: boolean;
}) {
  return (
    <View style={[styles.stat, ...(last ? [styles.statLast] : [])]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: brand.primaryColor }]}>
        {value}
      </Text>
    </View>
  );
}

function Contents() {
  return (
    <View>
      {[
        ["01", "Skills coverage", "Current strengths and recruitment gaps"],
        [
          "02",
          "Board terms & succession",
          "Term calculations for active directors",
        ],
        [
          "03",
          "Committees & survey status",
          "Assignments, invitations, and responses",
        ],
      ].map(([number, title, description]) => (
        <View
          key={number}
          style={{
            flexDirection: "row",
            marginBottom: 10,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "#F4EFE4",
              backgroundColor: "#446B52",
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
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10 }}>
              {title}
            </Text>
            <Text style={{ color: "#5E7087", fontSize: 9 }}>{description}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function SkillsTable({
  data,
  directors,
  identified,
}: {
  data: RecruitmentData;
  directors: RecruitmentMember[];
  identified: boolean;
}) {
  return (
    <DataTable
      headers={["Category", "Skill", "Holders", "Coverage"]}
      widths={["25%", "25%", "35%", "15%"]}
    >
      {data.skills.map((skill) => {
        const holders = directors.filter((member) =>
          data.responses.some(
            (response) =>
              response.memberId === member.id &&
              response.skillId === skill.id &&
              response.hasSkill,
          ),
        );
        return (
          <DataRow
            key={skill.id}
            cells={[
              skill.categoryName,
              skill.name,
              identified
                ? holders.map((member) => member.fullName).join(", ") || "None"
                : `${holders.length} holder(s)`,
              coverageLevel(holders.length, directors.length),
            ]}
            widths={["25%", "25%", "35%", "15%"]}
          />
        );
      })}
    </DataTable>
  );
}

function TermsTable({
  data,
  directors,
  identified,
}: {
  data: RecruitmentData;
  directors: RecruitmentMember[];
  identified: boolean;
}) {
  return (
    <DataTable
      headers={["Member", "Role", "Term", "Status"]}
      widths={["30%", "25%", "20%", "25%"]}
    >
      {directors.map((member) => {
        const term = calculateTerm(member, data.workspace);
        return (
          <DataRow
            key={member.id}
            cells={[
              identified ? member.fullName : "Director",
              member.roleTitle || officerLabels[member.office] || "Director",
              term.endYear ? String(term.endYear) : "Not set",
              term.status,
            ]}
            widths={["30%", "25%", "20%", "25%"]}
          />
        );
      })}
    </DataTable>
  );
}

function CommitteeTable({
  data,
  directors,
  identified,
}: {
  data: RecruitmentData;
  directors: RecruitmentMember[];
  identified: boolean;
}) {
  return (
    <DataTable
      headers={["Committee", "Chair", "Members"]}
      widths={["35%", "30%", "35%"]}
    >
      {data.committees.map((committee) => {
        const chair = directors.find(
          (member) => member.id === committee.chairId,
        );
        const members = committee.memberIds
          .map((id) => directors.find((member) => member.id === id))
          .filter(Boolean) as RecruitmentMember[];
        return (
          <DataRow
            key={committee.id}
            cells={[
              committee.name,
              chair
                ? identified
                  ? chair.fullName
                  : "Director"
                : "Not assigned",
              members.length
                ? identified
                  ? members.map((member) => member.fullName).join(", ")
                  : `${members.length} member(s)`
                : "None",
            ]}
            widths={["35%", "30%", "35%"]}
          />
        );
      })}
    </DataTable>
  );
}

function SurveyTable({
  data,
  directors,
  identified,
}: {
  data: RecruitmentData;
  directors: RecruitmentMember[];
  identified: boolean;
}) {
  return (
    <DataTable
      headers={["Director", "Invitation", "Response"]}
      widths={["45%", "25%", "30%"]}
    >
      {directors.map((member) => {
        const invitation = data.invitations.find(
          (item) => item.memberId === member.id,
        );
        const responded = data.responses.some(
          (response) => response.memberId === member.id,
        );
        return (
          <DataRow
            key={member.id}
            cells={[
              identified ? member.fullName : "Director",
              invitation?.status || "Not invited",
              responded ? "Responded" : "Not submitted",
            ]}
            widths={["45%", "25%", "30%"]}
          />
        );
      })}
    </DataTable>
  );
}

function DataTable({
  children,
  headers,
  widths,
}: {
  children: React.ReactNode;
  headers: string[];
  widths: string[];
}) {
  return (
    <View style={styles.table}>
      <View style={[styles.row, styles.headerRow]} wrap={false}>
        {headers.map((header, index) => (
          <View
            key={header}
            style={[styles.cell, styles.headerCell, { width: widths[index] }]}
          >
            <Text style={styles.headerText}>{header}</Text>
          </View>
        ))}
      </View>
      {children}
    </View>
  );
}

function DataRow({ cells, widths }: { cells: string[]; widths: string[] }) {
  return (
    <View style={styles.row} wrap={false}>
      {cells.map((cell, index) => (
        <View
          key={`${index}-${cell}`}
          style={[styles.cell, { width: widths[index] }]}
        >
          <Text
            style={[styles.cellText, ...(index === 1 ? [styles.strong] : [])]}
          >
            {cell || "—"}
          </Text>
        </View>
      ))}
    </View>
  );
}

function buildFooter(brand: ReportBrand) {
  return [
    brand.organizationName,
    brand.address ? `Address: ${brand.address}` : null,
    brand.phone ? `Phone: ${brand.phone}` : null,
    brand.contactEmail ? `Email: ${brand.contactEmail}` : null,
    brand.website ? `Web: ${brand.website.replace(/^https?:\/\//i, "")}` : null,
  ]
    .filter(Boolean)
    .join("  |  ");
}

function safeColor(value: string | undefined, fallback: string) {
  return /^#[0-9a-f]{6}$/i.test(value ?? "") ? value! : fallback;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(
    value,
  );
}
