import { NextResponse } from "next/server";

import { createBrandingSnapshot } from "@/lib/data/brand-assets";
import { getGrantPlatformData } from "@/lib/data/grant-platform";
import { getOptionalMemberContext } from "@/lib/data/member-context";
import { renderGrantBoardReportPdfBuffer } from "@/lib/grants/board-report-pdf";
import { getGrantPlatformUiAccess } from "@/lib/grants/permissions";
import { logError } from "@/lib/observability/logger";
import { buildExportFileName } from "@/lib/template-renderer/export-files";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getOptionalMemberContext();
    if (!session) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    if (!getGrantPlatformUiAccess(session.member.role).canViewReports) {
      return NextResponse.json({ error: "Report access is required." }, { status: 403 });
    }

    const [data, brand] = await Promise.all([
      getGrantPlatformData({ requireApplications: true }),
      createBrandingSnapshot(createAdminClient(), session.organization.brand),
    ]);
    const pdf = await renderGrantBoardReportPdfBuffer(data, brand);
    const fileName = buildExportFileName({
      organizationName: data.organizationName,
      templateName: "Grant Board Report",
      format: "pdf",
    });

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Type": "application/pdf",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logError("[grant-platform] Board report export failed", error);
    return NextResponse.json(
      { error: "Unable to generate the grant report right now." },
      { status: 500 },
    );
  }
}
