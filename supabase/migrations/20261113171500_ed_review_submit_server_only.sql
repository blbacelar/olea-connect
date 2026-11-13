-- Anonymous clients submit through the server action, which validates the
-- campaign and removes direct identifiers before calling this RPC.
revoke all on function public.submit_ed_review_response(text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.submit_ed_review_response(text, text, jsonb)
  to service_role;
