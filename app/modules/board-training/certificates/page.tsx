import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { BoardTrainingLocked } from "@/app/modules/board-training/_components/board-training-locked";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMyTrainingCertificates, hasTrainingAccess } from "@/lib/data/board-training";
import { getRequestLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function MyTrainingCertificatesPage() {
  const french = getRequestLocale() === "fr-CA";
  if (!(await hasTrainingAccess())) return <BoardTrainingLocked language={french ? "fr" : "en"} />;
  const certificates = await getMyTrainingCertificates();
  return <div className="mx-auto max-w-3xl space-y-6">
    <Button asChild variant="ghost" size="sm"><Link href="/modules/board-training"><ArrowLeft className="mr-2 size-4" />{french ? "Formation du conseil" : "Board training"}</Link></Button>
    <h1 className="text-3xl font-semibold tracking-tight text-teal-900">{french ? "Mes certificats" : "My certificates"}</h1>
    {certificates.length ? certificates.map((certificate) => <Card key={certificate.id}><CardHeader><CardTitle className="text-lg">{certificate.course_id === "essentials" ? french ? "Fondements de la gouvernance" : "Governance Essentials" : french ? "Mise à jour annuelle" : "Annual refresher"}</CardTitle></CardHeader><CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm"><div><p>{certificate.organizationName}</p><p className="text-slate-500">{certificate.certificate_number}</p><p className="text-slate-500">{french ? "Valide jusqu’au" : "Valid until"} {new Date(certificate.expires_at).toLocaleDateString(french ? "fr-CA" : "en-CA")}</p></div><Button asChild variant="outline"><Link href={`/api/board-training/certificates/${certificate.id}/pdf`}>{french ? "Télécharger le PDF" : "Download PDF"}</Link></Button></CardContent></Card>) : <p>{french ? "Aucun certificat pour le moment." : "No certificates yet."}</p>}
  </div>;
}
