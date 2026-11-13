import { NextRequest, NextResponse } from "next/server";

import { getOptionalMemberContext } from "@/lib/data/member-context";
import { getStrategicWorkbookData } from "@/lib/data/strategic-workbook";
import { logError } from "@/lib/observability/logger";
import { quarterKeys } from "@/lib/strategic-planning/action-tracker";
import { buildStrategicDataCsv, buildStrategicWorkbookJson } from "@/lib/strategic-planning/data-export";
import { buildExportBaseName } from "@/lib/template-renderer/export-files";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getOptionalMemberContext();
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const kind = request.nextUrl.searchParams.get("kind");
  if (kind !== "tracker" && kind !== "budget" && kind !== "workbook") {
    return NextResponse.json({ error: "Choose a valid export." }, { status: 400 });
  }
  try {
    const data = await getStrategicWorkbookData();
    if (!data.hasAccess || !data.canManage) return NextResponse.json({ error: "Access denied." }, { status: 403 });
    if (!data.revision) return NextResponse.json({ error: "Save the workbook before exporting." }, { status: 409 });
    const brand = session.organization.brand;
    const base = buildExportBaseName({ organizationName: brand.organizationName,
      templateName: kind === "workbook" ? "Strategic workbook" : kind === "tracker" ? "Action tracker" : "Plan budget" });
    if (kind === "workbook") return new Response(buildStrategicWorkbookJson({ brand,
      revision: data.revision, values: data.values, actions: data.actions }), { headers: {
      "Cache-Control": "private, no-store", "Content-Disposition": `attachment; filename="${base}.json"`,
      "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff",
    } });
    const horizon = Number(data.values["set.horizon"] || 3);
    const quarter = request.nextUrl.searchParams.get("quarter") ?? "y1q1";
    if (!quarterKeys(horizon).includes(quarter)) {
      return NextResponse.json({ error: "Choose a quarter within the plan horizon." }, { status: 400 });
    }
    const csv = buildStrategicDataCsv({ kind, brand, actions: data.actions, quarter });
    return new Response(csv, { headers: {
      "Cache-Control": "private, no-store", "Content-Disposition": `attachment; filename="${base}.csv"`,
      "Content-Type": "text/csv; charset=utf-8", "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    logError("[strategic-planning] data export failed", error);
    return NextResponse.json({ error: "Could not generate this export right now." }, { status: 500 });
  }
}
