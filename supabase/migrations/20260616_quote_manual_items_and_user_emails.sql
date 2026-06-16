-- ============================================
-- UX session 6: manual (off-catalog) quote line items + audit actor emails
-- Applied to prod via Supabase MCP apply_migration (CLI is on the wrong project).
-- ============================================

-- 1. Manual (off-catalog) line items + original list-price snapshot on quote lines.
--    product_id is already nullable in prod, so no FK change is needed. When a line
--    has no product_id, manual_name/manual_code/manual_unit hold its descriptive
--    fields; unit_price/currency are already stored on the row. list_price snapshots
--    the catalog list price so an overridden unit_price can be shown as "edited".
ALTER TABLE quotation_items
  ADD COLUMN IF NOT EXISTS manual_name TEXT,
  ADD COLUMN IF NOT EXISTS manual_code TEXT,
  ADD COLUMN IF NOT EXISTS manual_unit TEXT,
  ADD COLUMN IF NOT EXISTS list_price NUMERIC;

-- 2. Resolve audit-log actor (user_id) -> email, scoped to the caller's tenant.
--    SECURITY DEFINER so authenticated clients can map UUIDs to emails without
--    direct access to auth.users; the tenant_users join keeps it tenant-scoped.
CREATE OR REPLACE FUNCTION public.get_tenant_user_emails()
RETURNS TABLE(id UUID, email TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT u.id, u.email::text
  FROM auth.users u
  WHERE u.id IN (
    SELECT tu.user_id
    FROM public.tenant_users tu
    WHERE tu.tenant_id = public.get_tenant_id()
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_user_emails() TO authenticated;
