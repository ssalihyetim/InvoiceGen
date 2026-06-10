-- ============================================
-- FAZ 5: Commercial Features Wave 2
-- Email logs, notifications, exchange rates, CRM
-- ============================================

-- 5a. Email logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'bounced', 'failed')),
  resend_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "email_logs_tenant_select" ON email_logs FOR SELECT TO authenticated
  USING (tenant_id = public.get_tenant_id());
CREATE POLICY "email_logs_tenant_insert" ON email_logs FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_tenant_id());

DROP TRIGGER IF EXISTS set_tenant_id_email_logs ON email_logs;
CREATE TRIGGER set_tenant_id_email_logs BEFORE INSERT ON email_logs
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- 5b. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  entity_type TEXT,  -- 'quotation', 'company', etc
  entity_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_user_select" ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "notifications_tenant_insert" ON notifications FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_tenant_id());
CREATE POLICY "notifications_user_update" ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- 5c. Exchange rates cache table
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency TEXT NOT NULL DEFAULT 'TRY',
  target_currency TEXT NOT NULL,
  rate DECIMAL(18, 6) NOT NULL,
  source TEXT DEFAULT 'TCMB',
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  rate_date DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(base_currency, target_currency, rate_date)
);

-- No RLS needed — exchange rates are global/public
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exchange_rates_public_select" ON exchange_rates FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "exchange_rates_admin_insert" ON exchange_rates FOR INSERT TO authenticated
  WITH CHECK (true);

-- 5d. CRM tables

-- Company notes
CREATE TABLE IF NOT EXISTS company_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_notes_company ON company_notes(company_id);

ALTER TABLE company_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_notes_tenant_select" ON company_notes FOR SELECT TO authenticated
  USING (tenant_id = public.get_tenant_id());
CREATE POLICY "company_notes_tenant_insert" ON company_notes FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_tenant_id());
CREATE POLICY "company_notes_tenant_update" ON company_notes FOR UPDATE TO authenticated
  USING (tenant_id = public.get_tenant_id());
CREATE POLICY "company_notes_tenant_delete" ON company_notes FOR DELETE TO authenticated
  USING (tenant_id = public.get_tenant_id());

DROP TRIGGER IF EXISTS set_tenant_id_company_notes ON company_notes;
CREATE TRIGGER set_tenant_id_company_notes BEFORE INSERT ON company_notes
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- Follow-up reminders
CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id),
  due_date DATE NOT NULL,
  note TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_follow_ups_due ON follow_ups(due_date, is_completed);
CREATE INDEX IF NOT EXISTS idx_follow_ups_company ON follow_ups(company_id);

ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follow_ups_tenant_select" ON follow_ups FOR SELECT TO authenticated
  USING (tenant_id = public.get_tenant_id());
CREATE POLICY "follow_ups_tenant_insert" ON follow_ups FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_tenant_id());
CREATE POLICY "follow_ups_tenant_update" ON follow_ups FOR UPDATE TO authenticated
  USING (tenant_id = public.get_tenant_id());
CREATE POLICY "follow_ups_tenant_delete" ON follow_ups FOR DELETE TO authenticated
  USING (tenant_id = public.get_tenant_id());

DROP TRIGGER IF EXISTS set_tenant_id_follow_ups ON follow_ups;
CREATE TRIGGER set_tenant_id_follow_ups BEFORE INSERT ON follow_ups
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- Notification trigger: auto-create notification when quotation status changes
CREATE OR REPLACE FUNCTION notify_quotation_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO notifications (tenant_id, user_id, title, message, type, entity_type, entity_id)
    SELECT
      NEW.tenant_id,
      tu.user_id,
      'Teklif durumu değişti',
      format('Teklif %s durumu: %s → %s', NEW.quotation_number, OLD.status, NEW.status),
      CASE
        WHEN NEW.status = 'approved' THEN 'success'
        WHEN NEW.status = 'rejected' THEN 'error'
        WHEN NEW.status = 'expired' THEN 'warning'
        ELSE 'info'
      END,
      'quotation',
      NEW.id
    FROM tenant_users tu
    WHERE tu.tenant_id = NEW.tenant_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_quotation_status ON quotations;
CREATE TRIGGER notify_quotation_status AFTER UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION notify_quotation_status_change();

-- Notification trigger: auto-create notification for expiring quotations
-- (to be run by pg_cron daily)
CREATE OR REPLACE FUNCTION notify_expiring_quotations()
RETURNS INTEGER AS $$
DECLARE
  notified_count INTEGER := 0;
BEGIN
  INSERT INTO notifications (tenant_id, user_id, title, message, type, entity_type, entity_id)
  SELECT
    q.tenant_id,
    tu.user_id,
    'Teklif süresi yaklaşıyor',
    format('Teklif %s''nin süresi %s tarihinde doluyor', q.quotation_number, q.valid_until),
    'warning',
    'quotation',
    q.id
  FROM quotations q
  JOIN tenant_users tu ON tu.tenant_id = q.tenant_id
  WHERE q.valid_until = CURRENT_DATE + INTERVAL '3 days'
    AND q.status IN ('draft', 'sent');

  GET DIAGNOSTICS notified_count = ROW_COUNT;
  RETURN notified_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
