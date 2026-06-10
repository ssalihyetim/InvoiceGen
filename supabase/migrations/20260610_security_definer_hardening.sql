-- Follow-up to 20260610_rls_cleanup (audit A-1): SECURITY DEFINER surface
-- hardening. Applied to prod 2026-06-10 (history version 20260610133220).
--
-- 1. products_searchable view ran as its owner (postgres), so it bypassed
--    the products RLS and leaked the full catalog (codes + prices) to the
--    anon role even after the legacy policies were dropped. Nothing in the
--    app or edge function reads this view (verified by code search); switch
--    it to security_invoker so the caller's RLS applies.
ALTER VIEW public.products_searchable SET (security_invoker = true);

-- 2. Cron/maintenance functions were executable by anon via PostgREST RPC.
--    They are SECURITY DEFINER and act across ALL tenants; only the
--    service-role cron path should run them.
REVOKE EXECUTE ON FUNCTION public.expire_overdue_quotations() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_expiring_quotations() FROM PUBLIC, anon, authenticated;

-- 3. Trigger functions never need caller EXECUTE (Postgres checks EXECUTE
--    on trigger functions at trigger-creation time, not at fire time), but
--    being callable via /rest/v1/rpc/* is pointless surface. Revoke.
REVOKE EXECUTE ON FUNCTION public.audit_trigger_fn() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_tenant_id() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_quotation_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_products_search_text() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_quotation_number() FROM PUBLIC, anon, authenticated;

-- 4. RLS helper functions: keep authenticated (tenant policies evaluate
--    them per-query) but anon has no policy that references them.
REVOKE EXECUTE ON FUNCTION public.get_tenant_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM anon;

-- Kept deliberately: create_tenant_with_admin stays anon-executable because
-- the signup page calls it immediately after auth.signUp, which may not yet
-- have a session when email confirmation is enabled. It only creates new
-- tenants; it cannot read or modify existing tenant data.
