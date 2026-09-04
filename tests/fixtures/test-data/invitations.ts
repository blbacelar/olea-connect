import type {
  CreatedOrganizationOwner,
  MailpitMessage,
  MailpitMessageDetails,
  PlatformRole,
  TeamInvitationState,
  TestDataManager,
} from "../test-data.fixture";

export async function getTeamInvitation(this: TestDataManager,
  owner: CreatedOrganizationOwner,
  email: string,
): Promise<TeamInvitationState> {
  const normalizedEmail = email.trim().toLowerCase();
  const { data: invitation, error: invitationError } = await this.supabase
    .from("organization_invitations")
    .select("id, status, accepted_by")
    .eq("organization_id", owner.organizationId)
    .eq("email", normalizedEmail)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (invitationError) throw invitationError;
  if (!invitation) throw new Error(`Invitation for ${normalizedEmail} was not found.`);

  const { data: event, error: eventError } = await this.supabase
    .from("integration_events")
    .select("payload")
    .eq("event_type", "organization.invitation.created")
    .eq("aggregate_type", "organization_invitation")
    .eq("aggregate_id", invitation.id)
    .maybeSingle();
  if (eventError) throw eventError;

  const rawToken =
    event?.payload &&
    typeof event.payload === "object" &&
    "token" in event.payload &&
    typeof event.payload.token === "string"
      ? event.payload.token
      : null;
  if (!rawToken) throw new Error("Invitation email event did not include a test token.");

  return {
    id: invitation.id as string,
    rawToken,
    status: invitation.status as TeamInvitationState["status"],
    acceptedBy: invitation.accepted_by as string | null,
  };
}

export async function getInvitedAccountUserId(this: TestDataManager, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  let page = 1;
  let userId: string | null = null;

  while (!userId) {
    const { data, error } = await this.supabase.auth.admin.listUsers({
      page,
      perPage: 1_000,
    });
    if (error) throw error;

    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === normalizedEmail,
    );
    if (user) {
      userId = user.id;
      break;
    }
    if (data.users.length < 1_000) break;
    page += 1;
  }

  if (!userId) throw new Error(`Invited account ${normalizedEmail} was not created.`);

  this.registerCleanup({
    label: `invited account ${userId}`,
    run: async () => {
      const { error: membershipError } = await this.supabase
        .from("organization_members")
        .delete()
        .eq("user_id", userId);
      if (membershipError) throw membershipError;

      await this.cleanupAuthUserDependencies(userId);
      const { error: deleteError } = await this.supabase.auth.admin.deleteUser(userId);
      if (deleteError && deleteError.status !== 404) throw deleteError;
    },
  });

  return userId;
}

export async function getAuthEmailConfirmationLink(this: TestDataManager, email: string) {
  const mailpitUrl = process.env.TEST_MAILPIT_URL?.replace(/\/$/, "");
  if (!mailpitUrl) {
    throw new Error("TEST_MAILPIT_URL is required to verify confirmation emails.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const response = await fetch(`${mailpitUrl}/api/v1/messages?limit=100`);
  if (!response.ok) {
    throw new Error(`Mailpit message lookup failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as { messages?: MailpitMessage[] };
  const message = payload.messages?.find((candidate) =>
    candidate.To?.some(
      (recipient) => recipient.Address?.toLowerCase() === normalizedEmail,
    ),
  );
  if (!message) throw new Error(`Confirmation email for ${normalizedEmail} was not found.`);

  const messageResponse = await fetch(`${mailpitUrl}/api/v1/message/${message.ID}`);
  if (!messageResponse.ok) {
    throw new Error(`Mailpit message ${message.ID} could not be loaded.`);
  }

  const details = (await messageResponse.json()) as MailpitMessageDetails;
  const content = `${details.HTML ?? ""}\n${details.Text ?? ""}`.replaceAll("&amp;", "&");
  const confirmationUrl = content.match(/https?:\/\/[^\s"'<]+\/auth\/v1\/verify\?[^\s"'<]+/i)?.[0];
  if (!confirmationUrl) {
    throw new Error(`Confirmation link for ${normalizedEmail} was not found in Mailpit.`);
  }

  return confirmationUrl;
}

export async function getOrganizationMembership(this: TestDataManager, organizationId: string, userId: string) {
  const { data, error } = await this.supabase
    .from("organization_members")
    .select("role, status")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function assignPlatformRole(this: TestDataManager,
  userId: string,
  role: PlatformRole = "community_admin",
) {
  const { error } = await this.supabase.from("platform_user_roles").insert({
    user_id: userId,
    role,
  });
  if (error) throw error;

  this.registerCleanup({
    label: `platform role ${role}/${userId}`,
    run: async () => {
      const { error: deleteError } = await this.supabase
        .from("platform_user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      if (deleteError) throw deleteError;
    },
  });
}

export async function authUserExists(this: TestDataManager, userId: string) {
  const { data, error } = await this.supabase.auth.admin.getUserById(userId);
  if (error) {
    if (error.status === 404 || error.code === "user_not_found") return false;
    throw error;
  }
  return Boolean(data.user);
}
