import type {
  CreatedOrganizationOwner,
  CreatedTemplateExport,
  CreatedTemplateExportDownload,
  CreatedTemplateInstance,
  TestDataManager,
} from "../test-data.fixture";

export async function getTemplateExportCounts(this: TestDataManager, organizationId: string) {
  const { count: exportsCount, error: exportsError } = await this.supabase
    .from("template_exports")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);
  if (exportsError) throw exportsError;

  const { count: downloadsCount, error: downloadsError } = await this.supabase
    .from("template_export_downloads")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);
  if (downloadsError) throw downloadsError;

  return {
    exports: exportsCount ?? 0,
    downloads: downloadsCount ?? 0,
  };
}

export async function getFirstResourceId(this: TestDataManager) {
  const { data, error } = await this.supabase
    .from("resources")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function createTemplateInstance(this: TestDataManager,
  owner: CreatedOrganizationOwner,
  options: {
    title?: string;
  } = {},
): Promise<CreatedTemplateInstance> {
  const resourceId = await this.getFirstResourceId();
  const title = options.title ?? `Security template ${owner.marker}`;
  const { data, error } = await this.supabase
    .from("template_instances")
    .insert({
      organization_id: owner.organizationId,
      resource_id: resourceId,
      created_by: owner.userId,
      title,
      status: "draft",
      form_data: {},
      branding_snapshot: {
        organizationName: owner.organizationName,
      },
      definition_version: 1,
      schema_snapshot: {},
      completion_percent: 0,
    })
    .select("id")
    .single();

  if (error) throw error;
  const templateInstanceId = data.id as string;

  this.registerCleanup({
    label: `template instance ${templateInstanceId}`,
    run: async () => {
      const { error: deleteError } = await this.supabase
        .from("template_instances")
        .delete()
        .eq("id", templateInstanceId);
      if (deleteError) throw deleteError;
    },
  });

  return {
    id: templateInstanceId,
    organizationId: owner.organizationId,
    resourceId,
    title,
  };
}

export async function createTemplateExport(this: TestDataManager,
  owner: CreatedOrganizationOwner,
  templateInstance: CreatedTemplateInstance,
): Promise<CreatedTemplateExport> {
  const { data, error } = await this.supabase
    .from("template_exports")
    .insert({
      template_instance_id: templateInstance.id,
      organization_id: owner.organizationId,
      resource_id: templateInstance.resourceId,
      created_by: owner.userId,
      format: "pdf",
      file_name: `${owner.marker}-security-export.pdf`,
      storage_path: `${owner.organizationId}/${templateInstance.id}/${owner.marker}.pdf`,
      definition_version: 1,
      schema_snapshot: {},
      form_data_snapshot: {},
      branding_snapshot: {
        organizationName: owner.organizationName,
      },
      checksum_sha256:
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    })
    .select("id")
    .single();

  if (error) throw error;
  const templateExportId = data.id as string;

  this.registerCleanup({
    label: `template export ${templateExportId}`,
    run: async () => {
      const { error: deleteError } = await this.supabase
        .from("template_exports")
        .delete()
        .eq("id", templateExportId);
      if (deleteError) throw deleteError;
    },
  });

  return {
    id: templateExportId,
    organizationId: owner.organizationId,
    resourceId: templateInstance.resourceId,
    templateInstanceId: templateInstance.id,
  };
}

export async function createTemplateExportDownload(this: TestDataManager,
  owner: CreatedOrganizationOwner,
  templateExport: CreatedTemplateExport,
): Promise<CreatedTemplateExportDownload> {
  const { data, error } = await this.supabase
    .from("template_export_downloads")
    .insert({
      export_id: templateExport.id,
      organization_id: owner.organizationId,
      downloaded_by: owner.userId,
      metadata: { file_name: `${owner.marker}-security-export.pdf` },
    })
    .select("id")
    .single();

  if (error) throw error;
  const downloadId = data.id as string;

  this.registerCleanup({
    label: `template export download ${downloadId}`,
    run: async () => {
      const { error: deleteError } = await this.supabase
        .from("template_export_downloads")
        .delete()
        .eq("id", downloadId);
      if (deleteError) throw deleteError;
    },
  });

  return {
    id: downloadId,
    exportId: templateExport.id,
    organizationId: owner.organizationId,
  };
}

export async function createWorkspaceProvisioningRequest(this: TestDataManager, owner: CreatedOrganizationOwner) {
  const { data, error } = await this.supabase
    .from("workspace_provisioning_requests")
    .insert({
      user_id: owner.userId,
      email: owner.email,
      full_name: "QA Owner",
      organization_name: owner.organizationName,
      province_or_region: "AB",
      plan_id: "roots",
      billing_interval: "month",
      status: "processing",
      checkout_session_id: `cs_test_${owner.marker}`,
      provider_customer_id: `cus_${owner.marker}`,
      provider_subscription_id: `sub_${owner.marker}`,
      provider_status: "active",
      payment_confirmed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) throw error;
  const requestId = data.id as string;

  this.registerCleanup({
    label: `workspace provisioning request ${requestId}`,
    run: async () => {
      const { error: deleteError } = await this.supabase
        .from("workspace_provisioning_requests")
        .delete()
        .eq("id", requestId);
      if (deleteError) throw deleteError;
    },
  });

  return requestId;
}
