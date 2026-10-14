import { NextResponse } from "next/server";

import { renderTrainingCertificatePdf } from "@/lib/board-training/certificate-pdf";
import { getTrainingCertificateForDownload } from "@/lib/data/board-training";
import { getAppUrl } from "@/lib/email/server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(params.id)) return new NextResponse("Not found", { status: 404 });
    const { certificate, organizationName } = await getTrainingCertificateForDownload(params.id);
    const buffer = await renderTrainingCertificatePdf({
      displayName: certificate.display_name, organizationName,
      courseId: certificate.course_id, language: certificate.locale,
      certificateNumber: certificate.certificate_number, score: certificate.score,
      totalQuestions: certificate.total_questions, issuedAt: certificate.issued_at,
      expiresAt: certificate.expires_at,
      verificationUrl: `${getAppUrl()}/verify/training/${certificate.certificate_number}`,
    });
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${certificate.certificate_number}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
