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

## [2026-07-02] — Clean up duplicate RLS policies

**Type:** schema
**Scope:** database

**What changed:**
Dropped the old redundant RLS policies based on the get_user_role() function for all core tables and storage buckets, and subsequently dropped the get_user_role() function itself.

**Files affected:**
- None (Applied directly via SQL)

**Database changes:** YES
Dropped all policies using get_user_role() from public tables and storage.objects. Dropped get_user_role() function.

**Why:** To remove duplication and confusion, relying exclusively on the newer, standardized is_admin() helper and implicit bucket policies.


## [2026-07-02] — Optimize middleware database queries

**Type:** refactor
**Scope:** middleware, features/auth

**What changed:**
Optimized the Next.js Edge Middleware to eliminate database queries on every request to protected routes.
- Modified \eatures/auth/actions.ts\ (\signIn\, \signOut\) to set and clear a secure \user_role\ cookie upon authentication.
- Modified \middleware.ts\ to read the \user_role\ cookie instead of querying the Supabase \profiles\ table for role-based redirects.

**Files affected:**
- middleware.ts
- src/features/auth/actions.ts

**Database changes:** NO

**Why:** To significantly improve performance by eliminating database roundtrips on edge networks for every authenticated request.

