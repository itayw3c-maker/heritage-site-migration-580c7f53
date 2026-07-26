REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.tg_admin_emails_lower() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_auto_admin_from_allowlist() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_set_updated_at() FROM PUBLIC, anon, authenticated;