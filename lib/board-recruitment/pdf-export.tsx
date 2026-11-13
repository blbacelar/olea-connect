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
import type { Locale } from "@/lib/i18n/locales";
import { translateRecruitmentReferenceName } from "@/lib/i18n/board-recruitment-fr";
import { normalizePdfBrand } from "@/lib/pdf/brand-export";
import { getEmbeddedLogo } from "@/lib/template-renderer/logo-data";
import { activeDirectorHolders } from "./metrics";
import { calculateTerm, coverageLevel, officerLabels } from "./domain";
import type { RecruitmentData, RecruitmentMember } from "./types";

const frenchReportText: Record<string, string> = {
  "Board recruitment report": "Rapport de recrutement au conseil",
  "Board Recruitment Toolkit": "Outil de recrutement au conseil",
  "Board Recruitment Report": "Rapport de recrutement au conseil",
  "Survey year:": "Année du sondage :",
  "Identified view": "Vue nominative",
  "Anonymous view": "Vue anonyme",
  "Generated": "Généré le",
  "Page": "Page",
  "of": "sur",
  "Executive summary": "Sommaire",
  "Board composition, skills coverage, succession planning, and recruitment priorities for the current survey year.": "Composition du conseil, couverture des compétences, planification de la relève et priorités de recrutement pour l'année du sondage en cours.",
  "Active directors": "Membres actifs du conseil",
  "Skills tracked": "Compétences suivies",
  "Recruitment priorities": "Priorités de recrutement",
  "Report context": "Contexte du rapport",
  "Names are included in this report.": "Les noms figurent dans ce rapport.",
  "Names are anonymized for this report.": "Les noms sont anonymisés dans ce rapport.",
  "Survey invitations and responses are scoped to the organization and survey year.": "Les invitations et réponses au sondage sont limitées à l'organisme et à l'année du sondage.",
  "Report contents": "Contenu du rapport",
  "Skills coverage, recruitment priorities, board terms, committee assignments, and survey invitation status are included in the following pages.": "Les pages suivantes présentent les compétences, les priorités de recrutement, les mandats, les comités et l'état des invitations au sondage.",
  "Skills coverage": "Couverture des compétences",
  "Current coverage across active directors and the skills that require recruitment attention.": "Compétences des membres actifs du conseil et lacunes à combler par le recrutement.",
  "No uncovered skills.": "Aucune compétence non couverte.",
  "Board terms & succession": "Mandats et relève du conseil",
  "Term calculations and succession status for active directors.": "Calcul des mandats et état de la relève des membres actifs du conseil.",
  "Committees & survey status": "Comités et état du sondage",
  "Committee assignments, chairs, invitation progress, and response progress.": "Composition des comités, présidences, invitations et réponses au sondage.",
  "Current strengths and recruitment gaps": "Forces actuelles et lacunes de recrutement",
  "Term calculations for active directors": "Calcul des mandats des membres actifs du conseil",
  "Assignments, invitations, and responses": "Affectations, invitations et réponses",
  "Category": "Catégorie",
  "Skill": "Compétence",
  "Holders": "Personnes compétentes",
  "Coverage": "Couverture",
  "Member": "Membre",
  "Role": "Rôle",
  "Term": "Mandat",
  "Status": "État",
  "Committee": "Comité",
  "Chair": "Présidence",
  "Members": "Membres",
  "Director": "Membre du conseil",
  "Invitation": "Invitation",
  "Response": "Réponse",
  "None": "Aucun",
  "Not set": "Non défini",
  "Not assigned": "Non attribué",
  "Not an officer": "Sans fonction au bureau",
  "Not invited": "Non invité",
  "Responded": "Réponse reçue",
  "Not submitted": "Non soumis",
  "holder(s)": "personne(s)",
  "member(s)": "membre(s)",
  "none": "aucune",
  "strong": "forte",
  "moderate": "moyenne",
  "gap": "lacune",
  "staff": "personnel",
  "continuing": "en cours",
  "standing": "à renouveler",
  "term-limited": "limite de mandat atteinte",
  "pending": "en attente",
  "sent": "envoyée",
  "responded": "réponse reçue",
  "Chair / President": "Présidence du conseil",
  "Vice Chair / President": "Vice-présidence du conseil",
  "Board Secretary": "Secrétariat du conseil",
  "Board Treasurer": "Trésorerie du conseil",
};

export function recruitmentReportText(locale: Locale, source: string) {
  return locale === "fr-CA" ? frenchReportText[source] ?? source : source;
}

function recruitmentFooter(brand: ReportBrand, title: string, locale: Locale) {
  const french = locale === "fr-CA";
  return [
    brand.organizationName,
    title,
    brand.address ? `${french ? "Adresse" : "Address"}: ${brand.address}` : null,
    brand.phone ? `${french ? "Téléphone" : "Phone"}: ${brand.phone}` : null,
    brand.contactEmail ? `${french ? "Courriel" : "Email"}: ${brand.contactEmail}` : null,
    brand.website ? `${french ? "Site Web" : "Web"}: ${brand.website.replace(/^https?:\/\//i, "").replace(/\/$/, "")}` : null,
  ].filter(Boolean).join(" • ");
}

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
    width: 92,
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
    width: 82,
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
  locale: Locale = "en-CA",
) {
  const t = (source: string) => recruitmentReportText(locale, source);
  const safeBrand: ReportBrand = normalizePdfBrand(
    brand,
    "#446B52",
    "#F4EFE4",
  ) as ReportBrand;
  const logo = getEmbeddedLogo(brand.logoUrl);
  const activeDirectors = data.members.filter(
    (member) => member.active && member.memberType === "director",
  );
  const gaps = data.skills.filter(
    (skill) => activeDirectorHolders(data, skill.id).length === 0,
  );
  const footer = recruitmentFooter(safeBrand, t("Board Recruitment Toolkit"), locale);

  return renderToBuffer(
    <Document
      title={`${data.workspace.organizationName} ${t("Board Recruitment Report")}`}
      author={data.workspace.organizationName}
      subject={t("Board recruitment report")}
      creator="Olea Connects™"
      producer="Olea Connects™"
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
          <Text style={styles.coverEyebrow}>{t("Board recruitment report")}</Text>
          <Text style={[styles.coverTitle, { color: safeBrand.primaryColor }]}>
            {t("Board Recruitment Toolkit")}
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
            {t("Survey year:")} {data.workspace.surveyYear}
            {"\n"}
            {t(identified ? "Identified view" : "Anonymous view")}
            {"\n"}
            {t("Generated")} {formatDate(new Date(), locale)}
          </Text>
        </View>
        <View style={styles.coverFooter}>
          <Text>{footer}</Text>
          <Text>{t("Page")} 1</Text>
        </View>
      </Page>

      <ReportPage brand={safeBrand} logoDataUrl={logo?.dataUrl} footer={footer} locale={locale}>
        <Text style={[styles.title, { color: safeBrand.primaryColor }]}>
          {t("Executive summary")}
        </Text>
        <Text style={styles.subtitle}>
          {t("Board composition, skills coverage, succession planning, and recruitment priorities for the current survey year.")}
        </Text>
        <View style={styles.statRow}>
          <Stat
            label={t("Active directors")}
            value={activeDirectors.length}
            brand={safeBrand}
          />
          <Stat
            label={t("Skills tracked")}
            value={data.skills.length}
            brand={safeBrand}
          />
          <Stat
            label={t("Recruitment priorities")}
            value={gaps.length}
            brand={safeBrand}
            last
          />
        </View>
        <View
          style={[styles.callout, { backgroundColor: safeBrand.primaryColor }]}
        >
          <Text style={styles.calloutLabel}>{t("Report context")}</Text>
          <Text style={styles.calloutText}>
            {identified
              ? t("Names are included in this report.")
              : t("Names are anonymized for this report.")}{" "}
            {t("Survey invitations and responses are scoped to the organization and survey year.")}
          </Text>
        </View>
        <Text style={[styles.sectionTitle, { color: safeBrand.primaryColor }]}>
          {t("Report contents")}
        </Text>
        <Text style={styles.sectionDescription}>
          {t("Skills coverage, recruitment priorities, board terms, committee assignments, and survey invitation status are included in the following pages.")}
        </Text>
        <Contents locale={locale} />
      </ReportPage>

      <ReportPage brand={safeBrand} logoDataUrl={logo?.dataUrl} footer={footer} locale={locale}>
        <Text style={[styles.title, { color: safeBrand.primaryColor }]}>
          {t("Skills coverage")}
        </Text>
        <Text style={styles.subtitle}>
          {t("Current coverage across active directors and the skills that require recruitment attention.")}
        </Text>
        <SkillsTable
          data={data}
          directors={activeDirectors}
          identified={identified}
          locale={locale}
        />
        <View style={styles.section} />
        <Text style={[styles.sectionTitle, { color: safeBrand.primaryColor }]}>
          {t("Recruitment priorities")}
        </Text>
        {gaps.length ? (
          <View style={styles.table}>
            {gaps.map((skill) => (
              <View key={skill.id} style={styles.row} wrap={false}>
                <Text style={[styles.cellText, styles.strong, { padding: 8 }]}>
                  {locale === "fr-CA" ? translateRecruitmentReferenceName(skill.categoryName) : skill.categoryName}
                </Text>
                <Text style={[styles.cellText, { padding: 8 }]}>
                  {locale === "fr-CA" ? translateRecruitmentReferenceName(skill.name, skill.isCustom) : skill.name}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>{t("No uncovered skills.")}</Text>
        )}
      </ReportPage>

      <ReportPage brand={safeBrand} logoDataUrl={logo?.dataUrl} footer={footer} locale={locale}>
        <Text style={[styles.title, { color: safeBrand.primaryColor }]}>
          {t("Board terms & succession")}
        </Text>
        <Text style={styles.subtitle}>
          {t("Term calculations and succession status for active directors.")}
        </Text>
        <TermsTable
          data={data}
          directors={activeDirectors}
          identified={identified}
          locale={locale}
        />
      </ReportPage>

      <ReportPage brand={safeBrand} logoDataUrl={logo?.dataUrl} footer={footer} locale={locale}>
        <Text style={[styles.title, { color: safeBrand.primaryColor }]}>
          {t("Committees & survey status")}
        </Text>
        <Text style={styles.subtitle}>
          {t("Committee assignments, chairs, invitation progress, and response progress.")}
        </Text>
        <CommitteeTable
          data={data}
          directors={activeDirectors}
          identified={identified}
          locale={locale}
        />
        <View style={styles.section} />
        <SurveyTable
          data={data}
          directors={activeDirectors}
          identified={identified}
          locale={locale}
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
  locale,
}: {
  brand: ReportBrand;
  children: React.ReactNode;
  footer: string;
  logoDataUrl?: string;
  locale: Locale;
}) {
  const t = (source: string) => recruitmentReportText(locale, source);
  return (
    <Page size="LETTER" style={styles.page} wrap>
      <View style={styles.header} fixed>
        <BrandMark brand={brand} logoDataUrl={logoDataUrl} />
        <Text style={styles.headerOrganization}>{brand.organizationName}</Text>
        <Text style={styles.headerTitle}>{t("Board Recruitment Toolkit")}</Text>
      </View>
      {children}
      <View style={styles.footerRule} fixed />
      <Text style={styles.footerText} fixed wrap={false}>
        {footer}
      </Text>
      <Text
        style={styles.footerPage}
        fixed
        render={({ pageNumber, totalPages }) => `${t("Page")} ${pageNumber} ${t("of")} ${totalPages}`}
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
          ? [{ width: 176, height: 72, borderRadius: 16, fontSize: 22 }]
          : []),
        { backgroundColor: brand.primaryColor },
      ]}
    >
      {logoDataUrl ? (
        <Image
          src={logoDataUrl}
          style={
            cover
              ? { width: 158, height: 56, objectFit: "contain" }
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

function Contents({ locale }: { locale: Locale }) {
  const t = (source: string) => recruitmentReportText(locale, source);
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
              {t(title)}
            </Text>
            <Text style={{ color: "#5E7087", fontSize: 9 }}>{t(description)}</Text>
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
  locale,
}: {
  data: RecruitmentData;
  directors: RecruitmentMember[];
  identified: boolean;
  locale: Locale;
}) {
  const t = (source: string) => recruitmentReportText(locale, source);
  return (
    <DataTable
      headers={[t("Category"), t("Skill"), t("Holders"), t("Coverage")]}
      widths={["25%", "25%", "35%", "15%"]}
    >
      {data.skills.map((skill) => {
        const holders = activeDirectorHolders(data, skill.id);
        return (
          <DataRow
            key={skill.id}
            cells={[
              locale === "fr-CA" ? translateRecruitmentReferenceName(skill.categoryName) : skill.categoryName,
              locale === "fr-CA" ? translateRecruitmentReferenceName(skill.name, skill.isCustom) : skill.name,
              identified
                ? holders.map((member) => member.fullName).join(", ") || t("None")
                : `${holders.length} ${t("holder(s)")}`,
              t(coverageLevel(holders.length, directors.length)),
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
  locale,
}: {
  data: RecruitmentData;
  directors: RecruitmentMember[];
  identified: boolean;
  locale: Locale;
}) {
  const t = (source: string) => recruitmentReportText(locale, source);
  return (
    <DataTable
      headers={[t("Member"), t("Role"), t("Term"), t("Status")]}
      widths={["30%", "25%", "20%", "25%"]}
    >
      {directors.map((member) => {
        const term = calculateTerm(member, data.workspace);
        return (
          <DataRow
            key={member.id}
            cells={[
              identified ? member.fullName : t("Director"),
              member.roleTitle || t(officerLabels[member.office] || "Director"),
              term.endYear ? String(term.endYear) : t("Not set"),
              t(term.status),
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
  locale,
}: {
  data: RecruitmentData;
  directors: RecruitmentMember[];
  identified: boolean;
  locale: Locale;
}) {
  const t = (source: string) => recruitmentReportText(locale, source);
  return (
    <DataTable
      headers={[t("Committee"), t("Chair"), t("Members")]}
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
                  : t("Director")
                : t("Not assigned"),
              members.length
                ? identified
                  ? members.map((member) => member.fullName).join(", ")
                  : `${members.length} ${t("member(s)")}`
                : t("None"),
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
  locale,
}: {
  data: RecruitmentData;
  directors: RecruitmentMember[];
  identified: boolean;
  locale: Locale;
}) {
  const t = (source: string) => recruitmentReportText(locale, source);
  return (
    <DataTable
      headers={[t("Director"), t("Invitation"), t("Response")]}
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
              identified ? member.fullName : t("Director"),
              t(invitation?.status || "Not invited"),
              t(responded ? "Responded" : "Not submitted"),
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

function formatDate(value: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
    value,
  );
}
