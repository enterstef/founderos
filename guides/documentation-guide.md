# Documentation Guide
# How We Create and Maintain Documentation in FoundersOS

> This document is the starting point for any new project or major restructure.
> It defines what documents exist, what each one does, when it gets updated,
> and the exact prompts to use when asking AI to create or update them.

---

## 1. The Two-Folder Logic

```
docs/       Documentation ABOUT the system
            → What it does, how it's built, rules for the agent, change log
            → Read by: AI agents, developers, anyone who needs to understand the system

guides/     Documentation about HOW WE WORK with the system
            → Strategy, vision, decisions, operating procedures
            → Read by: you (as architect), you (as operator)
```

If you are unsure where a document belongs, ask:
**"Is this about the application, or about how I build the application?"**
First answer → `docs/`. Second answer → `guides/`.

---

## 2. Complete Document Map

```
AGENTS.md                        ← project root, auto-read by AI agents every session

docs/
  functional-spec.md             ← what the app does (screens, flows, features)
  technical-spec.md              ← how it's built (stack, schema, architecture)
  ai-rules.md                    ← rules for AI agents working on this code
  changelog.md                   ← structured log of all significant changes

guides/
  product-vision.md              ← why the product exists, for whom, end goal
  architecture-guide.md          ← how to make design decisions (for you as architect)
  ai-operator-guide.md           ← how to run AI agent sessions (for you as operator)
  documentation-guide.md         ← this file: how to create and maintain all documents
```

---

## 3. Each Document: Purpose, Owner, Update Trigger

### `AGENTS.md` — project root
**Purpose:** Quick-reference brief for AI agents. Auto-read at the start of every session.
**Keep it:** Short. Every line costs tokens on every session.
**Update when:** Architecture rules change, new MCP tools are added, stack changes.
**Never add:** Long explanations, code examples, anything that belongs in `ai-rules.md`.

---

### `docs/functional-spec.md`
**Purpose:** What the application does from a user perspective — screens, flows, features, roles.
**Starts with:** 3-4 sentences of product context (replaces a separate short vision doc).
**Update when:** A new feature is added, a flow changes significantly, a screen is removed.
**Agent updates this:** Yes — after implementing any new user-facing feature.

---

### `docs/technical-spec.md`
**Purpose:** How the application is built — stack decisions, database schema, file structure, deployment.
**Update when:** Stack changes, new tables are added, architecture decisions are revised.
**Agent updates this:** Yes — after any significant technical change.

---

### `docs/ai-rules.md`
**Purpose:** Full rule set for AI agents. Detailed version of AGENTS.md with examples and reasoning.
**Update when:** New architectural patterns emerge, recurring agent mistakes are identified, new rules are established.
**Agent updates this:** No — you update this consciously after discovering a new rule worth encoding.

---

### `docs/changelog.md`
**Purpose:** Structured log of all significant changes to the system. Used by AI to trace bugs.
**Update when:** After every session that produces a meaningful change (new feature, schema change, refactor).
**Agent updates this:** Yes — at the end of every session as part of the commit routine.
**Format:** See Section 5 below.

---

### `guides/product-vision.md`
**Purpose:** Complete product vision — why the product exists, who it's for, what success looks like.
**Update when:** Product direction changes significantly.
**Agent updates this:** No — this is a strategic document you own.

---

### `guides/architecture-guide.md`
**Purpose:** Decision frameworks for you when you don't know what to build or how to structure something.
**Update when:** You encounter a new type of architectural decision and figure out the right answer.
**Agent updates this:** No — you update this when you learn something new about the system.

---

### `guides/ai-operator-guide.md`
**Purpose:** How to run AI agent sessions effectively — prompts, checklists, danger signs, recovery.
**Update when:** You discover new effective patterns or new failure modes when working with agents.
**Agent updates this:** No — this is your personal operating knowledge.

---

## 4. Code File Header Standard

Every code file in the project starts with this header. No exceptions.
The AI agent adds this header when creating any new file.

```typescript
// =============================================================================
// FILE:     features/project-tracking/actions.ts
// PURPOSE:  Server actions for task completion and sequential locking
// EXPORTS:  completeTask, forceUnlockTask, updateTaskContent
// USES:     lib/supabase/server.ts, lib/auth-helpers.ts
// USED BY:  app/(portal)/[projectId]/task/[taskId]/page.tsx
// =============================================================================
```

**Rules for the header:**
- `FILE` — path from project root
- `PURPOSE` — one sentence, what this file does
- `EXPORTS` — main functions or components exported
- `USES` — direct dependencies (max 4-5, most important ones)
- `USED BY` — who imports from this file (max 4-5, most important ones)

If a file is very simple (e.g., a single Zod schema), a shorter version is acceptable:

```typescript
// FILE:    features/project-tracking/schemas.ts
// PURPOSE: Zod validation schemas for project tracking actions
```

---

## 5. Changelog Format

Every entry follows this exact structure:

```markdown
## [YYYY-MM-DD] — Short title describing what changed

**Type:** feature | fix | refactor | schema | config
**Scope:** Which part of the system (e.g., features/project-tracking, database, deployment)

**What changed:**
Brief description of what was added, changed, or removed.

**Files affected:**
- features/project-tracking/actions.ts
- features/project-tracking/schemas.ts

**Database changes:** YES / NO
If YES: [describe the SQL change]

**Why:** One sentence on why this change was made.
```

**Entry types explained:**
- `feature` — new user-facing functionality
- `fix` — bug correction
- `refactor` — code restructure without behavior change
- `schema` — database change (table, column, policy, index)
- `config` — environment, deployment, tooling change

---

## 6. Prompts for Creating Documents

Use these when starting a new project or when a document needs to be created from scratch.

### Create the full documentation set for a new project:

```
Read guides/documentation-guide.md completely.

Based on our conversations and the current state of the project,
create all documents defined in the documentation guide.

Create them in this order:
1. docs/functional-spec.md
2. docs/technical-spec.md
3. docs/ai-rules.md
4. docs/changelog.md (empty template with first entry)
5. AGENTS.md (at project root)

For guides/, I will provide the content — do not generate those autonomously.

After creating each file, confirm what was created before moving to the next.
Commit all files via MCP GitHub: "docs: initialize documentation structure"
```

---

### Create a single missing document:

```
Read guides/documentation-guide.md first.

Create [document name] following the purpose, format, and rules defined
in the documentation guide for this document type.

Base the content on:
- Current codebase state (read relevant files via MCP GitHub)
- [any additional context you provide here]

Commit via MCP GitHub: "docs: add [document name]"
```

---

## 7. Prompts for Updating Documents

Use these at the end of a session or after a significant change.

### Update changelog after a session:

```
Read guides/documentation-guide.md for the changelog format.

Add a new entry to docs/changelog.md for the work done in this session.
Use the exact format defined in the documentation guide.

Session summary:
- [list what was done]
- [any schema changes]
- [files modified]

Commit via MCP GitHub: "docs: update changelog [YYYY-MM-DD]"
```

---

### Update functional-spec after a new feature:

```
Read docs/functional-spec.md and guides/documentation-guide.md.

Update functional-spec.md to reflect the new feature just implemented:
[describe the feature in 2-3 sentences]

Update only the relevant section. Do not rewrite the entire document.
Commit via MCP GitHub: "docs: update functional-spec — [feature name]"
```

---

### Update technical-spec after an architectural change:

```
Read docs/technical-spec.md and guides/documentation-guide.md.

Update technical-spec.md to reflect this architectural change:
[describe what changed]

If a new table was added, include the full schema.
If a new module was added, include it in the file structure section.
Do not rewrite sections that did not change.
Commit via MCP GitHub: "docs: update technical-spec — [change description]"
```

---

### Full documentation sync (after major milestone):

```
Read guides/documentation-guide.md completely.
Then read the current state of all docs/ files.
Then read the current codebase structure via MCP GitHub.

Identify and list discrepancies between what the documentation says
and what the codebase actually contains.

Then update each document that is out of sync, one at a time,
confirming with me before making changes to each one.

Do not update guides/ documents — those are mine to update.
```

---

## 8. Rules for AI Agents Regarding Documentation

These rules belong in `docs/ai-rules.md` as well, but are listed here for completeness.

1. **Add the file header to every new file created.** No exceptions.
2. **Update `docs/changelog.md` at the end of every session** that includes meaningful changes.
3. **Update `docs/functional-spec.md`** when a new user-facing feature is implemented.
4. **Update `docs/technical-spec.md`** when a schema, module, or architectural element changes.
5. **Never modify `guides/` documents** unless explicitly instructed.
6. **Never rewrite a document entirely** when only a section needs updating.

---

*guides/documentation-guide.md*
*Update this file when the documentation structure itself changes.*
