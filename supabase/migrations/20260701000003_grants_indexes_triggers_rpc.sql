-- ═══════════════════════════════════════════
-- COLUMN-LEVEL GRANT — project_tasks
-- Clients can ONLY update status + updated_at
-- All other columns require service client (admin)
-- ═══════════════════════════════════════════
REVOKE UPDATE ON public.project_tasks FROM authenticated;
GRANT UPDATE (status, updated_at) ON public.project_tasks TO authenticated;

-- ═══════════════════════════════════════════
-- PERFORMANCE INDEXES
-- ═══════════════════════════════════════════
CREATE INDEX idx_project_tasks_project_id 
  ON project_tasks(project_id);
CREATE INDEX idx_project_tasks_composite 
  ON project_tasks(project_id, module_instance_key, sort_order);
CREATE INDEX idx_task_comments_task_id 
  ON task_comments(task_id);
CREATE INDEX idx_task_attachments_task_id 
  ON task_attachments(task_id);
CREATE INDEX idx_client_projects_client_id 
  ON client_projects(client_id);

-- ═══════════════════════════════════════════
-- AUTO-UPDATE updated_at TRIGGER
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON master_programs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON master_modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON master_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON client_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON project_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════
-- AUTO-CREATE PROFILE ON SIGNUP
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'client'  -- default role, admin promotes manually
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ═══════════════════════════════════════════
-- RPC: WEIGHTED PROJECT PROGRESS
-- Progress = completed_minutes / total_minutes (not task count!)
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_project_progress(p_project_id UUID)
RETURNS TABLE (
  module_instance_key UUID,
  module_title TEXT,
  completed_minutes BIGINT,
  total_minutes BIGINT,
  progress_percentage NUMERIC
) AS $$
  SELECT
    pt.module_instance_key,
    pt.module_title,
    COALESCE(SUM(CASE WHEN pt.status = 'done' THEN pt.estimated_minutes ELSE 0 END), 0) AS completed_minutes,
    COALESCE(SUM(pt.estimated_minutes), 0) AS total_minutes,
    CASE 
      WHEN SUM(pt.estimated_minutes) = 0 THEN 0
      ELSE ROUND(
        (SUM(CASE WHEN pt.status = 'done' THEN pt.estimated_minutes ELSE 0 END)::NUMERIC 
         / SUM(pt.estimated_minutes)::NUMERIC) * 100, 
        2
      )
    END AS progress_percentage
  FROM project_tasks pt
  WHERE pt.project_id = p_project_id
  GROUP BY pt.module_instance_key, pt.module_title
  ORDER BY MIN(pt.sort_order);
$$ LANGUAGE SQL STABLE;
