-- =====================================================
-- TICKETING TOOL - SUPABASE SCHEMA
-- Run this in the Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. ORGANIZATIONS (no dependencies)
-- =====================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  domain TEXT,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  allow_self_registration BOOLEAN DEFAULT FALSE,
  default_role TEXT DEFAULT 'user' CHECK (default_role IN ('user', 'agent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. DEPARTMENTS (depends on organizations; self-ref to users added later)
-- =====================================================
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  head_id UUID,  -- FK to users added below via ALTER
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, organization_id)
);

-- =====================================================
-- 3. USERS (depends on organizations, departments)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'agent', 'admin', 'department-head', 'technician')),
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret TEXT,
  sso_provider TEXT CHECK (sso_provider IN ('azure', 'google', 'saml', NULL)),
  sso_id TEXT,
  avatar TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add self-referencing FK on departments.head_id now that users table exists
ALTER TABLE departments
  ADD CONSTRAINT departments_head_id_fkey
  FOREIGN KEY (head_id) REFERENCES users(id) ON DELETE SET NULL;

-- =====================================================
-- 4. TICKETS (depends on organizations, departments, users)
-- =====================================================
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id SERIAL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'approval-pending', 'approved', 'rejected', 'in-progress', 'resolved', 'closed')),
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  creator_id UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  response_due_date TIMESTAMP WITH TIME ZONE,
  sla_response_time NUMERIC,
  sla_resolution_time NUMERIC,
  sla_response_breached BOOLEAN DEFAULT FALSE,
  sla_response_breached_at TIMESTAMP WITH TIME ZONE,
  sla_response_warning_sent BOOLEAN DEFAULT FALSE,
  sla_resolution_breached BOOLEAN DEFAULT FALSE,
  sla_resolution_breached_at TIMESTAMP WITH TIME ZONE,
  sla_resolution_warning_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 5. COMMENTS (depends on tickets, users)
-- =====================================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  mentions JSONB DEFAULT '[]',
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 6. CATEGORIES (depends on organizations)
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#00ffff',
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, organization_id)
);

-- =====================================================
-- 7. SLA POLICIES (depends on organizations)
-- =====================================================
CREATE TABLE IF NOT EXISTS sla_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  priority TEXT NOT NULL CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  response_time NUMERIC NOT NULL,
  resolution_time NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, priority)
);

-- =====================================================
-- 8. EMAIL SETTINGS (standalone)
-- =====================================================
CREATE TABLE IF NOT EXISTS email_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  smtp_config JSONB DEFAULT '{}',
  imap_config JSONB DEFAULT '{}',
  domain_rules JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 9. EMAIL TEMPLATES (depends on organizations)
-- =====================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  variables JSONB DEFAULT '[]',
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 10. SSO CONFIG (standalone)
-- =====================================================
CREATE TABLE IF NOT EXISTS sso_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL UNIQUE CHECK (provider IN ('azure', 'google', 'saml', 'oauth')),
  enabled BOOLEAN DEFAULT FALSE,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 11. LOGOS (standalone)
-- =====================================================
CREATE TABLE IF NOT EXISTS logos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  logo TEXT NOT NULL,
  filename TEXT DEFAULT 'logo',
  show_on_login BOOLEAN DEFAULT TRUE,
  login_title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 12. ROLES (standalone)
-- =====================================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  permissions JSONB DEFAULT '{"tickets": {"create": false, "read": false, "update": false, "delete": false, "assign": false}, "users": {"create": false, "read": false, "update": false, "delete": false}, "admin": {"access": false}}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 13. API KEYS (depends on organizations, users)
-- =====================================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,
  key_hash TEXT NOT NULL UNIQUE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  permissions TEXT[] DEFAULT '{read}',
  is_active BOOLEAN DEFAULT TRUE,
  last_used TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  usage_count INTEGER DEFAULT 0,
  rate_limit INTEGER DEFAULT 1000,
  rate_limit_window INTEGER DEFAULT 3600000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 14. TEAMS CONFIG (depends on organizations, users)
-- =====================================================
CREATE TABLE IF NOT EXISTS teams_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  is_enabled BOOLEAN DEFAULT FALSE,
  webhook_url TEXT,
  bot_id TEXT,
  tenant_id TEXT,
  channel_id TEXT,
  channel_name TEXT,
  notifications JSONB DEFAULT '{"ticketCreated": true, "ticketUpdated": true, "ticketResolved": true, "ticketClosed": true, "slaBreach": true, "ticketAssigned": true, "ticketCommented": false}',
  working_hours JSONB DEFAULT '{"enabled": false, "startTime": "09:00", "endTime": "17:00", "timezone": "UTC", "daysOfWeek": [1, 2, 3, 4, 5]}',
  department_routing JSONB DEFAULT '[]',
  last_tested TIMESTAMP WITH TIME ZONE,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 15. FAQs (depends on organizations, departments, users)
-- =====================================================
CREATE TABLE IF NOT EXISTS faqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  category TEXT DEFAULT 'general' CHECK (category IN ('password', 'vpn', 'email', 'hr', 'it', 'general')),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS faqs_search_idx ON faqs USING GIN (
  to_tsvector('english'::regconfig, question)
);

-- =====================================================
-- 16. CHAT SESSIONS (depends on organizations, users, departments, tickets)
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'escalated', 'closed')),
  resolved_by TEXT CHECK (resolved_by IN ('bot', 'technician', 'system')),
  assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  ticket_id_int INTEGER,
  ticket_uuid UUID REFERENCES tickets(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{"conversationState": "idle", "ticketDraft": {}, "currentStep": 0}',
  escalated_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 17. CHAT MESSAGES (depends on chat_sessions, users)
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('user', 'bot', 'technician', 'system')),
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'ticket_created', 'ticket_status', 'quick_action', 'system')),
  attachments JSONB DEFAULT '[]',
  intent TEXT DEFAULT 'unknown',
  confidence NUMERIC DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 18. EXTERNAL INTEGRATIONS (depends on organizations, users)
-- =====================================================
CREATE TABLE IF NOT EXISTS external_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT DEFAULT '',
  config JSONB DEFAULT '{}',
  webhook_url TEXT UNIQUE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  trigger_count INTEGER DEFAULT 0,
  last_triggered TIMESTAMP WITH TIME ZONE,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 19. EMAIL AUTOMATIONS (depends on organizations, email_templates, users)
-- =====================================================
CREATE TABLE IF NOT EXISTS email_automations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('daily-open-tickets', 'daily-report', 'weekly-report', 'monthly-report')),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT TRUE,
  schedule JSONB DEFAULT '{"time": "09:00", "timezone": "UTC", "dayOfWeek": null, "dayOfMonth": null}',
  recipients JSONB DEFAULT '{"admins": true, "organizationManagers": true, "departmentHeads": true, "technicians": false}',
  report_format TEXT[] DEFAULT '{html}',
  email_template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  last_sent TIMESTAMP WITH TIME ZONE,
  next_run TIMESTAMP WITH TIME ZONE,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(type, organization_id)
);

-- =====================================================
-- 20. REPORTING FUNCTIONS
-- =====================================================

-- Status Breakdown
CREATE OR REPLACE FUNCTION get_status_breakdown(start_date TIMESTAMP WITH TIME ZONE, target_org_id UUID DEFAULT NULL)
RETURNS TABLE (status TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT t.status, COUNT(*)
  FROM tickets t
  WHERE t.created_at >= start_date
    AND (target_org_id IS NULL OR t.organization_id = target_org_id)
  GROUP BY t.status;
END;
$$ LANGUAGE plpgsql;

-- Priority Breakdown
CREATE OR REPLACE FUNCTION get_priority_breakdown(start_date TIMESTAMP WITH TIME ZONE, target_org_id UUID DEFAULT NULL)
RETURNS TABLE (priority TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT t.priority, COUNT(*)
  FROM tickets t
  WHERE t.created_at >= start_date
    AND (target_org_id IS NULL OR t.organization_id = target_org_id)
  GROUP BY t.priority;
END;
$$ LANGUAGE plpgsql;

-- Department Breakdown
CREATE OR REPLACE FUNCTION get_department_breakdown(start_date TIMESTAMP WITH TIME ZONE, target_org_id UUID DEFAULT NULL)
RETURNS TABLE (department_name TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT d.name, COUNT(t.id)
  FROM departments d
  LEFT JOIN tickets t ON t.department_id = d.id AND t.created_at >= start_date
  WHERE (target_org_id IS NULL OR d.organization_id = target_org_id)
  GROUP BY d.name;
END;
$$ LANGUAGE plpgsql;

-- Technician Performance
CREATE OR REPLACE FUNCTION get_technician_performance(start_date TIMESTAMP WITH TIME ZONE, target_org_id UUID DEFAULT NULL)
RETURNS TABLE (
  technician_id UUID,
  technician_name TEXT,
  technician_email TEXT,
  total_assigned BIGINT,
  resolved BIGINT,
  closed BIGINT,
  resolution_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id, u.name, u.email,
    COUNT(t.id) as total_assigned,
    SUM(CASE WHEN t.status = 'resolved' THEN 1 ELSE 0 END) as resolved,
    SUM(CASE WHEN t.status = 'closed' THEN 1 ELSE 0 END) as closed,
    CASE WHEN COUNT(t.id) > 0 
      THEN (SUM(CASE WHEN t.status IN ('resolved', 'closed') THEN 1 ELSE 0 END)::NUMERIC / COUNT(t.id)::NUMERIC) * 100 
      ELSE 0 
    END as resolution_rate
  FROM users u
  JOIN tickets t ON t.assignee_id = u.id
  WHERE t.created_at >= start_date
    AND (target_org_id IS NULL OR u.organization_id = target_org_id)
  GROUP BY u.id, u.name, u.email
  ORDER BY total_assigned DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Ticket Trends
CREATE OR REPLACE FUNCTION get_ticket_trends(start_date TIMESTAMP WITH TIME ZONE, group_by TEXT, target_org_id UUID DEFAULT NULL)
RETURNS TABLE (
  period TIMESTAMP WITH TIME ZONE,
  count BIGINT,
  open BIGINT,
  resolved BIGINT,
  closed BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    date_trunc(group_by, t.created_at) as trend_period,
    COUNT(*) as total_count,
    SUM(CASE WHEN t.status = 'open' THEN 1 ELSE 0 END) as open_count,
    SUM(CASE WHEN t.status = 'resolved' THEN 1 ELSE 0 END) as resolved_count,
    SUM(CASE WHEN t.status = 'closed' THEN 1 ELSE 0 END) as closed_count
  FROM tickets t
  WHERE t.created_at >= start_date
    AND (target_org_id IS NULL OR t.organization_id = target_org_id)
  GROUP BY trend_period
  ORDER BY trend_period ASC;
END;
$$ LANGUAGE plpgsql;

-- Increment FAQ Helpful Count
CREATE OR REPLACE FUNCTION increment_faq_helpful(faq_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE faqs
  SET helpful_count = helpful_count + 1
  WHERE id = faq_id
  RETURNING helpful_count INTO new_count;
  RETURN new_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Done! All tables and functions created successfully.
-- =====================================================
