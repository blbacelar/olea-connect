import { NextResponse } from "next/server";

import { renderBoardRecruitmentPdfBuffer } from "@/lib/board-recruitment/pdf-export";
import { getBoardRecruitmentData } from "@/lib/data/board-recruitment";
import { createBrandingSnapshot } from "@/lib/data/brand-assets";
import { getOptionalMemberContext } from "@/lib/data/member-context";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const session = await getOptionalMemberContext();
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const identified = url.searchParams.get("view") !== "anonymous";
    const [data, brand] = await Promise.all([
      getBoardRecruitmentData(),
      createBrandingSnapshot(createAdminClient(), session.organization.brand),
    ]);
    const pdf = await renderBoardRecruitmentPdfBuffer(data, brand, identified);
    const organization =
      data.workspace.organizationName
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/(^-|-$)/g, "") || "organization";

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="${organization}-Board-Recruitment-Report-${data.workspace.surveyYear}.pdf"`,
        "Content-Type": "application/pdf",
      },
    });
  } catch (error) {
    console.error("[board-recruitment] PDF export failed", error);
    return NextResponse.json(
      {
        error:
          "Unable to generate the recruitment report right now. Please try again.",
      },
      { status: 500 },
    );
  }
}
