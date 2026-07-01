# Changelog

## 2026-07-01
- Database changes: YES
- Added core tables (`profiles`, `master_programs`, `master_modules`, `master_steps`, `client_projects`, `project_tasks`, `task_comments`, `task_attachments`)
- Enabled RLS on all tables and created policies for `super_admin` and `client` roles
- Configured column-level grants for `project_tasks` (clients can only update `status` and `updated_at`)
- Created indexes for performance
- Created triggers for `updated_at` and `handle_new_user`
- Created RPC `get_project_progress` for weighted progress calculation
- Created storage bucket `task-attachments` with access policies
