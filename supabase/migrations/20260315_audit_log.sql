-- ============================================
-- FAZ 3: Audit Log & Quotation Versioning
-- ============================================

-- 1. Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  entity_type TEXT NOT NULL,  -- 'product','company','quotation','quotation_item'
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create','update','delete','status_change')),
  old_data JSONB,
  new_data JSONB,
  metadata JSONB,  -- extra context (IP, user_agent, etc)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Quotation versions table
CREATE TABLE IF NOT EXISTS quotation_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL,  -- full quotation + items snapshot
  changed_by UUID REFERENCES auth.users(id),
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_quotation_versions_qid ON quotation_versions(quotation_id);

-- 4. RLS for audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_tenant_select" ON audit_logs FOR SELECT TO authenticated
  USING (tenant_id = public.get_tenant_id());
CREATE POLICY "audit_logs_tenant_insert" ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_tenant_id());

-- 5. RLS for quotation_versions
ALTER TABLE quotation_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotation_versions_tenant_select" ON quotation_versions FOR SELECT TO authenticated
  USING (tenant_id = public.get_tenant_id());
CREATE POLICY "quotation_versions_tenant_insert" ON quotation_versions FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_tenant_id());

-- 6. Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS TRIGGER AS $$
DECLARE
  audit_action TEXT;
  old_json JSONB;
  new_json JSONB;
  entity TEXT;
  eid UUID;
  tid UUID;
BEGIN
  entity := TG_TABLE_NAME;

  IF TG_OP = 'INSERT' THEN
    audit_action := 'create';
    old_json := NULL;
    new_json := to_jsonb(NEW);
    eid := NEW.id;
    tid := NEW.tenant_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Detect status changes
    IF entity = 'quotations' AND OLD.status IS DISTINCT FROM NEW.status THEN
      audit_action := 'status_change';
    ELSE
      audit_action := 'update';
    END IF;
    old_json := to_jsonb(OLD);
    new_json := to_jsonb(NEW);
    eid := NEW.id;
    tid := NEW.tenant_id;
  ELSIF TG_OP = 'DELETE' THEN
    audit_action := 'delete';
    old_json := to_jsonb(OLD);
    new_json := NULL;
    eid := OLD.id;
    tid := OLD.tenant_id;
  END IF;

  -- Insert audit log (best effort, don't fail the original operation)
  BEGIN
    INSERT INTO audit_logs (tenant_id, user_id, entity_type, entity_id, action, old_data, new_data)
    VALUES (tid, auth.uid(), entity, eid, audit_action, old_json, new_json);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Audit log insert failed: %', SQLERRM;
  END;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Attach audit triggers to key tables
DROP TRIGGER IF EXISTS audit_products ON products;
CREATE TRIGGER audit_products AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_companies ON companies;
CREATE TRIGGER audit_companies AFTER INSERT OR UPDATE OR DELETE ON companies
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_quotations ON quotations;
CREATE TRIGGER audit_quotations AFTER INSERT OR UPDATE OR DELETE ON quotations
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_quotation_items ON quotation_items;
CREATE TRIGGER audit_quotation_items AFTER INSERT OR UPDATE OR DELETE ON quotation_items
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- 8. Auto-set tenant_id for audit_logs and quotation_versions
DROP TRIGGER IF EXISTS set_tenant_id_audit_logs ON audit_logs;
CREATE TRIGGER set_tenant_id_audit_logs BEFORE INSERT ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

DROP TRIGGER IF EXISTS set_tenant_id_quotation_versions ON quotation_versions;
CREATE TRIGGER set_tenant_id_quotation_versions BEFORE INSERT ON quotation_versions
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
