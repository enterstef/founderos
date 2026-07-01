-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is super_admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Admins can do everything. Clients can read and update their own.
DROP POLICY IF EXISTS "Admins can do everything on profiles" ON profiles;
CREATE POLICY "Admins can do everything on profiles" ON profiles FOR ALL TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);

-- Master tables: Admins only
DROP POLICY IF EXISTS "Admins can do everything on master_programs" ON master_programs;
CREATE POLICY "Admins can do everything on master_programs" ON master_programs FOR ALL TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Admins can do everything on master_modules" ON master_modules;
CREATE POLICY "Admins can do everything on master_modules" ON master_modules FOR ALL TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Admins can do everything on master_steps" ON master_steps;
CREATE POLICY "Admins can do everything on master_steps" ON master_steps FOR ALL TO authenticated USING (is_admin());

-- Client Projects: Admins all, Clients view own
DROP POLICY IF EXISTS "Admins can do everything on client_projects" ON client_projects;
CREATE POLICY "Admins can do everything on client_projects" ON client_projects FOR ALL TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Clients can view own projects" ON client_projects;
CREATE POLICY "Clients can view own projects" ON client_projects FOR SELECT TO authenticated USING (client_id = auth.uid());

-- Project Tasks: Admins all, Clients view & update own (via project_id)
DROP POLICY IF EXISTS "Admins can do everything on project_tasks" ON project_tasks;
CREATE POLICY "Admins can do everything on project_tasks" ON project_tasks FOR ALL TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Clients can view and update own project tasks" ON project_tasks;
CREATE POLICY "Clients can view and update own project tasks" ON project_tasks 
FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM client_projects cp 
    WHERE cp.id = project_tasks.project_id AND cp.client_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Clients can update own project tasks" ON project_tasks;
CREATE POLICY "Clients can update own project tasks" ON project_tasks 
FOR UPDATE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM client_projects cp 
    WHERE cp.id = project_tasks.project_id AND cp.client_id = auth.uid()
  )
);

-- Task Comments: Admins all, Clients insert & read if they own the project task
DROP POLICY IF EXISTS "Admins can do everything on task_comments" ON task_comments;
CREATE POLICY "Admins can do everything on task_comments" ON task_comments FOR ALL TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Clients can view comments on own tasks" ON task_comments;
CREATE POLICY "Clients can view comments on own tasks" ON task_comments 
FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM project_tasks pt
    JOIN client_projects cp ON pt.project_id = cp.id
    WHERE pt.id = task_comments.task_id AND cp.client_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Clients can add comments on own tasks" ON task_comments;
CREATE POLICY "Clients can add comments on own tasks" ON task_comments 
FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_tasks pt
    JOIN client_projects cp ON pt.project_id = cp.id
    WHERE pt.id = task_comments.task_id AND cp.client_id = auth.uid()
  )
);

-- Task Attachments: Admins all, Clients insert & read if they own the project task
DROP POLICY IF EXISTS "Admins can do everything on task_attachments" ON task_attachments;
CREATE POLICY "Admins can do everything on task_attachments" ON task_attachments FOR ALL TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Clients can view attachments on own tasks" ON task_attachments;
CREATE POLICY "Clients can view attachments on own tasks" ON task_attachments 
FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM project_tasks pt
    JOIN client_projects cp ON pt.project_id = cp.id
    WHERE pt.id = task_attachments.task_id AND cp.client_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Clients can add attachments on own tasks" ON task_attachments;
CREATE POLICY "Clients can add attachments on own tasks" ON task_attachments 
FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_tasks pt
    JOIN client_projects cp ON pt.project_id = cp.id
    WHERE pt.id = task_attachments.task_id AND cp.client_id = auth.uid()
  )
);
