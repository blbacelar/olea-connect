import { NextResponse } from "next/server";
import * as z from "zod";

import { getOptionalMemberContext } from "@/lib/data/member-context";
import { logError } from "@/lib/observability/logger";
import { createAdminClient } from "@/utils/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { exportId: string } },
) {
  if (!z.string().uuid().safeParse(params.exportId).success) {
    return NextResponse.json({ error: "Export not found." }, { status: 404 });
  }

  try {
    const session = await getOptionalMemberContext();
    if (!session) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: record, error: recordError } = await admin
      .from("template_exports")
      .select("storage_path, file_name, format")
      .eq("id", params.exportId)
      .eq("organization_id", session.organization.id)
      .maybeSingle();

    if (recordError) throw recordError;
    if (!record) {
      return NextResponse.json({ error: "Export not found." }, { status: 404 });
    }
    if (typeof record.storage_path !== "string" ||
      !record.storage_path.startsWith(`${session.organization.id}/`) ||
      record.storage_path.split("/").some((segment: string) => segment === "." || segment === "..")) {
      return NextResponse.json({ error: "Export not found." }, { status: 404 });
    }

    const { data: file, error: downloadError } = await admin.storage
      .from("generated-documents")
      .download(record.storage_path);
    if (downloadError || !file) throw downloadError ?? new Error("Export file missing.");

    const { error: auditError } = await admin.from("template_export_downloads").insert({
      export_id: params.exportId,
      organization_id: session.organization.id,
      downloaded_by: session.member.id,
      metadata: { file_name: record.file_name },
    });
    if (auditError) throw auditError;

    const fileName = record.file_name.replace(/["\\\r\n]/g, "_");
    return new Response(new Uint8Array(await file.arrayBuffer()), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Type": record.format === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logError("[template-exports] Download failed", error);
    return NextResponse.json(
      { error: "Unable to download this export right now." },
      { status: 500 },
    );
  }
}
