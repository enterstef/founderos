-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- Helper function: get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ═══ PROFILES ═══
CREATE POLICY "profiles_select_own" ON profiles 
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_select_admin" ON profiles 
  FOR SELECT USING (get_user_role() = 'super_admin');
CREATE POLICY "profiles_admin_all" ON profiles 
  FOR ALL USING (get_user_role() = 'super_admin');

-- ═══ MASTER PROGRAMS (admin only) ═══
CREATE POLICY "master_programs_admin" ON master_programs 
  FOR ALL USING (get_user_role() = 'super_admin');

-- ═══ MASTER MODULES (admin only) ═══
CREATE POLICY "master_modules_admin" ON master_modules 
  FOR ALL USING (get_user_role() = 'super_admin');

-- ═══ MASTER STEPS (admin only) ═══
CREATE POLICY "master_steps_admin" ON master_steps 
  FOR ALL USING (get_user_role() = 'super_admin');

-- ═══ CLIENT PROJECTS ═══
CREATE POLICY "client_projects_select_own" ON client_projects 
  FOR SELECT USING (client_id = auth.uid());
CREATE POLICY "client_projects_select_admin" ON client_projects 
  FOR SELECT USING (get_user_role() = 'super_admin');
CREATE POLICY "client_projects_admin_manage" ON client_projects 
  FOR ALL USING (get_user_role() = 'super_admin');

-- ═══ PROJECT TASKS ═══
CREATE POLICY "project_tasks_select_own" ON project_tasks 
  FOR SELECT USING (
    project_id IN (SELECT id FROM client_projects WHERE client_id = auth.uid())
  );
CREATE POLICY "project_tasks_select_admin" ON project_tasks 
  FOR SELECT USING (get_user_role() = 'super_admin');
CREATE POLICY "project_tasks_update_own" ON project_tasks 
  FOR UPDATE USING (
    project_id IN (SELECT id FROM client_projects WHERE client_id = auth.uid())
  ) WITH CHECK (
    project_id IN (SELECT id FROM client_projects WHERE client_id = auth.uid())
  );
CREATE POLICY "project_tasks_admin_manage" ON project_tasks 
  FOR ALL USING (get_user_role() = 'super_admin');

-- ═══ TASK COMMENTS ═══
CREATE POLICY "task_comments_select_access" ON task_comments 
  FOR SELECT USING (
    task_id IN (
      SELECT pt.id FROM project_tasks pt
      JOIN client_projects cp ON pt.project_id = cp.id
      WHERE cp.client_id = auth.uid()
    )
    OR get_user_role() = 'super_admin'
  );
CREATE POLICY "task_comments_insert_own" ON task_comments 
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    task_id IN (
      SELECT pt.id FROM project_tasks pt
      JOIN client_projects cp ON pt.project_id = cp.id
      WHERE cp.client_id = auth.uid()
    )
  );
CREATE POLICY "task_comments_admin_manage" ON task_comments 
  FOR ALL USING (get_user_role() = 'super_admin');

-- ═══ TASK ATTACHMENTS ═══
CREATE POLICY "task_attachments_select_access" ON task_attachments 
  FOR SELECT USING (
    task_id IN (
      SELECT pt.id FROM project_tasks pt
      JOIN client_projects cp ON pt.project_id = cp.id
      WHERE cp.client_id = auth.uid()
    )
    OR get_user_role() = 'super_admin'
  );
CREATE POLICY "task_attachments_insert_own" ON task_attachments 
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid() AND
    task_id IN (
      SELECT pt.id FROM project_tasks pt
      JOIN client_projects cp ON pt.project_id = cp.id
      WHERE cp.client_id = auth.uid()
    )
  );
CREATE POLICY "task_attachments_admin_manage" ON task_attachments 
  FOR ALL USING (get_user_role() = 'super_admin');
