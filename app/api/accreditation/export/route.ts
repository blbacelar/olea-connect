import { NextResponse } from "next/server";

import { getAccreditationWorkspaceData } from "@/lib/data/accreditation";
import { createBrandingSnapshot } from "@/lib/data/brand-assets";
import { getOptionalMemberContext } from "@/lib/data/member-context";
import { renderAccreditationPdfBuffer } from "@/lib/accreditation/pdf-export";
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
      getAccreditationWorkspaceData(),
      createBrandingSnapshot(createAdminClient(), session.organization.brand),
    ]);

    const pdf = await renderAccreditationPdfBuffer(data, brand);
    const fileName = buildExportFileName({
      organizationName: data.settings.organizationName || session.organization.name,
      templateName: "accreditation-preparation-workspace",
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
    console.error("[accreditation] PDF export failed", error);
    return NextResponse.json(
      { error: "Unable to generate the accreditation report right now. Please try again." },
      { status: 500 },
    );
  }
}
