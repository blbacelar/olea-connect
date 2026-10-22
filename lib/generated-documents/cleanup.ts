import { createAdminClient } from "@/utils/supabase/admin";

export const GENERATED_DOCUMENTS_BUCKET = "generated-documents";
export const DEFAULT_GENERATED_DOCUMENT_RETENTION_HOURS = 24;
export const GENERATED_DOCUMENT_CLEANUP_LIMIT = 250;
const STORAGE_DELETE_BATCH_SIZE = 100;
const EXPORT_DELETE_BATCH_SIZE = 100;

export type GeneratedDocumentCleanupCandidate = {
  id: string;
  storage_path: string;
};

export type GeneratedDocumentCleanupSummary = {
  bucket: typeof GENERATED_DOCUMENTS_BUCKET;
  cutoff: string;
  deletedExports: number;
  deletedFiles: number;
  dryRun: boolean;
  matchedExports: number;
  retentionHours: number;
};

export function parseGeneratedDocumentRetentionHours(value?: string | null) {
  if (!value) return DEFAULT_GENERATED_DOCUMENT_RETENTION_HOURS;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_GENERATED_DOCUMENT_RETENTION_HOURS;
  }

  return parsed;
}

export function getGeneratedDocumentCleanupCutoff({
  now = new Date(),
  retentionHours,
}: {
  now?: Date;
  retentionHours: number;
}) {
  return new Date(now.getTime() - retentionHours * 60 * 60 * 1000);
}

export function chunkArray<Value>(values: Value[], chunkSize: number) {
  const chunks: Value[][] = [];

  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }

  return chunks;
}

export async function cleanupGeneratedDocuments({
  dryRun = false,
  now = new Date(),
  retentionHours = parseGeneratedDocumentRetentionHours(
    process.env.GENERATED_DOCUMENT_RETENTION_HOURS,
  ),
}: {
  dryRun?: boolean;
  now?: Date;
  retentionHours?: number;
} = {}): Promise<GeneratedDocumentCleanupSummary> {
  const supabase = createAdminClient();
  const cutoff = getGeneratedDocumentCleanupCutoff({ now, retentionHours });
  const cutoffIso = cutoff.toISOString();

  const { data: candidates, error: candidateError } = await supabase
    .from("template_exports")
    .select("id, storage_path")
    .lte("generated_at", cutoffIso)
    .order("generated_at", { ascending: true })
    .limit(GENERATED_DOCUMENT_CLEANUP_LIMIT);

  if (candidateError) throw candidateError;

  const exportCandidates =
    (candidates as GeneratedDocumentCleanupCandidate[] | null) ?? [];
  const storagePaths = exportCandidates
    .map((candidate) => candidate.storage_path)
    .filter(Boolean);
  const exportIds = exportCandidates.map((candidate) => candidate.id);

  if (dryRun || exportCandidates.length === 0) {
    return {
      bucket: GENERATED_DOCUMENTS_BUCKET,
      cutoff: cutoffIso,
      deletedExports: dryRun ? 0 : exportCandidates.length,
      deletedFiles: 0,
      dryRun,
      matchedExports: exportCandidates.length,
      retentionHours,
    };
  }

  let deletedFiles = 0;
  for (const pathBatch of chunkArray(storagePaths, STORAGE_DELETE_BATCH_SIZE)) {
    const { data: removedFiles, error: removeError } = await supabase.storage
      .from(GENERATED_DOCUMENTS_BUCKET)
      .remove(pathBatch);

    if (removeError) throw removeError;
    deletedFiles += removedFiles?.length ?? pathBatch.length;
  }

  for (const idBatch of chunkArray(exportIds, EXPORT_DELETE_BATCH_SIZE)) {
    const { error: deleteError } = await supabase
      .from("template_exports")
      .delete()
      .in("id", idBatch);

    if (deleteError) throw deleteError;
  }

  return {
    bucket: GENERATED_DOCUMENTS_BUCKET,
    cutoff: cutoffIso,
    deletedExports: exportCandidates.length,
    deletedFiles,
    dryRun,
    matchedExports: exportCandidates.length,
    retentionHours,
  };
}
