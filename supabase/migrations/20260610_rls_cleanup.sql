-- ============================================================
-- RLS CLEANUP — drop legacy permissive policies (audit A-1)
-- ============================================================
-- Live pg_policies inspection (2026-06-10) found pre-multi-tenant policies
-- still active on the core tables. RLS policies are permissive-OR, so a
-- single leftover USING(true) policy for {public} made products, companies,
-- quotations and quotation_items readable AND writable by ANYONE holding the
-- publishable anon key — no login required. The 20260315_multi_tenant
-- migration only dropped the policies it knew by name; these survived.
--
-- ⚠️ DEPLOY ORDER — DO NOT APPLY THIS MIGRATION BEFORE:
--   1. match-product edge function v10 is deployed (reads products via
--      service role; the anon-read policy it depended on is dropped here).
--   2. The Vercel app build containing the API-route auth changes
--      (commit "Wire authentication and tenant scoping into all API
--      routes") is live. The old build's API routes write as `anon` and
--      will start failing the moment the anon policies are gone.
--
-- Pre-flight verified on prod (2026-06-10): zero NULL tenant_id rows in
-- products / companies / quotations / quotation_items / import_history /
-- discount_rules, and public.get_tenant_id() + public.get_user_role()
-- both exist. The *_tenant_* policies that remain after this cleanup are
-- already in place on every affected table.

-- ---------- products (keep products_tenant_select/insert/update/delete) ----------
DROP POLICY IF EXISTS "Authenticated read"   ON public.products;
DROP POLICY IF EXISTS "Authenticated insert" ON public.products;
DROP POLICY IF EXISTS "Authenticated update" ON public.products;
DROP POLICY IF EXISTS "Authenticated delete" ON public.products;
DROP POLICY IF EXISTS "Enable read access for all users"   ON public.products;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.products;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.products;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.products;
DROP POLICY IF EXISTS "own_products" ON public.products;

-- ---------- companies (keep companies_tenant_*) ----------
DROP POLICY IF EXISTS "Authenticated all" ON public.companies;
DROP POLICY IF EXISTS "Enable read access for all users"   ON public.companies;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.companies;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.companies;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.companies;
DROP POLICY IF EXISTS "own_companies" ON public.companies;

-- ---------- quotations (keep quotations_tenant_*) ----------
DROP POLICY IF EXISTS "Authenticated all" ON public.quotations;
DROP POLICY IF EXISTS "Enable read access for all users"   ON public.quotations;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.quotations;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.quotations;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.quotations;
DROP POLICY IF EXISTS "own_quotations" ON public.quotations;

-- ---------- quotation_items (keep quotation_items_tenant_*) ----------
DROP POLICY IF EXISTS "Authenticated all" ON public.quotation_items;
DROP POLICY IF EXISTS "Enable read access for all users"   ON public.quotation_items;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.quotation_items;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.quotation_items;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.quotation_items;

-- ---------- import_history (keep import_history_tenant_insert/select) ----------
DROP POLICY IF EXISTS "Authenticated all" ON public.import_history;
DROP POLICY IF EXISTS "Enable read access for all users"   ON public.import_history;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.import_history;

-- ---------- match_analytics ----------
-- Keep: match_analytics_anon_insert (edge-function telemetry, deliberate),
--       match_analytics_auth_insert, match_analytics_tenant_select.
DROP POLICY IF EXISTS "Authenticated insert" ON public.match_analytics;
DROP POLICY IF EXISTS "Authenticated read"   ON public.match_analytics;
DROP POLICY IF EXISTS "Enable read access for all users"   ON public.match_analytics;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.match_analytics;

-- ---------- discount_rules: RLS was defined but never enabled ----------
-- (4 correct *_tenant_* policies already exist; they were inert.)
ALTER TABLE public.discount_rules ENABLE ROW LEVEL SECURITY;

-- ---------- exchange_rates: INSERT was WITH CHECK (true) for any user ----------
-- Policy was *named* admin_insert but enforced nothing (audit D-1).
DROP POLICY IF EXISTS "exchange_rates_admin_insert" ON public.exchange_rates;
CREATE POLICY "exchange_rates_admin_insert" ON public.exchange_rates
  FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'admin');

-- ============================================================
-- Post-apply verification (run manually):
--
-- 1. No permissive leftovers:
--    SELECT tablename, policyname, roles::text, qual, with_check
--    FROM pg_policies WHERE schemaname='public'
--      AND (qual = 'true' OR with_check = 'true')
--    ORDER BY tablename;
--    -- expected: only exchange_rates_public_select (SELECT USING true)
--    --           and match_analytics anon/auth INSERT (telemetry).
--
-- 2. RLS enabled everywhere:
--    SELECT tablename FROM pg_tables
--    WHERE schemaname='public' AND NOT rowsecurity;
--    -- expected: zero rows.
--
-- 3. Anon probe (with the publishable anon key, NO user token):
--    GET {SUPABASE_URL}/rest/v1/products?select=id&limit=1
--    -- expected: [] (empty), not data.
--
-- 4. App smoke test as a logged-in user: products list, Excel import,
--    quotation create/edit, match-product call, discounts settings page.
-- ============================================================
