import { NextResponse } from "next/server";

import { getKpiDashboardData } from "@/lib/data/kpi-dashboard";
import { getOptionalMemberContext } from "@/lib/data/member-context";
import { createBrandingSnapshot } from "@/lib/data/brand-assets";
import { renderKpiDashboardPdfBuffer } from "@/lib/kpi-dashboard/pdf-export";
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

    const [data, brand] = await Promise.all([
      getKpiDashboardData(),
      createBrandingSnapshot(createAdminClient(), session.organization.brand),
    ]);
    const pdf = await renderKpiDashboardPdfBuffer(data, brand);
    const fileName = buildExportFileName({
      organizationName: data.dashboard.organizationName,
      templateName: data.dashboard.title,
      format: "pdf",
    });

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Type": "application/pdf",
      },
    });
  } catch (error) {
    console.error("[kpi-dashboard] PDF export failed", error);
    return NextResponse.json(
      { error: "Unable to generate the KPI report right now. Please try again." },
      { status: 500 },
    );
  }
}
