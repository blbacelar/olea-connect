-- Production has default privileges for new public tables. Board Training is
-- accessed only through authenticated server actions using the service role.
-- Revoke browser grants explicitly so this holds in every environment.
revoke all privileges on table
  public.board_training_settings,
  public.board_training_enrollments,
  public.board_training_attempts,
  public.board_training_declarations,
  public.board_training_certificates,
  public.board_training_invitations,
  public.board_training_documents
from public, anon, authenticated;

grant all privileges on table
  public.board_training_settings,
  public.board_training_enrollments,
  public.board_training_attempts,
  public.board_training_declarations,
  public.board_training_certificates,
  public.board_training_invitations,
  public.board_training_documents
to service_role;
