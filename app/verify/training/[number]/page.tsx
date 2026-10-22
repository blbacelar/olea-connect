import { BadgeCheck, BadgeX } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { verifyTrainingCertificate } from "@/lib/data/board-training";
import { getRequestLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function VerifyTrainingCertificatePage(props: { params: Promise<{ number: string }> }) {
  const params = await props.params;
  const certificate = await verifyTrainingCertificate(params.number);
  const french = (await getRequestLocale()) === "fr-CA";
  return <div className="mx-auto max-w-lg py-12"><Card><CardHeader><CardTitle>{french ? "Vérification du certificat" : "Certificate verification"}</CardTitle></CardHeader><CardContent className="space-y-4">{certificate ? <><div className="flex items-center gap-2 text-lg font-semibold">{certificate.valid ? <BadgeCheck className="size-6 text-emerald-700" /> : <BadgeX className="size-6 text-amber-700" />}{certificate.valid ? french ? "Certificat valide" : "Valid certificate" : french ? "Certificat expiré" : "Expired certificate"}</div><p><strong>{certificate.display_name}</strong> · {certificate.organizationName}</p><p>{certificate.course_id === "essentials" ? french ? "Fondements de la gouvernance" : "Governance Essentials" : french ? "Mise à jour annuelle" : "Annual refresher"}</p><p className="text-sm text-slate-600">{certificate.certificate_number}</p><p className="text-sm text-slate-600">{french ? "Émis le" : "Issued"} {new Date(certificate.issued_at).toLocaleDateString(french ? "fr-CA" : "en-CA")} · {french ? "Expire le" : "Expires"} {new Date(certificate.expires_at).toLocaleDateString(french ? "fr-CA" : "en-CA")}</p></> : <div className="flex items-center gap-2"><BadgeX className="size-6 text-slate-500" /><p>{french ? "Certificat introuvable." : "Certificate not found."}</p></div>}</CardContent></Card></div>;
}
