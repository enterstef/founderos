# FoundersOS — Agent Instructions

Read this file completely before writing any code.

## Project Identity

Two-sided web app built with **Next.js 14 App Router**, **Supabase**, **shadcn/ui**, **Tailwind CSS**, and **Zod**.

Two user zones:
- `/agency/*` — Control Room for two founders (`role: super_admin`)
- `/portal/[projectId]/*` — Private space per client (`role: client`)

All clients share the same Supabase database. Security is enforced by Row-Level Security (RLS) at the database level, not in application code.

Full architecture rules: `docs/ai-rules.md`

---

## Architecture: Non-Negotiable Rules

**1. Module isolation — no cross-feature imports**
```
/features/[name]/   ← isolated rooms. Never import from another /features/X/
/workflows/         ← the ONLY place where feature modules communicate
/app/               ← thin routing only. No SQL, no business logic in pages.
```

**2. Every feature module has exactly this structure**
```
features/[name]/
  schemas.ts      ← Zod schemas and their inferred types
  queries.ts      ← read-only DB functions, no mutations
  actions.ts      ← 'use server' mutations, Zod-first always
  components/     ← UI for this module only
```

**3. UI duplication is intentional (WET, not DRY)**

Agency and portal components are always separate files, even if 80% similar.
- ✅ `task-card-agency.tsx` + `task-card-portal.tsx`
- ❌ `task-card.tsx` with `isAgencyView?: boolean`

---

## Code Standards

| Rule | Detail |
|---|---|
| **Language** | All code, variables, comments, error messages → English. Only prose documentation → Romanian. |
| **TypeScript** | Strict mode. No `any`. No `@ts-ignore`. Explicit types on all props, queries, and action returns. |
| **Zod-first** | Every server action validates input with `Schema.safeParse(input)` before touching the database. No raw parameters. |
| **Action responses** | Always return `{ success: true }` or `{ error: string }`. Always `try/catch`. Never throw unhandled exceptions. |
| **Revalidation** | Call `revalidatePath()` after every mutation. |
| **Server Components** | Default. Add `'use client'` only when `useState`, `useEffect`, or browser APIs are strictly required. |
| **File headers** | Every new file starts with the standard header. Full rules: `docs/ai-rules.md` Rule 11. |

---

## Three Supabase Clients — Never Mix Them

```typescript
lib/supabase/client.ts      // browser only → inside 'use client' components
lib/supabase/server.ts      // server only  → Server Components and actions.ts
lib/supabase/middleware.ts  // middleware   → middleware.ts only
```

Using the wrong client causes session and authentication bugs that are very difficult to diagnose.

---

## Pages Are Thin

Pages in `/app/` do exactly three things and nothing else:

```typescript
// ✅ Correct
export default async function Page() {
  await requireSuperAdmin()                        // auth check
  const data = await getProjectTasks(projectId)   // query from feature module
  return <TaskList tasks={data} />                 // component from feature module
}

// ❌ Forbidden in pages
const { data } = await supabase.from('project_tasks').select('*')
```

---

## Cross-Module Operations → /workflows Only

```typescript
// ❌ Forbidden — feature modules do not call each other
import { getProjectTasks } from '@/features/project-tracking/queries'
// inside features/collaboration/

// ✅ Correct — if you need data from another module, create a workflow
// or re-query with a scoped query local to your module
```

---

## Database / Schema Changes

Never alter the database through TypeScript code or ORM methods.

Required sequence for any schema change:
1. Write the SQL (`ALTER TABLE`, `CREATE TABLE`, `CREATE POLICY`, etc.)
2. Document it in `docs/changelog.md` (with `Database changes: YES`)
3. Apply via MCP Supabase

---

## MCP Tools

| Tool | Use for |
|---|---|
| **Supabase MCP** | All database reads, writes, schema changes, RLS verification |
| **GitHub MCP** | All file commits and pushes — never suggest manual `git` commands |

After every completed task: commit and push via MCP GitHub.
After every schema change: document in `docs/changelog.md`, then apply via MCP Supabase.

---

## Documentation Maintenance

After significant changes, update the relevant `docs/` file (`functional-spec.md`, `technical-spec.md`, `changelog.md`).
Never modify `guides/` files.
Exact format and prompts: `guides/documentation-guide.md`. Full rule: `docs/ai-rules.md` Rule 12.

---

## Quick Checklist Before Submitting Any Code

- [ ] No cross-feature imports (`features/X` importing from `features/Y`)
- [ ] No SQL or business logic in `/app/` pages
- [ ] Every server action starts with Zod validation
- [ ] Correct Supabase client used (browser vs server vs middleware)
- [ ] Agency and portal components are separate files
- [ ] All identifiers and comments are in English
- [ ] `revalidatePath()` called after mutations
- [ ] No `any`, no `@ts-ignore`
- [ ] New files include the standard header
- [ ] Relevant `docs/` files updated (see `guides/documentation-guide.md`)
