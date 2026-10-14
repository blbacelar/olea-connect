import "server-only";

import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

import type { TrainingCourseId, TrainingLanguage } from "@/lib/board-training/content";

const styles = StyleSheet.create({
  page: { padding: 52, backgroundColor: "#FAF6EF", fontFamily: "Helvetica", color: "#1C2B30" },
  frame: { border: "2 solid #1D4E5F", padding: 40, minHeight: 660, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 12, letterSpacing: 3, color: "#A4500F", marginBottom: 25 },
  brand: { fontSize: 18, color: "#1D4E5F", marginBottom: 40 },
  title: { fontSize: 28, color: "#1D4E5F", textAlign: "center", marginBottom: 15 },
  name: { fontSize: 30, color: "#1D4E5F", textAlign: "center", marginVertical: 22 },
  body: { fontSize: 14, textAlign: "center", lineHeight: 1.5 },
  row: { flexDirection: "row", marginTop: 44, gap: 28 },
  detail: { fontSize: 10, color: "#5E625B", textAlign: "center", marginBottom: 6 },
  value: { fontSize: 12, textAlign: "center" },
  verification: { fontSize: 9, color: "#5E625B", marginTop: 34, textAlign: "center" },
});

export type CertificatePdfData = {
  displayName: string; organizationName: string; courseId: TrainingCourseId;
  language: TrainingLanguage; certificateNumber: string; score: number;
  totalQuestions: number; issuedAt: string; expiresAt: string; verificationUrl: string;
};

export async function renderTrainingCertificatePdf(data: CertificatePdfData) {
  const french = data.language === "fr";
  const locale = french ? "fr-CA" : "en-CA";
  const courseTitle = data.courseId === "essentials"
    ? (french ? "Fondements de la gouvernance" : "Governance Essentials")
    : (french ? "Mise à jour annuelle en gouvernance" : "Governance Refresher");
  const document = (
    <Document title={`${courseTitle} - ${data.displayName}`}>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.frame}>
          <Text style={styles.brand}>Olea Connects</Text>
          <Text style={styles.label}>{french ? "CERTIFICAT DE RÉUSSITE" : "CERTIFICATE OF COMPLETION"}</Text>
          <Text style={styles.body}>{french ? "Nous attestons que" : "This certifies that"}</Text>
          <Text style={styles.name}>{data.displayName}</Text>
          <Text style={styles.body}>{french ? `de ${data.organizationName} a réussi` : `of ${data.organizationName} has successfully completed`}</Text>
          <Text style={styles.title}>{courseTitle}</Text>
          <View style={styles.row}>
            <View><Text style={styles.detail}>{french ? "TERMINÉ LE" : "COMPLETED"}</Text><Text style={styles.value}>{new Date(data.issuedAt).toLocaleDateString(locale)}</Text></View>
            <View><Text style={styles.detail}>{french ? "RÉSULTAT" : "SCORE"}</Text><Text style={styles.value}>{data.score} / {data.totalQuestions}</Text></View>
            <View><Text style={styles.detail}>{french ? "À RENOUVELER" : "RENEW BY"}</Text><Text style={styles.value}>{new Date(data.expiresAt).toLocaleDateString(locale)}</Text></View>
          </View>
          <Text style={styles.verification}>{data.certificateNumber}{"\n"}{data.verificationUrl}</Text>
        </View>
      </Page>
    </Document>
  );
  return renderToBuffer(document);
}
