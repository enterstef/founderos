# FOUNDERS OS — ANEXE COMPLETE v2.2a (Claude)

> Acest fișier completează *FoundersOS_technical_documentation_v2.2.md*. Conține versiunile extinse, dar compacte, ale Anexei A (`docs/changelog.md`) și Anexei B (checklist de sesiune cu agentul AI). În v2.2, `docs/changelog.md` a fost eliminat; istoricul schimbărilor de schemă și deciziilor tehnice se păstrează în `docs/changelog.md`.

---

# ANEXA A — `docs/changelog.md`, versiunea completă

> Notă v2.2a: această anexă păstrează logica anexei inițiale, dar înlocuiește `docs/MIGRATION_CHECKLIST.md` cu `docs/changelog.md`. Nu crea un fișier separat de migration checklist.

## A.1 De ce există acest fișier și ce protejează

MCP-ul Supabase aplică schimbări direct pe baza de date live. Nu lasă, de la sine, nicio urmă în Git. Fără acest fișier:

- Nu poți reconstrui schema de la zero dintr-un repo curat — depinzi de starea curentă a unui proiect Supabase pe care s-ar putea să nu-l mai ai acces la el peste un an.
- Un al doilea fondator (sau un developer angajat după Handover, conform viziunii de business secțiunea 7) nu are de unde să știe *de ce* tabelul X are coloana Y, sau de ce o politică RLS e scrisă într-un anume fel.
- Nu poți face audit: dacă un client raportează că vede date care nu-i apar lui, primul instinct e "ce s-a schimbat la RLS și când" — fără log, răspunsul e "nu știm".

Acest fișier este, practic, **istoricul deciziilor tehnice** promis clientului la Handover. Nu e birocrație — e singurul lucru care transformă "am cerut agentului să facă ceva prin MCP" în "există dovadă scrisă a ce s-a făcut și de ce".

## A.2 Ce intră în fișier și ce NU

| Tip de operație | Intră în checklist? |
|---|---|
| Creare/modificare/ștergere de tabel | ✅ DA |
| Creare/modificare politică RLS | ✅ DA — întotdeauna, fără excepție |
| Creare/modificare funcție sau trigger | ✅ DA |
| Creare/modificare bucket de storage sau politică de storage | ✅ DA |
| Adăugare index | ✅ DA |
| UPDATE/DELETE pe date care afectează mai mult de un rând (ex: corectare în masă) | ✅ DA |
| UPDATE pe un singur rând, pentru setup (ex: promovare super_admin) | ✅ DA — e rar, dar critic pentru securitate |
| Un simplu SELECT de verificare/debugging | ❌ NU |
| Citirea schemei pentru a o inspecta (fără modificare) | ❌ NU |

**Regula simplă:** dacă operația schimbă ceva ce ar exista și mâine, după ce închizi sesiunea cu agentul — intră în checklist. Dacă e doar o privire, nu intră.

## A.3 Formatul complet al unei intrări

Varianta din documentul principal este minimală. În practică, intrările din `docs/changelog.md` pot păstra acest format extins, atâta timp cât respectă regula din `guides/documentation-guide.md` §5 și includ `Type: schema` pentru schimbările de schemă:

```markdown
## [YYYY-MM-DD] — Short description
Type: schema | rls_policy | function | storage | index | data_fix | seed
Tables/objects affected: [listă explicită]
Reason: [de ce a fost nevoie de schimbarea asta — o propoziție]
Applied via: Supabase MCP (Antigravity) | Manual (Dashboard) — evită al doilea, dar notează-l dacă s-a întâmplat
Model used: Claude | Gemini
SQL exported to: [path în supabase/migrations/, sau "N/A — data-only change"]
Verified: [ce query/test a confirmat că a funcționat]
Applied: YES / NO
Rollback available: YES (vezi mai jos) / NO
```

Câmpul `Model used` nu e doar curiozitate — dacă peste câteva luni o politică RLS se comportă neașteptat, ajută să știi exact ce sesiune (și ce model) a scris-o, ca să poți relua contextul exact din acea conversație.

## A.4 Istoricul complet, pre-populat — cum ar trebui să arate fișierul după secțiunea 6.10

Dacă ai rulat deja task-ul complet de schemă din secțiunea 6.10 a documentului tehnic, fișierul tău nu ar trebui să aibă o singură intrare generică „Initial schema" — ar trebui să aibă o intrare **per obiect creat**, pentru că fiecare e o decizie separată, verificabilă separat. Așa ar trebui să arate, realist:

```markdown
# FoundersOS — Changelog

---

## [2026-01-15] — Create `profiles` table + auto-create trigger
Type: schema
Tables/objects affected: profiles, trigger on_auth_user_created
Reason: Base table for all role-based access; auto-creation needed so every
  signup gets a row without manual intervention.
Applied via: Supabase MCP (Antigravity)
Model used: Claude
SQL exported to: supabase/migrations/001_initial_schema.sql
Verified: Signed up a test user via Supabase Auth UI, confirmed a matching
  row appeared in profiles with role = 'client'.
Applied: YES
Rollback available: YES (DROP TABLE profiles CASCADE — destructive, see A.5)

---

## [2026-01-15] — Create `master_programs`, `master_modules`, `master_steps`
Type: schema
Tables/objects affected: master_programs, master_modules, master_steps
Reason: Template hierarchy for consultancy programs (section 6.2-6.4).
Applied via: Supabase MCP (Antigravity)
Model used: Claude
SQL exported to: supabase/migrations/001_initial_schema.sql
Verified: Inserted one test program with two modules and three steps via
  MCP query; confirmed cascade delete on program removes modules and steps.
Applied: YES
Rollback available: YES

---

## [2026-01-15] — Create `client_projects` with security-barrier RLS
Type: rls_policy
Tables/objects affected: client_projects
Reason: This is the critical isolation point between clients (section 6.5).
Applied via: Supabase MCP (Antigravity)
Model used: Claude
SQL exported to: supabase/migrations/001_initial_schema.sql
Verified: Created two test client accounts, confirmed via direct query
  (logged in as client A) that client B's project is NOT returned by SELECT.
  This is the single most important verification in the whole schema —
  see checklist item in section 11.5 of the main document.
Applied: YES
Rollback available: YES — but NEVER drop this table's RLS without
  immediately re-testing isolation before any client logs in again.

---

## [2026-01-15] — Create `project_tasks` (Clone & Detach core)
Type: schema
Tables/objects affected: project_tasks
Reason: Detached copy target for cloned template steps (section 6.6).
  Deliberately has NO foreign key to master_steps — confirmed with agent
  this was intentional, not an oversight. Includes sync_mode for protected
  template synchronization.
Applied via: Supabase MCP (Antigravity)
Model used: Claude
SQL exported to: supabase/migrations/001_initial_schema.sql
Verified: Cloned a test program to a test client, confirmed task rows
  created with status='todo', sync_mode='inherit', and no master_step_id column exists.
Applied: YES
Rollback available: YES

---

## [2026-01-15] — Create `task_comments`, `task_attachments` + storage bucket
Type: storage
Tables/objects affected: task_comments, task_attachments, storage bucket
  "task-attachments"
Reason: Asynchronous assistance mechanism (business vision, section 6).
Applied via: Supabase MCP (Antigravity)
Model used: Gemini
SQL exported to: supabase/migrations/001_initial_schema.sql
Verified: Confirmed bucket is private (public = false). Uploaded a test
  file as client A, confirmed client B cannot fetch it by guessing the URL.
  Confirmed INSERT policy checks access to task_id, not only uploaded_by.
Applied: YES
Rollback available: YES — deleting the bucket also deletes stored files,
  confirm no real client data exists before doing this.

---

## [2026-01-15] — Create `get_project_progress` RPC function
Type: function
Tables/objects affected: get_project_progress(p_project_id uuid)
Reason: Weighted-by-time progress calculation (section 6.9) — the core
  motivation mechanism from the business vision.
Applied via: Supabase MCP (Antigravity)
Model used: Claude
SQL exported to: supabase/migrations/001_initial_schema.sql
Verified: Called via supabase.rpc() in a test script with a project that
  has 0 completed minutes (confirmed 0%, no division-by-zero error) and
  one with partial completion (confirmed percentage matches manual calc).
Applied: YES
Rollback available: YES (DROP FUNCTION)

---

## [2026-01-16] — Promote first super_admin
Type: data_fix
Tables/objects affected: profiles (single row)
Reason: One-time bootstrap — no admin exists yet after fresh schema.
Applied via: Supabase MCP (Antigravity)
Model used: Claude
SQL exported to: N/A — data-only change, not part of schema migrations
Verified: SELECT confirmed role = 'super_admin' for the founder's email.
Applied: YES
Rollback available: YES (set role back to 'client')
```

Observă pattern-ul: **fiecare intrare e verificabilă de o terță persoană fără să fi fost prezentă** — exact testul pentru "documentație reală" pe care viziunea de business îl cere pentru Handover.

## A.5 Schimbări ulterioare — exemple tipice, după lansare

Pe măsură ce produsul evoluează, vei adăuga intrări de tipul:

```markdown
## [2026-03-02] — Add `industry` column to client_projects
Type: schema
Tables/objects affected: client_projects
Reason: Consultanta a cerut să poată filtra clienții după industrie în
  dashboard-ul agenției.
Applied via: Supabase MCP (Antigravity)
Model used: Gemini
SQL exported to: supabase/migrations/002_add_industry_column.sql
Verified: Column appears as nullable text; existing rows unaffected
  (confirmed with SELECT count(*) before/after).
Applied: YES
Rollback available: YES (DROP COLUMN — pierzi datele dacă a fost deja populată)

---

## [2026-03-10] — Tighten task_comments INSERT policy
Type: rls_policy
Tables/objects affected: task_comments
Reason: Bug raportat — un client putea, teoretic, posta un comentariu pe
  un task dintr-un alt proiect dacă ghicea task_id-ul. Policy-ul de INSERT
  nu verifica apartenența la proiect, doar autentificarea.
Applied via: Supabase MCP (Antigravity)
Model used: Claude
SQL exported to: supabase/migrations/003_fix_comment_insert_policy.sql
Verified: Reprodus bug-ul cu un cont de test ÎNAINTE de fix (a funcționat,
  confirmând vulnerabilitatea), apoi confirmat că request-ul e respins DUPĂ fix.
Applied: YES
Rollback available: NO — fix de securitate, nu se face rollback intenționat
```

Acest ultim exemplu arată ceva important: **când fix-ul e de securitate, notezi explicit că nu vrei rollback**, ca să nu-l anuleze din greșeală un agent viitor care vede "Rollback available: YES" și presupune că e sigur.

## A.6 Task pentru agent — verificare periodică de integritate

O dată pe lună (sau înainte de orice demo important), rulează acest task:

```
Tools needed: Supabase MCP
Task: Audit schema integrity.

1. List all tables, their RLS status, and all active policies via MCP.
2. Compare against docs/changelog.md — flag any table or policy
   that exists in the database but has no corresponding logged entry.
3. Flag any table with RLS disabled.
4. Flag any policy that references auth.uid() without a corresponding
   ownership condition (potential security gap pattern from section 6.5
   of the technical documentation).

Report findings as a list. Do not modify anything — this is read-only.
```

Acest task nu schimbă nimic — doar îți spune dacă realitatea din Supabase s-a desincronizat de istoricul scris. Dacă răspunsul găsește o discrepanță, rezolvi discrepanța **înainte** să continui cu alte task-uri de schemă.

---

# ANEXA B — Checklist de sesiune cu agentul AI, versiunea completă

## B.1 Înainte să începi o sesiune nouă

Bifează rapid, mental sau literal, înainte să scrii primul task:

```
□ Știu exact ce arie ating: features/[x], workflows/[x], sau "database schema"?
□ Dacă ating schema: am citit secțiunea relevantă din documentul tehnic
  (6.1-6.9) chiar înainte de sesiune, ca să pot verifica rezultatul?
□ Am ales modelul (Claude/Gemini) pentru tipul ăsta de task, sau merge
  orice — și dacă nu sunt sigur, sunt OK să testez ambele pe un task mic?
□ Știu ce fișiere NU trebuie touch-uite (vezi structura din secțiunea 5)?
```

## B.2 Mesajul de pornire — variante per tip de sesiune

Mesajul general din documentul principal funcționează, dar în practică ai nevoie de variante ușor diferite. Iată-le pe toate.

**Variantă A — sesiune de schemă (touch-uiește baza de date):**

```
You are working on FoundersOS, in Google Antigravity. Before starting:

1. Read docs/ai-rules.md completely.
2. This session touches the database schema — Supabase MCP is available
   and required for this task.
3. Read the relevant subsection of the technical documentation (I will
   paste it or reference it) before writing any SQL.
4. After applying via MCP: export the equivalent SQL to
   supabase/migrations/, and add a complete entry to
   docs/changelog.md using Type: schema, following Appendix A and
   guides/documentation-guide.md §5.
5. Run a verification query and report what you verified, not just "done".

Current task: [describe]
Tools needed: Supabase MCP
```

**Variantă B — sesiune pe un feature module (doar cod):**

```
You are working on FoundersOS, in Google Antigravity. Before starting:

1. Read docs/ai-rules.md completely.
2. This session is scoped to features/[module-name] only.
   No Supabase MCP needed — the table(s) involved already exist.
3. Never import from another features/ module — if you need cross-module
   data, flag it to me instead of improvising a workaround.
4. All mutations go through Zod validation (schemas.ts) before touching data.

Current task: [describe]
Files to modify: [explicit list]
Tools needed: file edits
```

**Variantă C — sesiune pe un workflow cross-module:**

```
You are working on FoundersOS, in Google Antigravity. Before starting:

1. Read docs/ai-rules.md completely.
2. This task belongs in /workflows, not in any single feature module or
   in /app — it touches more than one table/feature area.
3. Treat this as a single atomic operation: if any step fails partway,
   roll back what was already written (see workflows/clone-template-to-project.ts
   for the rollback pattern already used in this codebase).

Current task: [describe]
Tools needed: file edits
```

**Variantă D — sesiune de debugging:**

```
You are working on FoundersOS, in Google Antigravity. Before starting:

1. Read docs/ai-rules.md completely.
2. This is a debugging session, not a feature session — do not refactor
   unrelated code "while you're in there".
3. If the bug is related to data access or unexpected results, check
   first whether it's an RLS policy issue — use Supabase MCP to inspect
   the current policies before assuming the bug is in application code.
4. If you find the bug is in an RLS policy, fixing it counts as a schema
   change — follow Appendix A's logging requirement after the fix.

Bug description: [describe exactly what's wrong, with reproduction steps]
Tools needed: Supabase MCP (read-only first), file edits (if bug is in code)
```

## B.3 În timpul sesiunii — semnale de alarmă

Oprește și verifică imediat dacă agentul:

```
🚩 Propune să creeze o funcție custom de tip is_admin() sau similar, în loc
   de subquery-ul uniform din secțiunea 6.0 — semn că nu a citit/respectă
   pattern-ul stabilit.
🚩 Vrea să modifice un fișier din /components/ui/ — acela e gestionat
   exclusiv de shadcn CLI.
🚩 Propune un import cross-feature ("e mai rapid așa") — refuză, cere
   un workflow dedicat.
🚩 Aplică o schimbare de schemă prin MCP și NU menționează exportul SQL
   sau intrarea în docs/changelog.md — cere-i explicit să completeze
   pasul înainte să continui.
🚩 Modifică un task din project_tasks fără să verifice status != 'done'
   — riscă să suprascrie un istoric pe care viziunea de business îl
   tratează ca "înregistrare istorică îngheța" (secțiunea 6).
🚩 Creează un bucket de storage cu public = true "pentru simplitate".
🚩 Modifică sincronizarea template-urilor și filtrează doar după status, fără
   să respecte sync_mode = 'inherit'. Asta poate suprascrie task-uri
   personalizate pentru un client.
🚩 Implementează uploadAttachment fără pre-flight authorization check sau fără
   cleanup compensator dacă insert-ul în task_attachments eșuează — risc de
   fișiere orfane în Storage.
🚩 Raportează "done" fără să arate ce a verificat — cere dovada explicit
   (query rulat, output, ce confirmă).
```

Dacă vezi unul din astea, nu continua — oprește task-ul, corectează instrucțiunea, și repornește. E mult mai ieftin acum decât după ce ai construit pe lângă greșeală.

## B.4 După ce agentul raportează „done" — checklist de acceptare

```
□ Output-ul arată explicit CE a verificat, nu doar "am terminat"?
□ Dacă a fost task de schemă: există entry nou în changelog.md,
  cu toate câmpurile din formatul A.3 (nu doar data și descrierea)?
□ Dacă a fost task de schemă: există fișier nou/actualizat în
  supabase/migrations/?
□ Fișierele modificate sunt EXACT cele din lista "Files to modify" —
  nimic suplimentar, nicio "mică îmbunătățire" netrecută prin task?
□ Dacă a touch-uit RLS: a rulat (sau i-ai cerut tu să ruleze) testul de
  izolare client-vs-client din secțiunea 11.5?
□ Dacă a touch-uit sincronizarea Master Template: a verificat explicit că
  task-urile cu sync_mode = 'custom' NU sunt suprascrise?
□ Dacă a touch-uit uploadAttachment: a verificat pre-flight authorization check
  și cleanup-ul fișierului dacă insert-ul în task_attachments eșuează?
□ Codul nou respectă WET-ul în UI (componente separate agency/portal),
  nu o componentă universală cu props condiționale?
```

Doar după ce toate bifele sunt OK, faci commit.

## B.5 Schimbarea modelului în mijlocul proiectului (Claude ↔ Gemini)

Pentru că documentul și `ai-rules.md` sunt scrise să fie agnostice de model (secțiunea 1.4 din documentul tehnic), schimbarea modelului la mijloc de proiect nu ar trebui să fie dramatică — dar merită un mic ritual, ca să nu pierzi continuitate:

```
□ Noul model a citit docs/ai-rules.md? (cere-i explicit, nu presupune.)
□ Există context din sesiunea anterioară care NU e scris nicăieri în
  fișiere (decizii discutate doar în chat, nu salvate)? Dacă da, scrie-l
  acum în changelog.md, ai-rules.md, sau un comentariu în cod —
  altfel se pierde la schimbarea de model.
□ Dă-i noului model un task mic, izolat, ca "warm-up" înainte de un task
  mare — verifici astfel că respectă pattern-urile (secțiunea 6.0, WET,
  Zod-first) înainte să-i dai ceva critic.
```

Regula de fond: **dacă o decizie importantă există doar în memoria unei conversații cu un model și nu e scrisă în niciun fișier din repo, ea nu există** pentru sesiunea următoare — indiferent dacă schimbi modelul sau nu. Disciplina de a scrie în `changelog.md` și `ai-rules.md` e ceea ce face schimbarea de model sigură.

## B.6 La finalul sesiunii — checklist de închidere

```
□ Toate fișierele modificate sunt commit-uite, cu un mesaj de commit
  clar (nu "fix" sau "update")?
□ Dacă a fost o sesiune de schemă: changelog.md e actualizat
  ȚI commit-uit (nu doar aplicat live prin MCP)?
□ Dacă ai descoperit pe parcurs o regulă nouă, neacoperită de
  ai-rules.md (ex: un pattern nou de evitat) — ai adăugat-o acolo,
  cât timp e proaspătă în minte?
□ Dacă task-ul a rămas neterminat: ai notat explicit unde s-a oprit și
  ce rămâne, ca să nu pierzi timp redescoperind starea la sesiunea viitoare?
```

---

*FoundersOS — Anexe complete, generat cu Claude Sonnet 4.6, complementar documentației tehnice v2.2*
