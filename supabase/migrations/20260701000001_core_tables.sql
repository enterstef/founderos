-- ═══════════════════════════════════════════
-- PROFILES (extends auth.users)
-- ═══════════════════════════════════════════
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client' 
    CHECK (role IN ('super_admin', 'client')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- MASTER PROGRAMS (templates created by admins)
-- ═══════════════════════════════════════════
CREATE TABLE master_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_key UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- MASTER MODULES (sections within a program)
-- ═══════════════════════════════════════════
CREATE TABLE master_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  program_id UUID NOT NULL REFERENCES master_programs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- MASTER STEPS (individual steps within modules)
-- ═══════════════════════════════════════════
CREATE TABLE master_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_key UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  module_id UUID NOT NULL REFERENCES master_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_instructions TEXT NOT NULL,
  estimated_minutes INTEGER NOT NULL DEFAULT 15 CHECK (estimated_minutes > 0),
  track_type TEXT NOT NULL CHECK (track_type IN ('business', 'execution')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- CLIENT PROJECTS (cloned from master programs)
-- ═══════════════════════════════════════════
CREATE TABLE client_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  company_info JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- PROJECT TASKS (cloned & detached from master steps)
-- Key design: NO FK to master_steps!
-- source_*_key columns are copied values for traceability
-- ═══════════════════════════════════════════
CREATE TABLE project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  module_instance_key UUID NOT NULL,
  source_program_key UUID NOT NULL,
  source_module_key UUID NOT NULL,
  source_step_key UUID NOT NULL,
  source_template_version INTEGER NOT NULL,
  track_type TEXT NOT NULL CHECK (track_type IN ('business', 'execution')),
  module_title TEXT NOT NULL,
  title TEXT NOT NULL,
  content_instructions TEXT NOT NULL,
  estimated_minutes INTEGER NOT NULL DEFAULT 15 CHECK (estimated_minutes > 0),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'done')),
  sync_mode TEXT NOT NULL DEFAULT 'inherit' 
    CHECK (sync_mode IN ('inherit', 'custom')),
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- TASK COMMENTS
-- ═══════════════════════════════════════════
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- TASK ATTACHMENTS
-- ═══════════════════════════════════════════
CREATE TABLE task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES project_tasks(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
