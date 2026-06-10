-- ============================================
-- FAZ 1: Multi-Tenant Migration
-- Adds tenants, tenant_users tables
-- Adds tenant_id to all existing tables
-- Rewrites RLS policies for tenant isolation
-- ============================================

-- 1. Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',  -- logo_url, terms, pdf_template, default_validity_days
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create tenant_users table (links auth.users to tenants with roles)
CREATE TABLE IF NOT EXISTS tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin','manager','sales','accountant','viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

-- 3. Helper function: get current user's tenant_id
-- NOT: auth schema'ya yazma izni olmadığı için public schema'da oluşturuluyor
CREATE OR REPLACE FUNCTION public.get_tenant_id() RETURNS UUID AS $$
  SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 4. Helper function: get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role() RETURNS TEXT AS $$
  SELECT role FROM public.tenant_users WHERE user_id = auth.uid() AND tenant_id = public.get_tenant_id() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 5. Add tenant_id to existing tables (nullable first for migration)
ALTER TABLE products ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE discount_rules ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE import_history ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE match_analytics ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- 6. Add created_by (user_id) to key tables for ownership tracking
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 7. Create default tenant and assign existing data
DO $$
DECLARE
  default_tenant_id UUID;
BEGIN
  -- Create default tenant if not exists
  INSERT INTO tenants (name, slug, settings)
  VALUES ('Varsayilan Firma', 'default', '{"is_default": true}')
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO default_tenant_id;

  -- If tenant already existed, get its id
  IF default_tenant_id IS NULL THEN
    SELECT id INTO default_tenant_id FROM tenants WHERE slug = 'default';
  END IF;

  -- Assign all existing data to default tenant
  UPDATE products SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE companies SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE quotations SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE quotation_items SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE discount_rules SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE import_history SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
  UPDATE match_analytics SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;

  -- Assign all existing auth users to default tenant as admin
  INSERT INTO tenant_users (tenant_id, user_id, role)
  SELECT default_tenant_id, id, 'admin'
  FROM auth.users
  ON CONFLICT (tenant_id, user_id) DO NOTHING;
END $$;

-- 8. Make tenant_id NOT NULL after data migration
ALTER TABLE products ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE companies ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE quotations ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE quotation_items ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE discount_rules ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE import_history ALTER COLUMN tenant_id SET NOT NULL;
-- match_analytics stays nullable (edge function may not have tenant context)

-- 9. Create indexes for tenant_id
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_companies_tenant_id ON companies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotations_tenant_id ON quotations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_tenant_id ON quotation_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_discount_rules_tenant_id ON discount_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_import_history_tenant_id ON import_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON tenant_users(tenant_id);

-- 10. Drop old permissive policies
DROP POLICY IF EXISTS "products_select" ON products;
DROP POLICY IF EXISTS "products_insert" ON products;
DROP POLICY IF EXISTS "products_update" ON products;
DROP POLICY IF EXISTS "products_delete" ON products;
DROP POLICY IF EXISTS "companies_select" ON companies;
DROP POLICY IF EXISTS "companies_insert" ON companies;
DROP POLICY IF EXISTS "companies_update" ON companies;
DROP POLICY IF EXISTS "companies_delete" ON companies;
DROP POLICY IF EXISTS "quotations_select" ON quotations;
DROP POLICY IF EXISTS "quotations_insert" ON quotations;
DROP POLICY IF EXISTS "quotations_update" ON quotations;
DROP POLICY IF EXISTS "quotations_delete" ON quotations;
DROP POLICY IF EXISTS "quotation_items_select" ON quotation_items;
DROP POLICY IF EXISTS "quotation_items_insert" ON quotation_items;
DROP POLICY IF EXISTS "quotation_items_update" ON quotation_items;
DROP POLICY IF EXISTS "quotation_items_delete" ON quotation_items;
DROP POLICY IF EXISTS "import_history_select" ON import_history;
DROP POLICY IF EXISTS "import_history_insert" ON import_history;
DROP POLICY IF EXISTS "match_analytics_select" ON match_analytics;
DROP POLICY IF EXISTS "match_analytics_insert" ON match_analytics;
DROP POLICY IF EXISTS "discount_rules_select" ON discount_rules;
DROP POLICY IF EXISTS "discount_rules_insert" ON discount_rules;
DROP POLICY IF EXISTS "discount_rules_update" ON discount_rules;
DROP POLICY IF EXISTS "discount_rules_delete" ON discount_rules;
-- Also drop any "Allow all" style policies
DROP POLICY IF EXISTS "Allow all for authenticated" ON products;
DROP POLICY IF EXISTS "Allow all for authenticated" ON companies;
DROP POLICY IF EXISTS "Allow all for authenticated" ON quotations;
DROP POLICY IF EXISTS "Allow all for authenticated" ON quotation_items;
DROP POLICY IF EXISTS "Allow all for authenticated" ON import_history;
DROP POLICY IF EXISTS "Allow all for authenticated" ON match_analytics;
DROP POLICY IF EXISTS "Allow all for authenticated" ON discount_rules;

-- 11. Enable RLS on new tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

-- 12. Tenant-isolated RLS policies

-- tenants: users can only see their own tenant
CREATE POLICY "tenants_select" ON tenants FOR SELECT TO authenticated
  USING (id = public.get_tenant_id());

-- tenant_users: users can see members of their tenant
CREATE POLICY "tenant_users_select" ON tenant_users FOR SELECT TO authenticated
  USING (tenant_id = public.get_tenant_id());
CREATE POLICY "tenant_users_insert" ON tenant_users FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_tenant_id() AND public.get_user_role() = 'admin');
CREATE POLICY "tenant_users_update" ON tenant_users FOR UPDATE TO authenticated
  USING (tenant_id = public.get_tenant_id() AND public.get_user_role() = 'admin');
CREATE POLICY "tenant_users_delete" ON tenant_users FOR DELETE TO authenticated
  USING (tenant_id = public.get_tenant_id() AND public.get_user_role() = 'admin');

-- products: full tenant isolation
CREATE POLICY "products_tenant_select" ON products FOR SELECT TO authenticated
  USING (tenant_id = public.get_tenant_id());
CREATE POLICY "products_tenant_insert" ON products FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_tenant_id());
CREATE POLICY "products_tenant_update" ON products FOR UPDATE TO authenticated
  USING (tenant_id = public.get_tenant_id());
CREATE POLICY "products_tenant_delete" ON products FOR DELETE TO authenticated
  USING (tenant_id = public.get_tenant_id());

-- companies: full tenant isolation
CREATE POLICY "companies_tenant_select" ON companies FOR SELECT TO authenticated
  USING (tenant_id = public.get_tenant_id());
CREATE POLICY "companies_tenant_insert" ON companies FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_tenant_id());
CREATE POLICY "companies_tenant_update" ON companies FOR UPDATE TO authenticated
  USING (tenant_id = public.get_tenant_id());
CREATE POLICY "companies_tenant_delete" ON companies FOR DELETE TO authenticated
  USING (tenant_id = public.get_tenant_id());

-- quotations: full tenant isolation
CREATE POLICY "quotations_tenant_select" ON quotations FOR SELECT TO authenticated
  USING (tenant_id = public.get_tenant_id());
CREATE POLICY "quotations_tenant_insert" ON quotations FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_tenant_id());
CREATE POLICY "quotations_tenant_update" ON quotations FOR UPDATE TO authenticated
  USING (tenant_id = public.get_tenant_id());
CREATE POLICY "quotations_tenant_delete" ON quotations FOR DELETE TO authenticated
  USING (tenant_id = public.get_tenant_id());

-- quotation_items: full tenant isolation
CREATE POLICY "quotation_items_tenant_select" ON quotation_items FOR SELECT TO authenticated
  USING (tenant_id = public.get_tenant_id());
CREATE POLICY "quotation_items_tenant_insert" ON quotation_items FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_tenant_id());
CREATE POLICY "quotation_items_tenant_update" ON quotation_items FOR UPDATE TO authenticated
  USING (tenant_id = public.get_tenant_id());
CREATE POLICY "quotation_items_tenant_delete" ON quotation_items FOR DELETE TO authenticated
  USING (tenant_id = public.get_tenant_id());

-- discount_rules: full tenant isolation
CREATE POLICY "discount_rules_tenant_select" ON discount_rules FOR SELECT TO authenticated
  USING (tenant_id = public.get_tenant_id());
CREATE POLICY "discount_rules_tenant_insert" ON discount_rules FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_tenant_id());
CREATE POLICY "discount_rules_tenant_update" ON discount_rules FOR UPDATE TO authenticated
  USING (tenant_id = public.get_tenant_id());
CREATE POLICY "discount_rules_tenant_delete" ON discount_rules FOR DELETE TO authenticated
  USING (tenant_id = public.get_tenant_id());

-- import_history: full tenant isolation
CREATE POLICY "import_history_tenant_select" ON import_history FOR SELECT TO authenticated
  USING (tenant_id = public.get_tenant_id());
CREATE POLICY "import_history_tenant_insert" ON import_history FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_tenant_id());

-- match_analytics: allow insert for edge functions (anon), select for tenant
CREATE POLICY "match_analytics_tenant_select" ON match_analytics FOR SELECT TO authenticated
  USING (tenant_id = public.get_tenant_id() OR tenant_id IS NULL);
CREATE POLICY "match_analytics_anon_insert" ON match_analytics FOR INSERT TO anon
  WITH CHECK (true);
CREATE POLICY "match_analytics_auth_insert" ON match_analytics FOR INSERT TO authenticated
  WITH CHECK (true);

-- 13. Auto-set tenant_id on insert via trigger
CREATE OR REPLACE FUNCTION set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.get_tenant_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to all tenant-scoped tables
DROP TRIGGER IF EXISTS set_tenant_id_products ON products;
CREATE TRIGGER set_tenant_id_products BEFORE INSERT ON products
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

DROP TRIGGER IF EXISTS set_tenant_id_companies ON companies;
CREATE TRIGGER set_tenant_id_companies BEFORE INSERT ON companies
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

DROP TRIGGER IF EXISTS set_tenant_id_quotations ON quotations;
CREATE TRIGGER set_tenant_id_quotations BEFORE INSERT ON quotations
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

DROP TRIGGER IF EXISTS set_tenant_id_quotation_items ON quotation_items;
CREATE TRIGGER set_tenant_id_quotation_items BEFORE INSERT ON quotation_items
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

DROP TRIGGER IF EXISTS set_tenant_id_discount_rules ON discount_rules;
CREATE TRIGGER set_tenant_id_discount_rules BEFORE INSERT ON discount_rules
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

DROP TRIGGER IF EXISTS set_tenant_id_import_history ON import_history;
CREATE TRIGGER set_tenant_id_import_history BEFORE INSERT ON import_history
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- 14. Function to create a new tenant with admin user (used during signup)
CREATE OR REPLACE FUNCTION create_tenant_with_admin(
  p_tenant_name TEXT,
  p_tenant_slug TEXT,
  p_user_id UUID
) RETURNS UUID AS $$
DECLARE
  new_tenant_id UUID;
BEGIN
  INSERT INTO tenants (name, slug)
  VALUES (p_tenant_name, p_tenant_slug)
  RETURNING id INTO new_tenant_id;

  INSERT INTO tenant_users (tenant_id, user_id, role)
  VALUES (new_tenant_id, p_user_id, 'admin');

  RETURN new_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
