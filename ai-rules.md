# FoundersOS — AI Agent Rules (Full Reference)

This file is the complete rule set for any AI agent working on this codebase.
`AGENTS.md` at the project root contains the quick-reference version.
Read this file when starting a new feature, debugging an architectural issue,
or when AGENTS.md points you here for details.

---

## RULE 1: Module Isolation — No Cross-Feature Imports

### What

Feature modules in `/features/` are isolated rooms. A module never imports
from another module — not components, not queries, not actions, not types.

### Why

When module A imports from module B, a change in B can silently break A.
With AI-assisted development across many sessions, this kind of hidden coupling
accumulates fast and becomes impossible to untangle. Physical isolation
prevents the problem structurally — the architecture enforces the rule,
not discipline alone.

### Correct vs Incorrect

```typescript
// ❌ FORBIDDEN — features/collaboration importing from features/project-tracking
import { getProjectTasks } from '@/features/project-tracking/queries'
import { CompleteTaskSchema } from '@/features/project-tracking/schemas'

// ✅ CORRECT — if you need data from another module, two options:
// Option A: Write a scoped query directly in your module's queries.ts
// Option B: Create a workflow in /workflows/ that orchestrates both modules
```

### The Corridor Rule

Any operation that genuinely needs to touch two feature modules belongs in `/workflows/`.
Workflows are the only legal bridges between rooms.

```
features/project-tracking/   ←── never talks directly to ──→   features/collaboration/
         ↑                                                                ↑
         └──────────────────── /workflows/ ────────────────────────────┘
```

---

## RULE 2: Pages Are Thin

### What

Files in `/app/` handle routing only. They do exactly three things:
check authorization, fetch data, render a component. Nothing else.

### Why

If pages contain business logic, that logic is invisible to the feature
module system and cannot be reused or tested in isolation. It also makes
AI-assisted changes more dangerous because the scope of impact is unclear.

### Correct vs Incorrect

```typescript
// ❌ FORBIDDEN in /app/**
export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('client_projects')
    .select('*, profiles(*)')
    .order('created_at', { ascending: false })

  if (!clients) return <div>No clients</div>
  return <div>{clients.map(c => <div key={c.id}>{c.title}</div>)}</div>
}

// ✅ CORRECT — page delegates everything to feature module
import { getActiveClients } from '@/features/client-management/queries'
import { ClientList } from '@/features/client-management/components/client-list'
import { requireSuperAdmin } from '@/lib/auth-helpers'

export default async function ClientsPage() {
  await requireSuperAdmin()
  const clients = await getActiveClients()
  return <ClientList clients={clients} />
}
```

### Special Next.js Files in /app/

Use these when appropriate — they are part of the routing layer, not feature logic:

- `loading.tsx` — skeleton shown while the page fetches data
- `error.tsx` — error boundary for the route
- `not-found.tsx` — shown when a record doesn't exist

---

## RULE 3: Zod Validation Before Every Mutation

### What

Every server action validates its input through a Zod schema before
executing any database operation. No raw parameters. No trusting the caller.

### Why

Server Actions are callable from the client. Without validation, malformed
or malicious input reaches the database. Zod also produces typed, inferred
output that eliminates the need for manual type assertions.

### Correct Pattern (always follow this structure)

```typescript
'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth-helpers'
import { MyActionSchema } from './schemas'

export async function myAction(input: unknown) {
  // Step 1: authenticate
  const user = await requireAuth()

  // Step 2: validate — input is unknown, output is typed
  const parsed = MyActionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid input', details: parsed.error.flatten() }
  }

  // Step 3: use typed data only from this point
  const { fieldOne, fieldTwo } = parsed.data
  const supabase = await createClient()

  // Step 4: database operation wrapped in try/catch
  try {
    const { error } = await supabase
      .from('some_table')
      .insert({ field_one: fieldOne, field_two: fieldTwo })

    if (error) return { error: 'Database error', details: error.message }
  } catch (err) {
    return { error: 'Unexpected error' }
  }

  // Step 5: revalidate affected routes and return success
  revalidatePath('/affected-route')
  return { success: true }
}
```

### Incorrect Patterns

```typescript
// ❌ Raw typed parameters — bypass validation entirely
export async function myAction(title: string, projectId: string) { }

// ❌ Casting input without validation
export async function myAction(input: MyType) { }

// ❌ Throwing instead of returning errors
export async function myAction(input: unknown) {
  throw new Error('Something went wrong') // never do this
}
```

### Schema Location

Every schema lives in `schemas.ts` of its feature module and is exported
alongside its inferred type:

```typescript
// features/[module]/schemas.ts
import { z } from 'zod'

export const MyActionSchema = z.object({
  title: z.string().min(3).max(200),
  projectId: z.string().uuid(),
})

export type MyActionInput = z.infer<typeof MyActionSchema>
```

---

## RULE 4: Three Supabase Clients — Never Mix

### What

There are three separate Supabase client files. Each is used in exactly
one context. Using the wrong client causes authentication and session bugs.

### The Three Clients

```typescript
// lib/supabase/client.ts
// USE: inside components with 'use client' directive
// WHY: browser environment, manages session via cookies on the client side
import { createBrowserClient } from '@supabase/ssr'
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// lib/supabase/server.ts
// USE: inside Server Components and actions.ts files
// WHY: server environment, reads cookies from the request
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
export async function createClient() { ... }

// lib/supabase/middleware.ts
// USE: inside middleware.ts only
// WHY: intercepts every request to refresh the session token
export async function updateSession(request: NextRequest) { ... }
```

### Decision Rule

Ask yourself: where is this code running?

```
Running in browser (event handlers, hooks) → lib/supabase/client.ts
Running on server (Server Component, action) → lib/supabase/server.ts
Running in middleware.ts → lib/supabase/middleware.ts
```

---

## RULE 5: WET UI — Duplicate Components Intentionally

### What

Components used in the Agency Control Room and in the Client Portal
are always written as separate files, even when they look similar.

### Why

Agency and portal features evolve independently. A change to the client's
task card (adding a comment button) should not risk breaking the agency's
monitoring view of the same task. With shared components, one change
affects both. With separate files, each evolves safely on its own.

### Correct Structure

```
features/project-tracking/components/
  task-card-agency.tsx      ← monitoring view for founders
  task-card-portal.tsx      ← execution view for client
  task-list-agency.tsx      ← full task list for agency dashboard
  task-list-portal.tsx      ← roadmap view for client portal
```

### What Shared Components Are Allowed

`/components/shared/` is for elements that have no feature-specific logic
and are truly identical regardless of who sees them:

```
components/shared/
  page-header.tsx       ← generic page title + description layout
  loading-skeleton.tsx  ← generic loading state
  empty-state.tsx       ← generic "nothing here yet" state
```

If you find yourself adding `if (isAgency)` logic to a shared component,
split it into two feature-specific components immediately.

---

## RULE 6: Schema Changes Go Through MCP Supabase

### What

Database schema changes (new tables, new columns, new policies, indexes)
are never made through TypeScript code or ORM methods. They are always
written as SQL and applied via MCP Supabase.

### Required Sequence

```
1. Write the SQL statement (CREATE TABLE, ALTER TABLE, CREATE POLICY, etc.)
2. Add an entry to docs/changelog.md BEFORE applying, with
   "Database changes: YES" and the SQL described
   (exact entry format: guides/documentation-guide.md — see also Rule 12)
3. Apply via MCP Supabase
4. Verify the result (via MCP Supabase: SELECT, or check table structure)
```

### Why This Matters

The changelog is the historical record of the database state, alongside
every other change to the system. If something breaks after a schema
change, this log is the first place to look. Never apply schema changes
without documenting them first.

Note: there is no separate migration-tracking file. `docs/changelog.md` is
the single place schema changes get logged — see Rule 12.

---

## RULE 7: All Code in English

### What

Every identifier, comment, error message, variable name, function name,
and file name is written in English. Romanian is used only in prose
documentation (business vision, process descriptions).

### Why

Large language models are trained predominantly on English code.
English identifiers produce more predictable, stable, and correct
output across all AI coding tools. Mixing languages in code causes
inconsistent behavior in AI-assisted sessions.

### Examples

```typescript
// ❌ FORBIDDEN
const proiect = await getClientProject(id)
// error mesaj: 'Proiectul nu a fost găsit'
function calculeazaProgres(taskuri: Task[]) { }

// ✅ CORRECT
const project = await getClientProject(id)
// error message: 'Project not found'
function calculateProgress(tasks: Task[]) { }
```

---

## RULE 8: RLS Is the Security Layer — Code Is Defense In Depth

### What

Row-Level Security (RLS) in Supabase is the primary security mechanism.
Application code adds a second layer but never replaces RLS.

### Why This Matters For Code

Because RLS enforces isolation at the database level, you should never
try to enforce data isolation through application-level filtering alone:

```typescript
// ❌ DANGEROUS — if this filter is removed, all data is exposed
const { data } = await supabase
  .from('project_tasks')
  .select('*')
  // forgot to add: .eq('project_id', projectId)
  // RLS saves you here — the query still only returns authorized rows

// ✅ CORRECT — RLS handles isolation, code adds explicit filtering as second layer
const { data } = await supabase
  .from('project_tasks')
  .select('*')
  .eq('project_id', projectId)  // explicit filter + RLS = defense in depth
```

### Never Disable RLS

Never run `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` on any production table.
If a query is returning empty results unexpectedly, debug the RLS policy —
do not disable it.

---

## RULE 9: Service Role Key Is Server-Only

### What

`SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS policies. It must never
appear in client-side code, browser bundles, or components marked `'use client'`.

### Detection

If you see `SUPABASE_SERVICE_ROLE_KEY` imported or used anywhere other
than a server-side file, stop and flag it as a critical security issue.

Only environment variables prefixed with `NEXT_PUBLIC_` are safe for client use:
- ✅ `NEXT_PUBLIC_SUPABASE_URL` — safe for browser
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` — safe for browser
- ❌ `SUPABASE_SERVICE_ROLE_KEY` — server only, never browser

---

## RULE 10: GitHub Operations Go Through MCP

### What

All file commits, pushes, and repository operations go through MCP GitHub.
Never suggest manual `git` commands.

### Commit Message Convention

```
feat:     new feature or capability
fix:      bug fix
chore:    setup, config, dependency update
refactor: code reorganization without behavior change
docs:     documentation only
```

### When to Commit

Commit after every completed and verified task — not at the end of a session.
Small, frequent commits create clear rollback points.

---

## RULE 11: File Header Standard

### What

Every new code file starts with a standard header comment. The full format
applies to substantial files; a short two-line version is acceptable for
trivial files (a single schema, a single type, a single constant).

### Why

The header gives any agent — or any human — instant orientation on a file
without reading its full content first: what it does, what it exports, and
what depends on it. This matters more, not less, as more sessions and more
models (Claude, Gemini) touch the same codebase over time without shared memory.

### Standard Header

```typescript
// =============================================================================
// FILE:     features/project-tracking/actions.ts
// PURPOSE:  Server actions for task completion and sequential locking
// EXPORTS:  completeTask, forceUnlockTask, updateTaskContent
// USES:     lib/supabase/server.ts, lib/auth-helpers.ts
// USED BY:  app/(portal)/[projectId]/task/[taskId]/page.tsx
// =============================================================================
```

### Short Version (trivial files only)

```typescript
// FILE:    features/project-tracking/schemas.ts
// PURPOSE: Zod validation schemas for project tracking actions
```

### Field Rules

- `FILE` — path from project root
- `PURPOSE` — one sentence, what this file does
- `EXPORTS` — main functions or components exported (omit in short version)
- `USES` — direct dependencies, max 4-5, most important ones (omit in short version)
- `USED BY` — who imports from this file, max 4-5, most important ones (omit in short version)

No exceptions: every new file gets a header, full or short. Never skip it
because the file "is obviously simple."

---

## RULE 12: Documentation Maintenance

### What

After any significant change, update the relevant document(s) in `docs/`:
`functional-spec.md` for new user-facing features, `technical-spec.md` for
architectural or schema changes (the current state), and `changelog.md`
for every session with meaningful changes (the historical record). A
schema change updates both `technical-spec.md` and `changelog.md` —
the first describes what the schema looks like now, the second describes
that this specific change happened and why.

### Why

Documentation that doesn't move alongside the code drifts from reality and
stops being trustworthy — for the next agent session, for you, and for
anyone reading it after Handover.

### Rules

- Never modify any file in `guides/` unless explicitly instructed. Those
  documents are owned by the human architect, not the agent.
- For the exact format, templates, and prompts to use for each type of
  documentation update, read `guides/documentation-guide.md`. Do not
  improvise the format here.
- This rule only establishes *that* and *when* documentation gets updated.
  It deliberately does not repeat *how* — that lives in exactly one place,
  `guides/documentation-guide.md`, so it can change without going stale
  in two places at once.

---

## QUICK DECISION GUIDE

When unsure where something goes, use this guide:

| Situation | Decision |
|---|---|
| Need to read data for a page | `features/[module]/queries.ts` |
| Need to write/mutate data | `features/[module]/actions.ts` with Zod schema |
| Operation touches two modules | `/workflows/` |
| Component shown to agency and portal | Two separate files |
| Component with no feature logic | `/components/shared/` |
| Schema change | SQL → `docs/changelog.md` → MCP Supabase |
| Auth check in a page | `lib/auth-helpers.ts` → `requireSuperAdmin()` or `requireAuth()` |
| Auth check in an action | Same: `requireSuperAdmin()` or `requireAuth()` |
| Supabase client in Server Component | `lib/supabase/server.ts` |
| Supabase client in 'use client' component | `lib/supabase/client.ts` |
| New file created | Add the standard header (Rule 11) |
| Documentation needs updating | Rule 12 → exact format in `guides/documentation-guide.md` |

---

*FoundersOS — docs/ai-rules.md — Full Agent Reference*
*Maintained alongside the codebase. Update when architectural decisions change.*
