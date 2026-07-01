# FOUNDERS OS — DOCUMENTAȚIE TEHNICĂ v2.2 (Claude — adaptat pentru Google Antigravity + MCP)

> **Convenție de limbaj:** Toată proza documentului este în română. Tot codul — variabile, comentarii, denumiri de fișiere, mesaje de eroare, și *task-urile scrise pentru agentul AI* — este exclusiv în engleză. Modelele AI produc cod mai stabil și mai predictibil pe input în engleză, și un task scris în engleză e mai ușor de citit identic de Claude și de Gemini.

> **Ce s-a schimbat față de v2.1:**
> 1. **Protecția task-urilor personalizate la sincronizare** — coloană nouă `sync_mode` pe `project_tasks` (6.6), separă starea de execuție (`status`) de starea de sincronizare cu Master Template. `updateTaskContent` (8.2) o setează pe `'custom'`; `syncStepToActiveTasks` (9.2) sincronizează doar task-urile cu `sync_mode = 'inherit'`.
> 2. **Prevenirea fișierelor orfane la upload** — `uploadAttachment` (8.3) face acum un pre-flight authorization check înainte de upload în Storage, și șterge fișierul dacă insert-ul în `task_attachments` eșuează ulterior (6.8).
> 3. **`docs/MIGRATION_CHECKLIST.md` eliminat** — istoricul schimbărilor de schemă trece în `docs/changelog.md`, ca intrări `Type: schema`, conform `guides/documentation-guide.md` §5 (Anexa A).


---

## REZUMAT EXECUTIV

**Ce construiești în 3 propoziții:**
FoundersOS este o aplicație web cu două zone complet separate — un Control Room pentru cei doi fondatori și un Portal pentru fiecare client. Fondatorii creează programe template, le alocă clienților și urmăresc progresul. Clienții parcurg un traseu ghidat, pas cu pas, în spațiul lor privat, fără să știe că alți clienți există.

**Ce ai la final:**
- `yourapp.vercel.app/agency/*` — Control Room complet pentru fondatori
- `yourapp.vercel.app/portal/[projectId]/*` — spațiu privat per client
- Backend Supabase: bază de date PostgreSQL, autentificare, stocare fișiere
- CI/CD automat: fiecare push pe GitHub deployează pe Vercel

**Cum lucrezi efectiv, în Antigravity:**
Nu scrii SQL și nu scrii (în mare parte) cod direct. Citești specificația dintr-o secțiune a acestui document, o transformi într-un task pentru agent (format standard, vezi secțiunea 1.5), agentul execută — folosind MCP-ul Supabase pentru tot ce ține de bază de date, și editare directă de fișiere pentru tot ce ține de cod Next.js. Tu verifici rezultatul față de specificație. Documentul rămâne sursa de adevăr; agentul e mâna care implementează.

**7 decizii tehnice care guvernează tot ce urmează:**

| # | Decizie | Ce înseamnă practic |
|---|---|---|
| 1 | **RLS ca gard de securitate principal** | Securitatea nu stă în cod, stă în baza de date. Chiar dacă există un bug în aplicație, Supabase blochează accesul neautorizat. |
| 2 | **Modularitate fizică în `/features`** | Fiecare arie funcțională este o cameră izolată. Un agent AI care lucrează la comentarii nu poate strica accidental modulul de progres. |
| 3 | **`/workflows` pentru operații cross-module** | Clone & Detach și sincronizarea template-urilor nu trăiesc în pagini. Trăiesc în coridoare dedicate. |
| 4 | **Zod obligatoriu înainte de orice mutație** | Nicio dată nu intră în baza de date fără validare de schemă. Nicio excepție. |
| 5 | **WET în UI** | Componentele pentru agenție și portal se scriu separat, chiar dacă se aseamănă 80%. Duplicarea controlată previne bug-uri de regresie. |
| 6 | **Schema prin MCP, documentată automat** | Orice modificare de bază de date trece printr-un task pentru agent + MCP, niciodată prin editare manuală nedocumentată în Dashboard. Istoricul deciziilor rămâne intact pentru Handover. |
| 7 | **Coloane sensibile = doar prin service client** | RLS controlează rândurile. Pentru coloane sensibile (conținut, durate, chei de identificare), accesul de scriere e restricționat suplimentar la nivel de coloană în Postgres, iar singura cale de a le scrie e un client server-side dedicat, folosit doar după verificarea explicită a rolului `super_admin`. |

**Estimare de timp pentru setup complet (secțiunile 4-7):** 2-3 ore prima dată — nu pentru că tastezi tu cod, ci pentru că supervizezi agentul, verifici fiecare task față de specificație, și corectezi din mers.

---

## 1. CUM LUCREZI CU AGENTUL AI ÎN ANTIGRAVITY

### 1.1 Ce este Antigravity, în acest context

Antigravity este mediul în care dai comenzi unui agent AI care are acces direct la repository (poate citi și scrie fișiere, poate rula comenzi de terminal) și la unelte externe prin MCP. Pentru FoundersOS, unealta externă relevantă este **MCP-ul Supabase**: agentul poate inspecta schema curentă, poate crea tabele, poate scrie și activa politici RLS, poate crea funcții, poate rula query-uri de verificare — toate direct pe proiectul tău Supabase, fără ca tu să deschizi Dashboard-ul.

Tu nu mai ești operatorul care copiază SQL. Tu ești cel care **scrie specificația și verifică rezultatul**.

### 1.2 Ce înlocuiește exact, față de fluxul manual

| Înainte (manual) | Acum (Antigravity + MCP) |
|---|---|
| Copiai blocuri SQL din document → Supabase Dashboard → SQL Editor → Run | Dai agentului specificația din secțiunea 6 ca task; el scrie și execută SQL-ul prin MCP |
| Verificai manual în Dashboard că RLS e activ pe fiecare tabel | Ceri agentului un query de verificare prin MCP (ex: confirmă `relrowsecurity = true`) |
| Notai manual ce ai schimbat, dacă îți aminteai | Ceri agentului să adauge o intrare în `docs/changelog.md` (format: `guides/documentation-guide.md` §5) ca ultim pas al fiecărui task de schemă |

**✅ CORECT** — exemplu de task minimal pentru o schimbare de schemă:
```
Tools needed: Supabase MCP
Task: Create the `task_attachments` table exactly as specified in section 6.8.
Then enable RLS and apply the two policies listed there.
Verify with a query that RLS is enabled before reporting done.
```

**❌ GREȘIT** — tu deschizi Supabase Dashboard, scrii manual `CREATE TABLE task_attachments (...)`, și nu rămâne nicio urmă scrisă a deciziei. La Handover, clientul (sau, în cazul agenției, fondatorul care nu a fost prezent) nu are de unde să afle *de ce* a fost creat tabelul așa.

### 1.3 Distincția critică: MCP e o unealtă de dezvoltare, nu o cale de runtime

MCP-ul Supabase este folosit **doar de agent, doar în timpul dezvoltării** — pentru schema, migrații, query-uri ad-hoc de verificare sau debugging. Aplicația live, în producție, nu știe nimic despre MCP. Ea vorbește cu Supabase exact cum este descris în secțiunea 7: prin `@supabase/ssr` (pentru sesiunile utilizatorilor) și prin clientul de tip service (secțiunea 7.1bis, pentru mutațiile administrative pe coloane sensibile) — niciodată prin MCP.

**❌ FORBIDDEN** — agentul importă sau apelează unelte/SDK-uri de tip MCP în interiorul unui Server Action sau al unei pagini din `/app`. MCP nu există în codul aplicației, sub nicio formă.

**✅ CORECT** — Server Actions și queries.ts folosesc exclusiv clienții Supabase standard (secțiunea 7.1). MCP rămâne complet în afara codebase-ului — e o unealtă pe care o folosește agentul, nu o dependență a produsului.

Dacă la un moment dat un task generat de agent pare să introducă o dependență legată de MCP în cod, e un semnal că task-ul a fost prost scopat — rescrie-l mai specific.

### 1.4 Alegerea modelului: Claude vs Gemini

Antigravity îți permite să alegi, per task, care model execută. Acest document este scris să fie **agnostic de model**: orice regulă, orice specificație, orice task template din el funcționează identic indiferent dacă rulează pe Claude sau pe Gemini — pentru că regulile sunt explicite, nu implicite (vezi și secțiunea 2.2).

Nu există aici o rețetă universal corectă pentru "ce model pentru ce task" — depinde și de versiunile disponibile la momentul respectiv. Ce e util de reținut:
- **Task-uri mari, cu mult context simultan** (ex: implementarea completă a Clone & Detach, care touch-uiește schema, workflows și UI deodată) beneficiază de un model care poate ține tot contextul activ fără să-l rescoți tu manual.
- **Task-uri mici, bine izolate** (o singură schemă Zod, un singur query) sunt suficient de simple încât diferența dintre modele e mică — alege ce ai la îndemână.
- Regula reală de aur: **niciun task nu ar trebui să depindă de "ce model e mai bun azi"**. Dacă scopul unui task e clar și fișierele permise sunt explicite (secțiunea 1.5), rezultatul ar trebui să fie verificabil indiferent de model. Dacă nu poți verifica rezultatul fără să cunoști intern modelul folosit, task-ul a fost prea vag.

### 1.5 Formatul standard al unui task pentru agent

Acesta este formatul pe care îl folosești pentru *orice* comandă dată agentului, în orice secțiune a acestui document. Salvează-l ca referință rapidă.

```
Read docs/ai-rules.md first.

Context: FoundersOS — two-sided app (Agency Control Room + Client Portal)
Module/Area: [features/x, workflows/x, or "database schema"]
Tools needed: [Supabase MCP / file edits / terminal / none]
Task: [specific, scoped description]
Files to modify: [explicit list, or "creates new files in ..."]
Do NOT modify: [explicit list of files to leave untouched]
Expected output: [what a correct result looks like — testable, not vague]
```

Câmpul `Tools needed` este obligatoriu de completat cu `Supabase MCP` de fiecare dată când task-ul touch-uiește schema, RLS, GRANT-uri de coloană, sau date direct în baza de date. Pentru task-uri pur de cod (componente, server actions care folosesc deja un tabel existent), `Tools needed` este de regulă `file edits` — fără MCP.

---

## 2. FILOSOFIA ARHITECTURALĂ

### 2.1 Metafora Operating System

FoundersOS tratează aplicația ca pe un sistem de operare cu compartimentare fizică rigidă:

```
/features    =  Camerele      → izolate, autosuficiente, nu importă una din alta
/workflows   =  Coridoarele   → singurele locuri unde camerele comunică
Supabase     =  Fundația      → sursa unică de adevăr, securitate prin RLS + GRANT-uri de coloană
/app         =  Ușile         → rutare, layout-uri, pagini subțiri fără logică
```

**Regula de aur a paginilor:** O pagină din `/app` face exact 3 lucruri și nimic mai mult:
1. Verifică autorizarea
2. Apelează un query din feature module
3. Randează componente din feature module

```typescript
// CORECT — pagina este subțire, fără logică proprie
export default async function ClientsPage() {
  await requireSuperAdmin()
  const clients = await getActiveClients()
  return <ClientList clients={clients} />
}

// GREȘIT — logica de business nu aparține paginii
export default async function ClientsPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('client_projects').select('*, profiles(*)')
  // ...
}
```

### 2.2 De ce această arhitectură funcționează cu agenți AI

Agenții AI (Claude, Gemini — indiferent dacă rulează prin Antigravity, Cursor sau Claude Code) produc cod de calitate maximă când:
- Știu exact în ce fișier să scrie — pattern predictibil, mereu același
- Nu pot face greșeli structurale prin design — granițele sunt fizice, nu conceptuale
- Au reguli explicite, nu convenții implicite
- Contextul unui task nu depășește 3-4 fișiere

Fiecare decizie arhitecturală din acest document este optimizată pentru aceste patru condiții — și de aceea funcționează la fel de bine indiferent ce model alegi în Antigravity (secțiunea 1.4).

### 2.3 WET vs DRY în UI — duplicarea intenționată

WET (Write Everything Twice) în UI înseamnă că `TaskCardAgency` și `TaskCardPortal` sunt două componente separate, chiar dacă vizual seamănă 80%. Motivul:

- Modifici `TaskCardPortal` pentru o funcție specifică clientului → zero risc să strici `TaskCardAgency`
- Agentul AI primește un task cu scope clar: „modifică componenta X din modulul Y" fără să se întrebe ce altceva mai este afectat
- Bug-urile de regresie dispar aproape complet

Această regulă se aplică **exclusiv componentelor UI**. Query-urile și schemele Zod pot fi partajate dacă sunt identice.

---

## 3. STACK TEHNIC

### 3.1 Tehnologii utilizate

| Tehnologie | Versiune | Rol |
|---|---|---|
| Next.js | 14+ App Router | Framework, routing, Server Actions |
| TypeScript | 5+ strict | Type safety obligatoriu peste tot |
| Supabase | Latest | Auth, PostgreSQL, Storage, Realtime — gestionat dev-time prin MCP |
| shadcn/ui | Latest | Componente UI instalate în proiect |
| Tailwind CSS | 3+ | Styling (vine automat cu shadcn) |
| Zod | 3+ | Validare scheme de date |
| Lucide React | Latest | Iconuri (vine cu shadcn) |
| Sonner | Latest | Toast notifications |

### 3.2 Ce NU folosim și de ce

| Evitat | Motiv |
|---|---|
| Redux / Zustand | Server Components gestionează starea. Zero state management pe client. |
| React Query / SWR | `revalidatePath()` în Server Actions face același lucru, nativ, fără configurare. |
| Prisma / Drizzle | ORM-ul adaugă un strat care interferează cu RLS și complică raționamentul agentului AI. |
| tRPC | Server Actions sunt native Next.js. Nu avem nevoie de un layer API separat. |
| next-auth | Supabase Auth este integrat complet cu baza de date și RLS. |

### 3.3 De ce Next.js App Router (nu Pages Router)

- Server Components citesc date direct din baza de date, fără API routes intermediare
- Server Actions gestionează mutațiile de date fără endpoint-uri API separate
- Route Groups (`(auth)`, `(agency)`, `(portal)`) izolează layout-urile vizual și funcțional
- Este direcția oficială Next.js — cel mai bun suport din ecosistem și din antrenamentul modelelor AI

### 3.4 Componente shadcn de instalat la setup

```bash
npx shadcn-ui@latest add button input textarea label card badge progress \
  dialog alert-dialog separator tabs avatar skeleton
```

Restul componentelor se adaugă pe măsură ce ai nevoie de ele. Poți cere agentului direct: „Install the shadcn `[component]` and use it in `[file]`" — e un task pur de terminal + file edits, fără MCP.

---

## 4. CONFIGURAREA INIȚIALĂ

Pașii de mai jos poți fie să-i rulezi tu direct în terminalul din Antigravity, fie să-i dai ca task agentului — sunt comenzi standard, nu specifice MCP. Singurul pas care implică MCP propriu-zis e 4.3 (după ce conectezi proiectul Supabase, agentul îl poate folosi din acel moment).

### Pasul 4.1: Creare proiect Next.js

```bash
npx create-next-app@latest founders-os \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --import-alias "@/*"

cd founders-os
```

Răspunde la prompturi:
- Would you like to use `src/` directory? → **No** (structura noastră e la rădăcină)
- Would you like to customize the default import alias? → **No** (acceptă `@/*`)

### Pasul 4.2: Instalare dependențe

```bash
# Supabase SSR (obligatoriu pentru App Router — NU folosi @supabase/auth-helpers-nextjs, e deprecated)
npm install @supabase/ssr @supabase/supabase-js

# Validare
npm install zod

# Notificări
npm install sonner

# shadcn (urmează prompturile: alege style "New York", base color "zinc", CSS variables "yes")
npx shadcn-ui@latest init

# Componente shadcn de bază
npx shadcn-ui@latest add button input textarea label card badge progress \
  dialog alert-dialog separator tabs avatar skeleton
```

### Pasul 4.3: Creare proiect Supabase + conectare MCP

1. Mergi la [supabase.com](https://supabase.com) → New Project
2. Alege o regiune apropiată (ex: `eu-central-1` pentru România)
3. Notează din **Project Settings → API**:
   - **Project URL** → `https://xxxxxxxxxxxx.supabase.co`
   - **anon public key** → cheia publică (safe pentru frontend)
   - **service_role key** → cheia secretă (NICIODATĂ pe client; folosită exclusiv server-side, în clientul de tip service din secțiunea 7.1bis)
4. În Antigravity, conectează MCP-ul Supabase la acest proiect (configurare unică, ține de setup-ul Antigravity, nu de cod). Din acest moment, orice task cu `Tools needed: Supabase MCP` poate acționa pe acest proiect.

**✅ CORECT:** verifici conexiunea cu un task simplu înainte să începi schema: „List the existing tables in this Supabase project via MCP." Dacă răspunsul e o listă goală (proiect nou), conexiunea funcționează.

### Pasul 4.4: Variabile de mediu

Creează `.env.local` la rădăcina proiectului:

```env
# ============================================
# SUPABASE — copiază valorile din Project Settings → API
# ============================================

# Safe for frontend (NEXT_PUBLIC_ prefix makes it available in browser)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# NEVER expose this in client code — server only.
# Used exclusively inside lib/supabase/service.ts (section 7.1bis).
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Verifică că `.env.local` este în `.gitignore` (create-next-app îl adaugă automat).

### Pasul 4.5: TypeScript strict mode

Deschide `tsconfig.json` și asigură-te că `compilerOptions` include:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### Pasul 4.6: Configurare Sonner (toast notifications)

În `app/layout.tsx`, adaugă provider-ul:

```typescript
import { Toaster } from 'sonner'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body>
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  )
}
```

---

## 5. STRUCTURA FIȘIERELOR

Aceasta este structura completă a proiectului. Respectarea ei este obligatorie și non-negociabilă — dă-i-o agentului ca referință permanentă, nu doar o dată.

```
founders-os/
│
├── app/                                    # Next.js App Router — PAGINI SUBȚIRI
│   ├── (auth)/                             # Route group: autentificare
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── callback/
│   │   │   └── route.ts                   # Supabase OAuth callback handler
│   │   └── layout.tsx                     # Layout fără sidebar/nav
│   │
│   ├── (agency)/                          # Route group: fondatori (super_admin only)
│   │   ├── layout.tsx                     # Verifică rol + sidebar agenție
│   │   ├── dashboard/
│   │   │   └── page.tsx                   # Vedere de ansamblu toți clienții
│   │   ├── programs/
│   │   │   ├── page.tsx                   # Lista programe master
│   │   │   └── [programId]/
│   │   │       ├── page.tsx               # Editare program: module + pași
│   │   │       └── modules/
│   │   │           └── [moduleId]/
│   │   │               └── page.tsx
│   │   └── clients/
│   │       ├── page.tsx                   # Lista proiecte clienți active
│   │       └── [projectId]/
│   │           └── page.tsx               # Monitorizare proiect specific
│   │
│   ├── (portal)/                          # Route group: clienți
│   │   ├── layout.tsx                     # Verifică autentificare + sidebar portal
│   │   └── [projectId]/
│   │       ├── page.tsx                   # Dashboard proiect + progres global
│   │       └── task/
│   │           └── [taskId]/
│   │               └── page.tsx           # Pagina unui pas individual
│   │
│   ├── globals.css
│   └── layout.tsx                         # Root layout (Toaster, fonts)
│
├── features/                              # CAMERELE — izolate, autosuficiente
│   │
│   ├── auth/                              # Autentificare și profil
│   │   ├── components/
│   │   │   └── login-form.tsx
│   │   ├── actions.ts                     # signIn(), signOut()
│   │   └── schemas.ts                     # LoginSchema
│   │
│   ├── program-management/                # Programe master și template-uri
│   │   ├── components/
│   │   │   ├── program-list.tsx
│   │   │   ├── program-form.tsx
│   │   │   ├── module-list.tsx
│   │   │   └── step-editor.tsx
│   │   ├── actions.ts                     # createProgram(), updateStep(), deleteModule()
│   │   ├── queries.ts                     # getProgramWithModules(), getAllPrograms()
│   │   └── schemas.ts                     # ProgramSchema, ModuleSchema, StepSchema
│   │
│   ├── client-management/                 # Proiecte clienți și alocare
│   │   ├── components/
│   │   │   ├── client-list.tsx            # Tabel cu toți clienții activi
│   │   │   ├── client-card.tsx
│   │   │   └── allocate-program-dialog.tsx
│   │   ├── actions.ts                     # createClientProfile()
│   │   ├── queries.ts                     # getActiveClients(), getClientProject()
│   │   └── schemas.ts                     # ClientProjectSchema
│   │
│   ├── project-tracking/                  # Progres și task-uri
│   │   ├── components/
│   │   │   ├── task-list-agency.tsx       # ← SEPARAT (WET — nu combina cu portal)
│   │   │   ├── task-list-portal.tsx       # ← SEPARAT (WET — nu combina cu agency)
│   │   │   ├── task-card-agency.tsx
│   │   │   ├── task-card-portal.tsx
│   │   │   ├── progress-overview.tsx      # Dashboard global progres
│   │   │   └── module-progress-bar.tsx    # Bar per modul cu procent ponderat
│   │   ├── actions.ts                     # completeTask(), resetTaskToTodo(), updateTaskContent()
│   │   ├── queries.ts                     # getProjectTasks(), getProgressByModule()
│   │   └── schemas.ts                     # CompleteTaskSchema, ResetTaskToTodoSchema
│   │
│   └── collaboration/                     # Comentarii și atașamente
│       ├── components/
│       │   ├── comment-thread.tsx
│       │   ├── comment-form.tsx
│       │   └── attachment-list.tsx
│       ├── actions.ts                     # addComment(), uploadAttachment()
│       ├── queries.ts                     # getTaskComments(), getTaskAttachments()
│       └── schemas.ts                     # CommentSchema, AttachmentSchema
│
├── workflows/                             # CORIDOARELE — operații cross-module
│   ├── clone-template-to-project.ts      # Alocă program → creează project_tasks
│   └── sync-template-updates.ts          # Propagă modificări master → tasks 'todo'
│
├── components/                            # Componente UI partajate (nu feature-specifice)
│   ├── ui/                                # shadcn auto-generated — NU modifica manual
│   └── shared/
│       ├── page-header.tsx
│       ├── loading-skeleton.tsx
│       └── empty-state.tsx
│
├── lib/                                   # Utilitare pure
│   ├── supabase/
│   │   ├── client.ts                      # Browser client (componente 'use client')
│   │   ├── server.ts                      # Server client — sesiunea utilizatorului, respectă RLS + GRANT-uri
│   │   ├── service.ts                     # ⚠️ Service-role client — DOAR server-side, DOAR după requireSuperAdmin()
│   │   └── middleware.ts                  # Middleware client (doar în middleware.ts)
│   ├── auth-helpers.ts                    # requireSuperAdmin(), requireAuth()
│   └── utils.ts                           # cn() helper (shadcn)
│
├── middleware.ts                          # Protecție rute, validare rol
│
├── docs/
│   ├── ai-rules.md                        # Regulile imuabile pentru agenți AI
│   └── changelog.md                       # Log structurat al tuturor schimbărilor — inclusiv cele de schemă, aplicate prin MCP
│
└── supabase/
    └── migrations/                        # Fișiere SQL generate de agent DUPĂ fiecare task de schemă
        └── 001_initial_schema.sql         # Echivalentul SQL al schemei din secțiunea 6 — exportat, nu scris de tine
```

**De ce există `supabase/migrations/` dacă schema se aplică prin MCP, nu prin fișiere SQL?**
Pentru că MCP-ul aplică schimbarea direct pe baza de date live, dar nu lasă automat un fișier versionat în Git. Fără acel fișier, istoricul schemei există doar în capul agentului din sesiunea respectivă — exact genul de pierdere de context pe care Handover-ul din viziunea de business trebuie să-l evite. De aceea, fiecare task de schemă din secțiunea 6 cere explicit agentului să exporte SQL-ul echivalent în acest folder, ca ultim pas.

### Regulile absolute pentru structură

1. **Zero import-uri cross-feature.** `features/collaboration` nu importă nimic din `features/project-tracking`.
2. **Paginile nu conțin SQL sau apeluri MCP.** Niciodată `supabase.from(...)` direct într-un fișier din `/app`, și niciodată unelte MCP în cod de aplicație (secțiunea 1.3).
3. **`/components/ui/` nu se modifică manual.** Este gestionat exclusiv de shadcn CLI.
4. **Orice operație care scrie în două feature module** merge în `/workflows`, nu în pagini sau actions.
5. **`service_role_key` apare doar în `lib/supabase/service.ts`** și niciodată în componente `'use client'` sau în alt fișier server-side. Un singur punct de intrare, ușor de auditat.

---

## 6. SPECIFICAȚIA BAZEI DE DATE

Această secțiune conține **specificația completă** — câmpuri, tipuri, relații, reguli de acces — pe care o transformi în task pentru agent, conform formatului din 1.5. Agentul scrie și execută SQL-ul exact prin MCP; tu validezi rezultatul față de ce e descris aici.

### 6.0 Pattern-ul uniform pentru verificarea rolului

Toate politicile RLS de mai jos care depind de rol folosesc același subquery, peste tot, fără excepție:

```sql
(SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
```

**❌ GREȘIT** (un agent poate fi tentat să "optimizeze"): creează o funcție custom `is_super_admin()` SECURITY DEFINER pentru fiecare verificare de rol, sau folosește un JOIN complex în loc de subquery.

**✅ CORECT:** subquery-ul de mai sus, repetat identic în fiecare politică. E mai puțin "elegant", dar e un singur pattern de verificat, de citit și de depanat — exact ce vrei când mai mulți agenți (sau modele diferite) lucrează pe codebase în sesiuni diferite.

Include acest pattern explicit în orice task de schemă pe care îl scrii.

### 6.1 `profiles`

**Scop:** O înregistrare per utilizator autentificat, cu rolul lui.

| Câmp | Tip | Constrângeri |
|---|---|---|
| id | uuid | PK, FK → `auth.users(id)` ON DELETE CASCADE |
| email | text | NOT NULL, UNIQUE |
| full_name | text | NOT NULL |
| role | text | NOT NULL, DEFAULT `'client'`, CHECK IN (`'super_admin'`, `'client'`) |
| created_at / updated_at | timestamptz | NOT NULL, DEFAULT now() |

**Reguli RLS:**
- SELECT: utilizatorul își vede propriul rând (`auth.uid() = id`) SAU este `super_admin` (vede tot).
- INSERT: doar `super_admin`.
- UPDATE: doar `super_admin`.

**Comportament adițional obligatoriu:** un trigger pe `auth.users` (după INSERT) creează automat rândul corespunzător în `profiles`, cu `role = 'client'` implicit. Fără acest trigger, fiecare cont nou ar rămâne fără profil și ar pica orice verificare de rol din middleware.

**✅ CORECT:** rolul implicit pentru orice cont nou e `'client'`. Promovarea la `super_admin` se face manual, o singură dată per fondator (secțiunea 11.4) — niciodată automat.

### 6.2 `master_programs`

**Scop:** Programele template (ex: "Vânzări", "HR") create de fondatori, vizibile doar lor.

| Câmp | Tip | Constrângeri |
|---|---|---|
| id | uuid | PK, default random |
| program_key | uuid | NOT NULL, DEFAULT `gen_random_uuid()`, UNIQUE — identificator stabil al programului, separat de `id`. Vezi nota despre chei stabile mai jos. |
| title | text | NOT NULL |
| description | text | opțional |
| version | integer | NOT NULL, DEFAULT 1 — incrementat manual de fondator când conținutul se schimbă semnificativ; e informativ, nu declanșează nimic automat |
| created_at / updated_at | timestamptz | NOT NULL, DEFAULT now() |

**Reguli RLS:** acces complet (SELECT/INSERT/UPDATE/DELETE) doar pentru `super_admin`. Niciun client nu vede vreodată un rând din acest tabel direct — clienții văd doar copia detached din `project_tasks` (6.6).

> **Notă despre `program_key` vs `id`:** în mod normal `id`-ul unui rând e deja stabil. `program_key` există ca un al doilea identificator, intenționat separat de ciclul de viață al rândului — dacă vreodată un program e șters și recreat sub același nume, sau dacă faci o migrare de date care regenerează `id`-uri, `program_key` e câmpul pe care îl poți păstra constant intenționat. Pentru `module_key` (6.3) și `step_key` (6.4) motivul e identic.

### 6.3 `master_modules`

**Scop:** Modulele dintr-un program (ex: programul "Vânzări" are modulele "Prospectare", "Negociere").

| Câmp | Tip | Constrângeri |
|---|---|---|
| id | uuid | PK |
| module_key | uuid | NOT NULL, DEFAULT `gen_random_uuid()`, UNIQUE — identificator stabil, folosit la clonare (6.6) și niciodată la titlu |
| program_id | uuid | NOT NULL, FK → `master_programs(id)` ON DELETE CASCADE |
| title | text | NOT NULL |
| sort_order | integer | NOT NULL, DEFAULT 0 |
| created_at / updated_at | timestamptz | NOT NULL |

**Reguli RLS:** identic cu `master_programs` — acces complet, doar `super_admin`.

### 6.4 `master_steps`

**Scop:** Pașii individuali dintr-un modul — rețeta master, neschimbată de clonare.

| Câmp | Tip | Constrângeri |
|---|---|---|
| id | uuid | PK |
| step_key | uuid | NOT NULL, DEFAULT `gen_random_uuid()`, UNIQUE — identificator stabil, folosit de `sync-template-updates.ts` (9.2) pentru a găsi task-urile clonate corespunzătoare. Niciodată potrivire după `title`. |
| module_id | uuid | NOT NULL, FK → `master_modules(id)` ON DELETE CASCADE |
| title | text | NOT NULL |
| content_instructions | text | NOT NULL |
| estimated_minutes | integer | NOT NULL, DEFAULT 15, CHECK > 0 |
| track_type | text | NOT NULL, CHECK IN (`'business'`, `'execution'`) |
| sort_order | integer | NOT NULL, DEFAULT 0 |
| created_at / updated_at | timestamptz | NOT NULL |

**Reguli RLS:** identic — acces complet, doar `super_admin`.

`estimated_minutes` este câmpul care alimentează direct mecanismul de "progres ponderat pe timp" descris în viziunea de business — nu e un detaliu cosmetic, e motorul motivației clientului. Verifică explicit cu agentul că niciun task din `master_steps` nu rămâne cu valoarea implicită de 15 minute dacă realitatea e alta.

### 6.5 `client_projects`

**Scop:** Un rând per client înrolat. **Aceasta este bariera critică de securitate** — orice scurgere aici înseamnă că un client vede datele altui client.

| Câmp | Tip | Constrângeri |
|---|---|---|
| id | uuid | PK |
| client_id | uuid | NOT NULL, FK → `profiles(id)` |
| title | text | NOT NULL |
| company_info | jsonb | NOT NULL, DEFAULT `'{}'` |
| created_at / updated_at | timestamptz | NOT NULL |

**Reguli RLS:**
- SELECT: `auth.uid() = client_id` SAU `super_admin`.
- INSERT/UPDATE/DELETE: doar `super_admin`.

**❌ GREȘIT** — o variantă subtil periculoasă pe care un agent o poate genera dacă task-ul nu e suficient de explicit: politica de SELECT verifică doar `super_admin`, fără clauza `OR auth.uid() = client_id` — rezultatul ar fi că niciun client nu-și vede propriul proiect (eroare vizibilă, ușor de prins) — sau, mai grav, invers: politica omite complet condiția `client_id` și verifică doar `auth.uid() IS NOT NULL`, caz în care **orice client autentificat vede proiectele tuturor clienților**. Acesta e exact testul din checklist-ul de la secțiunea 11.5 ("un client nu vede proiectele altui client") — nu e opțional, e cea mai importantă verificare din tot proiectul.

**✅ CORECT:** politica de SELECT conține explicit ambele condiții, legate prin OR, exact cum sunt listate mai sus.

### 6.6 `project_tasks`

**Scop:** Elementul central al Clone & Detach. Copia complet decuplată a pașilor master, per client.

| Câmp | Tip | Constrângeri |
|---|---|---|
| id | uuid | PK |
| project_id | uuid | NOT NULL, FK → `client_projects(id)` ON DELETE CASCADE |
| module_instance_key | uuid | NOT NULL — generat o singură dată per (proiect, modul) în momentul clonării. Toți pașii clonați din același modul master, în aceeași operație de clonare, primesc aceeași valoare. **Acesta**, nu `module_title`, e cheia de grupare folosită de blocarea secvențială (8.2) și de calculul de progres (6.9). |
| source_program_key | uuid | NOT NULL — snapshot al `master_programs.program_key` la momentul clonării. **Nu** e FK (Detach rămâne intact) — e doar o valoare copiată, pentru trasabilitate. |
| source_module_key | uuid | NOT NULL — snapshot al `master_modules.module_key`. Nu e FK. |
| source_step_key | uuid | NOT NULL — snapshot al `master_steps.step_key`. Nu e FK. Folosit de sync (9.2) pentru potrivire. |
| source_template_version | integer | NOT NULL — snapshot al `master_programs.version` la momentul clonării. |
| track_type | text | NOT NULL, CHECK IN (`'business'`, `'execution'`) |
| module_title | text | NOT NULL — *doar* etichetă de afișare, snapshot al titlului modulului la clonare. Nu se mai folosește în nicio logică de grupare, blocare sau sincronizare — acela e rolul lui `module_instance_key` și `source_step_key`. |
| title | text | NOT NULL |
| content_instructions | text | NOT NULL — personalizabil per client, independent de master |
| estimated_minutes | integer | NOT NULL, DEFAULT 15, CHECK > 0 |
| status | text | NOT NULL, DEFAULT `'todo'`, CHECK IN (`'todo'`, `'done'`) |
| sync_mode | text | NOT NULL, DEFAULT `'inherit'`, CHECK IN (`'inherit'`, `'custom'`) — *nou în v2.2* |
| sort_order | integer | NOT NULL |
| created_at / updated_at | timestamptz | NOT NULL |

**`status` vs. `sync_mode` — două concepte separate (v2.2):** `status` descrie dacă *clientul* a terminat task-ul (`todo` → `done`). `sync_mode` descrie dacă task-ul mai *primește update-uri din Master Template* (`inherit`) sau a fost personalizat de consultant și nu mai trebuie suprascris (`custom`). Înainte de v2.2, sincronizarea (9.2) filtra doar după `status = 'todo'` — iar un task personalizat, dar încă neexecutat de client, rămânea `todo` și putea fi suprascris cu conținutul generic din Master la următoarea sincronizare, pierzând munca de consultanță. Cele două câmpuri se schimbă independent:
- task-urile clonate pornesc cu `sync_mode = 'inherit'` (9.1);
- orice editare manuală a conținutului, prin `updateTaskContent` (8.2), trece task-ul pe `sync_mode = 'custom'`;
- `syncStepToActiveTasks` (9.2) actualizează doar task-urile cu `sync_mode = 'inherit'`, indiferent de `status`;
- un buton de tip „Resume Sync with Master", care resetează `sync_mode` înapoi la `'inherit'`, rămâne posibil de adăugat ulterior fără nicio schimbare de schemă.

**Important:** acest tabel **nu are o coloană de foreign key către `master_steps`**. Asta e intenționat — e exact mecanismul "Detach" din viziunea de business: odată clonat, un task e independent de rețeta originală. `source_program_key`, `source_module_key` și `source_step_key` nu schimbă asta — sunt valori simple copiate, fără constrângere de FK, deci nu reintroduc cuplarea. Dacă agentul propune să transformi oricare din ele într-o FK reală "pentru trasabilitate", respinge — sparge filozofia de personalizare fără haos.

**Reguli RLS (SELECT):** clientul vede task-urile din proiectele lui (via join cu `client_projects.client_id = auth.uid()`) SAU este `super_admin`.

**Reguli RLS + GRANT (UPDATE):** vezi 6.6.1 mai jos — UPDATE-ul nu mai e o singură politică RLS simplă, e securitate pe două straturi.

**Reguli (INSERT/DELETE):** doar `super_admin` (prin clientul de tip service, secțiunea 7.1bis).

**Indexuri necesare** (cere-le explicit agentului, altfel query-urile de progres devin lente pe măsură ce crește numărul de clienți): index pe `project_id`, și index compus pe `(project_id, module_instance_key, sort_order)`.

#### 6.6.1 Securitate pe două straturi pentru UPDATE — de ce și cum

**Problema pe care o rezolvă:** RLS controlează *ce rânduri* poate atinge un utilizator cu UPDATE — nu controlează *ce coloane* poate scrie în acel rând. Cu o singură politică RLS de tipul „clientul poate actualiza task-urile din propriile proiecte", un client autentificat care apelează direct PostgREST (ocolind complet Server Action-ul `completeTask`) ar putea, în teorie, să trimită un request care modifică `content_instructions`, `estimated_minutes`, `title` sau chiar `module_instance_key` pe rândul lui — nu doar `status`. Aplicația ta nu ar genera niciodată un astfel de request, dar RLS singur nu-l împiedică dacă altcineva îl trimite manual.

**Soluția: două straturi, fiecare cu rol diferit.**

**Stratul 1 — RLS (rânduri):** politica de UPDATE rămâne `auth.uid() = (SELECT client_id FROM client_projects WHERE id = project_tasks.project_id)` SAU `super_admin`, cu `WITH CHECK` identic la `USING` (altfel un client ar putea muta un task în alt proiect prin update — `WITH CHECK` previne exact asta).

**Stratul 2 — GRANT la nivel de coloană (coloane):** rolul Postgres `authenticated` (rolul pe care îl au *toate* sesiunile logate prin Supabase, indiferent dacă utilizatorul e `client` sau `super_admin` la nivel de aplicație — distincția de rol e doar în `profiles`, nu în Postgres) primește drept de UPDATE *doar* pe coloanele `status` și `updated_at`:

```sql
REVOKE UPDATE ON public.project_tasks FROM authenticated;
GRANT UPDATE (status, updated_at) ON public.project_tasks TO authenticated;
```

Orice request — venit din Server Action sau direct din PostgREST cu JWT-ul utilizatorului — care încearcă să seteze `content_instructions`, `estimated_minutes`, `title`, `module_title`, `module_instance_key`, `source_step_key`, `sync_mode` sau orice altă coloană în afara celor două permise, primește o eroare de permisiune direct din Postgres, indiferent de RLS.

**De ce nu rezolvă GRANT-ul singur, fără un client separat:** `super_admin` are nevoie să poată scrie `content_instructions`, `estimated_minutes` și `sync_mode` (din `updateTaskContent`, secțiunea 8.2) și să poată reseta `status` independent de fluxul clientului (din `resetTaskToTodo`). Dar în Supabase, distincția `client` vs `super_admin` e o coloană în `profiles`, nu un rol Postgres separat — ambii folosesc rolul `authenticated` când se conectează prin sesiunea lor normală. Dacă GRANT-ul de mai sus se aplică la `authenticated`, se aplică identic și pentru fondator, atâta vreme cât fondatorul folosește clientul de sesiune obișnuit.

**De aceea există clientul de tip service (`lib/supabase/service.ts`, secțiunea 7.1bis):** pentru mutațiile administrative pe coloane sensibile, Server Action-ul nu folosește clientul de sesiune al fondatorului — folosește un client construit cu `service_role key`, care ocolește complet RLS și GRANT-urile de coloană (are acces total la nivel de bază de date). Acest client **nu există decât server-side**, și fiecare Server Action care îl folosește începe obligatoriu cu `await requireSuperAdmin()` — deci verificarea de rol există la nivel de aplicație, *înainte* ca clientul service să fie folosit. Combinația „GRANT restrictiv pentru `authenticated` + client service folosit doar după verificare explicită de rol" închide complet gaura de securitate: nu există nicio cale, nici prin Server Action, nici prin apel direct la PostgREST cu JWT-ul unui client, prin care cineva neautorizat să scrie coloane sensibile.

**Task pentru agent — pattern de inclus explicit:**
```
After creating project_tasks and its RLS policies, also apply column-level
privileges:
  REVOKE UPDATE ON public.project_tasks FROM authenticated;
  GRANT UPDATE (status, updated_at) ON public.project_tasks TO authenticated;
Verify with a query that lists column privileges for the authenticated role
on project_tasks before reporting done.
```

### 6.7 `task_comments`

**Scop:** Asistența asincronă — comentarii documentate pe task-uri specifice.

| Câmp | Tip | Constrângeri |
|---|---|---|
| id | uuid | PK |
| task_id | uuid | NOT NULL, FK → `project_tasks(id)` ON DELETE CASCADE |
| user_id | uuid | NOT NULL, FK → `profiles(id)` |
| message | text | NOT NULL |
| created_at | timestamptz | NOT NULL |

**Reguli RLS:** SELECT și INSERT permise oricui are deja acces la task-ul respectiv (client owner al proiectului SAU `super_admin`); la INSERT, `user_id` trebuie să fie egal cu `auth.uid()` — un utilizator nu poate posta un comentariu "în numele" altcuiva.

### 6.8 `task_attachments` + bucket de storage

**Scop:** Fișiere atașate la un task.

| Câmp | Tip | Constrângeri |
|---|---|---|
| id | uuid | PK |
| task_id | uuid | NOT NULL, FK → `project_tasks(id)` ON DELETE CASCADE |
| storage_path | text | NOT NULL — calea privată în bucket, format `{auth.uid()}/{task_id}/{filename}`. **Nu** stoca un URL public. |
| file_name | text | NOT NULL |
| uploaded_by | uuid | NOT NULL, FK → `profiles(id)` |
| created_at | timestamptz | NOT NULL |

**Reguli RLS pe tabel:**
- SELECT — oricine are acces la task (client owner al proiectului SAU `super_admin`).
- INSERT — necesită **ambele** condiții, nu doar prima:
  1. `uploaded_by = auth.uid()`
  2. utilizatorul are deja acces la `task_id`-ul referit, prin același join folosit pentru SELECT pe `project_tasks` (proprietarul proiectului din care face parte task-ul, sau `super_admin`)

**❌ GREȘIT (v2.0):** policy de INSERT care verifică doar `uploaded_by = auth.uid()`. Un client autentificat ar putea trimite un INSERT cu un `task_id` ghicit sau colectat din altă parte (UUID-urile circulă în URL-uri, network tab etc.), aparținând altui client, și atașa acolo un fișier — `uploaded_by` ar fi în continuare el însuși, deci condiția unică ar trece.

**✅ CORECT (v2.1):** policy de INSERT cere explicit join-ul prin `project_tasks → client_projects` pentru a confirma că `task_id`-ul aparține unui proiect al utilizatorului curent (sau că utilizatorul e `super_admin`), pe lângă verificarea `uploaded_by`.

**Storage bucket:**
- nume: `task-attachments`
- `public = false` — obligatoriu privat, niciodată public
- **structura de path este obligatorie:** `{auth.uid()}/{task_id}/{filename}` — primul segment identifică uploaderul, al doilea leagă fișierul de task, ambele verificabile în policy-urile de storage
- policy de INSERT pe storage: utilizatorul autentificat poate uploada doar sub propriul prefix `{auth.uid()}/...` (primul segment al path-ului trebuie să fie `auth.uid()::text`)
- policy de SELECT pe storage: un utilizator vede fișierele din propriul prefix, SAU e `super_admin`
- **acces exclusiv prin signed URL**, generat la cerere (vezi `getTaskAttachments`, secțiunea 8.3) — niciodată un URL public direct, niciodată stocat în baza de date

**❌ GREȘIT:** bucket creat cu `public = true` "ca să fie mai simplu de testat", sau coloana `file_url` păstrată ca URL public direct. Documentele clienților (potențial informații de business sensibile) ar fi accesibile prin URL direct, fără autentificare, oricui îl obține.

**Ordinea operațiilor la upload (v2.2):** RLS pe `task_attachments` rămâne scutul principal de securitate, dar el intervine abia la INSERT — *după* ce fișierul a ajuns deja în Storage. Pentru a evita fișiere orfane în bucket atunci când `taskId` e invalid sau nu aparține utilizatorului, `uploadAttachment` (8.3) face un pre-flight check pe `project_tasks` înainte de orice upload, și șterge fișierul din Storage dacă insert-ul în `task_attachments` eșuează ulterior din orice motiv. Detalii în 8.3.

### 6.9 Funcția de progres ponderat — `get_project_progress`

**Scop:** Implementează mecanismul central din viziunea de business: progresul nu se măsoară în număr de task-uri bifate, ci în timp investit.

**Regula de calcul** (per grup `module_instance_key`, pentru un `project_id` dat):
- `completed_minutes` = suma `estimated_minutes` pentru task-urile cu `status = 'done'`
- `total_minutes` = suma `estimated_minutes` pentru toate task-urile din grup
- `progress_percentage` = `(completed_minutes / total_minutes) × 100`, rotunjit la 1 zecimală; dacă `total_minutes = 0`, rezultatul e `0`, niciodată o eroare de împărțire la zero
- `module_title` afișat pentru fiecare grup este preluat dintr-un singur rând reprezentativ al grupului (ex: `MIN(module_title)` sau orice valoare din grup — toate rândurile dintr-un `module_instance_key` au aceeași etichetă, deoarece au fost clonate împreună) — e doar eticheta de afișare, **gruparea în sine** se face strict după `module_instance_key`, niciodată după `module_title`
- grupurile se ordonează după cel mai mic `sort_order` din grup

Cere agentului să implementeze această regulă ca funcție RPC (`get_project_progress(p_project_id uuid)`), apelabilă din `queries.ts` via `supabase.rpc()` (vezi secțiunea 8.3). Numele și semnătura funcției contează — codul din secțiunea 8.3 le folosește exact așa.

### 6.10 Task-ul complet pentru agent — schema inițială

Acesta e task-ul pe care îl dai, o singură dată, la începutul proiectului.

```
Tools needed: Supabase MCP
Context: FoundersOS — initial database schema (v2.2)
Task: Create the full schema described in section 6 of the FoundersOS technical
documentation (subsections 6.1 through 6.9), in this order, respecting foreign keys:

  profiles → master_programs → master_modules → master_steps →
  client_projects → project_tasks → task_comments → task_attachments

For each table:
- Use the exact field names, types, and constraints from its spec card,
  including the stable key fields: program_key (6.2), module_key (6.3),
  step_key (6.4), and on project_tasks: module_instance_key,
  source_program_key, source_module_key, source_step_key,
  source_template_version (6.6).
- Enable Row Level Security.
- Implement the policies exactly as described, using the uniform role-check
  pattern from 6.0: (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
- Pay special attention to client_projects (6.5) and project_tasks (6.6) —
  these are the security boundary between clients. Double-check the SELECT
  policy includes the client_id condition.
- On project_tasks, after creating the RLS UPDATE policy, also apply the
  column-level GRANT restriction from 6.6.1:
    REVOKE UPDATE ON public.project_tasks FROM authenticated;
    GRANT UPDATE (status, updated_at) ON public.project_tasks TO authenticated;
- On task_attachments, the INSERT policy must check BOTH uploaded_by = auth.uid()
  AND that the user has access to the referenced task_id (via the same
  client_projects join used for project_tasks SELECT), per 6.8.

Also:
- Create the auth.users trigger described in 6.1 (auto-create profile on signup).
- Create the private storage bucket `task-attachments` with the policies from 6.8,
  enforcing the {auth.uid()}/{task_id}/{filename} path structure.
- Create the get_project_progress(p_project_id) RPC function using the
  calculation rule from 6.9 (group by module_instance_key).
- Add the indexes listed in 6.6.

After applying everything via MCP:
1. Run a verification query confirming RLS is enabled on every table
   (relrowsecurity = true) before reporting done.
2. Run a verification query listing column-level privileges for the
   authenticated role on project_tasks, confirming only status and
   updated_at are grantable for UPDATE.
3. Generate the equivalent SQL as supabase/migrations/001_initial_schema.sql.
4. Add an entry to docs/changelog.md describing what was created, following the
   format in guides/documentation-guide.md (Type: schema).

Do not proceed to application code until this schema is verified.
```

---

## 7. AUTENTIFICARE ȘI MIDDLEWARE

Codul din această secțiune **nu se aplică prin MCP** — e cod de aplicație Next.js, scris direct în fișiere de către agent (`Tools needed: file edits`, nu `Supabase MCP`). MCP-ul a intervenit doar în secțiunea 6, pentru schemă. Aici, aplicația vorbește cu Supabase prin SDK-ul standard, exact cum va vorbi în producție.

### 7.1 Cei patru clienți Supabase — o distincție critică

Supabase SSR necesită trei clienți de sesiune separați, plus — nou în v2.1 — un al patrulea client, de tip service, pentru mutațiile administrative pe coloane protejate (secțiunea 6.6.1). Folosirea clientului greșit cauzează bug-uri de sesiune greu de diagnosticat, sau, în cazul clientului service, o gaură de securitate dacă e folosit greșit.

**`lib/supabase/client.ts`** — EXCLUSIV în componente cu `'use client'`

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**`lib/supabase/server.ts`** — EXCLUSIV în Server Components și `actions.ts` (operații care respectă sesiunea utilizatorului curent, supuse RLS și GRANT-urilor de coloană)

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignored in Server Components — they are read-only context
            // Session refresh happens in middleware
          }
        },
      },
    }
  )
}
```

**`lib/supabase/middleware.ts`** — EXCLUSIV în `middleware.ts` la rădăcina proiectului

```typescript
import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: always call getUser() in middleware to refresh session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabaseResponse, user, supabase }
}
```

#### 7.1bis `lib/supabase/service.ts` — EXCLUSIV server-side, exclusiv după `requireSuperAdmin()`

```typescript
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// ⚠️ SERVICE-ROLE CLIENT
// This client uses SUPABASE_SERVICE_ROLE_KEY and bypasses RLS and all
// column-level GRANT restrictions entirely. It has unrestricted database access.
//
// RULES — no exceptions:
// 1. NEVER import this file from a 'use client' component or any client bundle.
// 2. NEVER call any action that uses this client without `await requireSuperAdmin()`
//    running first, in the same function, before this client is created.
// 3. ONLY use this client for the specific mutations documented in section 6.6.1
//    that require writing columns the `authenticated` role is not granted
//    (content_instructions, estimated_minutes, title, module_title, status
//    reset outside the normal client flow, etc. on project_tasks).
// 4. Regular reads and the client-facing completeTask() mutation NEVER use
//    this client — they use lib/supabase/server.ts, relying on RLS + the
//    column-level GRANT as the actual security boundary.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
```

### 7.2 Middleware de protecție rute

**`middleware.ts`** — la rădăcina proiectului

```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request)
  const pathname = request.nextUrl.pathname

  // 1. Auth routes: redirect logged-in users to portal
  if (pathname.startsWith('/login') || pathname === '/') {
    if (user) {
      return NextResponse.redirect(new URL('/portal', request.url))
    }
    return supabaseResponse
  }

  // 2. All protected routes require authentication
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 3. Read role from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role

  // 4. Agency routes: super_admin only
  if (pathname.startsWith('/agency')) {
    if (role !== 'super_admin') {
      return NextResponse.redirect(new URL('/portal', request.url))
    }
    return supabaseResponse
  }

  // 5. Portal routes: both roles allowed (RLS handles data isolation at DB level)
  if (pathname.startsWith('/portal')) {
    return supabaseResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### 7.3 Auth helpers pentru Server Actions și pagini

**`lib/auth-helpers.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function requireSuperAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') redirect('/portal')

  return user
}

export async function requireAuth() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return user
}
```

### 7.4 OAuth Callback Handler

**`app/(auth)/callback/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/portal'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
```

---

## 8. SPECIFICAȚIA MODULELOR FEATURE

Schemele Zod și Server Actions de mai jos sunt **contracte** — exact ce trebuie să existe în cod. Le dai agentului ca task (`Tools needed: file edits`), referențiind fișierul exact din structura din secțiunea 5. Codul afișat aici dublează ca implementare de referință: când agentul termină, compari rezultatul cu acest cod.

### 8.1 Contractul standard per modul (Zod Schemas)

**`features/program-management/schemas.ts`**

```typescript
import { z } from 'zod'

export const ProgramSchema = z.object({
  title: z.string().min(3, 'Minimum 3 characters').max(100),
  description: z.string().max(500).optional(),
})

export const ModuleSchema = z.object({
  programId: z.string().uuid(),
  title: z.string().min(3).max(100),
  sortOrder: z.number().int().min(0),
})

export const StepSchema = z.object({
  moduleId: z.string().uuid(),
  title: z.string().min(3).max(200),
  contentInstructions: z.string().min(10, 'Instructions must be detailed'),
  estimatedMinutes: z.number().int().min(1).max(480),
  trackType: z.enum(['business', 'execution']),
  sortOrder: z.number().int().min(0),
})

export type ProgramInput = z.infer<typeof ProgramSchema>
export type ModuleInput = z.infer<typeof ModuleSchema>
export type StepInput = z.infer<typeof StepSchema>
```

**`features/project-tracking/schemas.ts`**

```typescript
import { z } from 'zod'

export const CompleteTaskSchema = z.object({
  taskId: z.string().uuid(),
  projectId: z.string().uuid(),
})

// Renamed from ForceUnlockSchema (v2.0) — the action resets status to 'todo',
// it does not "unlock" anything in the sense the old name implied. See 8.2.
export const ResetTaskToTodoSchema = z.object({
  taskId: z.string().uuid(),
  projectId: z.string().uuid(),
})

export const UpdateTaskContentSchema = z.object({
  taskId: z.string().uuid(),
  contentInstructions: z.string().min(10),
  estimatedMinutes: z.number().int().min(1).max(480),
})

export type CompleteTaskInput = z.infer<typeof CompleteTaskSchema>
```

**`features/collaboration/schemas.ts`**

```typescript
import { z } from 'zod'

export const CommentSchema = z.object({
  taskId: z.string().uuid(),
  message: z.string().min(1).max(2000),
})

// v2.1: storagePath replaces fileUrl. We never accept or store a public URL —
// only the private path inside the task-attachments bucket. The path is built
// server-side from auth.uid() + taskId + fileName (see uploadAttachment, 8.2),
// not trusted as raw client input beyond the file name itself.
export const AttachmentSchema = z.object({
  taskId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
})

export type CommentInput = z.infer<typeof CommentSchema>
```

### 8.2 Server Actions complete: completeTask, resetTaskToTodo, updateTaskContent

**`features/project-tracking/actions.ts`**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAuth, requireSuperAdmin } from '@/lib/auth-helpers'
import {
  CompleteTaskSchema,
  ResetTaskToTodoSchema,
  UpdateTaskContentSchema,
} from './schemas'

// ── Complete a task (client action with sequential lock) ──────────────────────
// Uses the regular session client. This action only ever sets `status` and
// `updated_at` — which is exactly what the column-level GRANT from 6.6.1
// allows the `authenticated` role to write. Defense in depth: even if this
// function had a bug and tried to set another column, Postgres would reject it.
export async function completeTask(input: unknown) {
  const user = await requireAuth()
  const supabase = await createClient()

  // 1. Validate input
  const parsed = CompleteTaskSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid input', details: parsed.error.flatten() }
  }

  const { taskId, projectId } = parsed.data

  // 2. Defense in depth: verify client owns this project
  //    (RLS also enforces this at DB level — this is a second layer)
  const { data: project } = await supabase
    .from('client_projects')
    .select('client_id')
    .eq('id', projectId)
    .single()

  if (!project || project.client_id !== user.id) {
    return { error: 'Unauthorized' }
  }

  // 3. Fetch the target task
  const { data: targetTask } = await supabase
    .from('project_tasks')
    .select('sort_order, module_instance_key, status')
    .eq('id', taskId)
    .single()

  if (!targetTask) return { error: 'Task not found' }
  if (targetTask.status === 'done') return { error: 'Task is already completed' }

  // 4. Sequential lock: any earlier task in the same module instance that
  //    is not yet done blocks this one. v2.1 fix — this no longer assumes
  //    sort_order is consecutive (it checked only sort_order - 1 in v2.0,
  //    which missed gaps like 10, 20, 30 or steps inserted later).
  if (targetTask.sort_order > 0) {
    const { data: blockerTask } = await supabase
      .from('project_tasks')
      .select('status, title')
      .eq('module_instance_key', targetTask.module_instance_key)
      .lt('sort_order', targetTask.sort_order)
      .neq('status', 'done')
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (blockerTask) {
      return {
        error: `You must complete "${blockerTask.title}" before advancing to this step.`,
      }
    }
  }

  // 5. Mark as done — only touches status + updated_at, matching the
  //    column-level GRANT from 6.6.1
  const { error: updateError } = await supabase
    .from('project_tasks')
    .update({ status: 'done', updated_at: new Date().toISOString() })
    .eq('id', taskId)

  if (updateError) {
    return { error: 'Failed to update task', details: updateError.message }
  }

  revalidatePath(`/portal/${projectId}`)
  revalidatePath(`/portal/${projectId}/task/${taskId}`)
  return { success: true }
}

// ── Reset a task back to 'todo' (super_admin only) ─────────────────────────────
// Renamed from forceUnlockTask (v2.0) — the function has always set status
// back to 'todo'; the old name implied something it didn't actually do.
// Uses the service client: this still only touches status/updated_at, but
// it intentionally bypasses the client-facing sequential-lock flow, and
// keeping it on the service client makes that bypass explicit and auditable.
export async function resetTaskToTodo(input: unknown) {
  await requireSuperAdmin()
  const supabase = createServiceClient()

  const parsed = ResetTaskToTodoSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }

  const { taskId, projectId } = parsed.data

  const { error } = await supabase
    .from('project_tasks')
    .update({ status: 'todo', updated_at: new Date().toISOString() })
    .eq('id', taskId)

  if (error) return { error: 'Failed to reset task' }

  revalidatePath(`/agency/clients/${projectId}`)
  revalidatePath(`/portal/${projectId}`)
  return { success: true }
}

// ── Update task content (agency customization per client) ─────────────────────
// Uses the service client — content_instructions, estimated_minutes and
// sync_mode are exactly the columns the authenticated role is NOT granted
// (6.6.1), so this mutation cannot go through the regular session client at all.
export async function updateTaskContent(input: unknown) {
  await requireSuperAdmin()
  const supabase = createServiceClient()

  const parsed = UpdateTaskContentSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }

  const { taskId, contentInstructions, estimatedMinutes } = parsed.data

  const { error } = await supabase
    .from('project_tasks')
    .update({
      content_instructions: contentInstructions,
      estimated_minutes: estimatedMinutes,
      // v2.2 — any manual customization detaches the task from Master
      // Template sync. Without this, a customized task left in status
      // 'todo' could still be matched and overwritten by
      // syncStepToActiveTasks (9.2), silently losing the consultant's work.
      sync_mode: 'custom',
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .eq('status', 'todo') // Never overwrite completed tasks

  if (error) return { error: 'Failed to update task content' }

  revalidatePath('/agency')
  return { success: true }
}
```

### 8.3 Query cu progres ponderat + atașamente cu signed URL

**`features/project-tracking/queries.ts`**

```typescript
import { createClient } from '@/lib/supabase/server'

export type ModuleProgress = {
  module_instance_key: string
  module_title: string
  track_type: 'business' | 'execution'
  completed_minutes: number
  total_minutes: number
  progress_percentage: number
}

export async function getProgressByModule(projectId: string): Promise<ModuleProgress[]> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_project_progress', {
    p_project_id: projectId,
  })

  if (error) throw new Error(`Failed to fetch progress: ${error.message}`)

  return data ?? []
}

export async function getProjectTasks(projectId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('project_tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`Failed to fetch tasks: ${error.message}`)

  return data ?? []
}
```

> **Notă:** funcția `get_project_progress` apelată mai sus prin `.rpc()` este cea creată în secțiunea 6.9/6.10, prin MCP — nu o mai scrii aici, doar o consumi.

**`features/collaboration/queries.ts`** — generarea signed URL la cerere

```typescript
import { createClient } from '@/lib/supabase/server'

const SIGNED_URL_EXPIRY_SECONDS = 60 * 5 // 5 minutes — short-lived on purpose

export async function getTaskAttachments(taskId: string) {
  const supabase = await createClient()

  const { data: attachments, error } = await supabase
    .from('task_attachments')
    .select('id, task_id, storage_path, file_name, uploaded_by, created_at')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch attachments: ${error.message}`)
  if (!attachments || attachments.length === 0) return []

  // RLS on the bucket already restricts which paths this user can sign.
  // Generating a fresh, short-lived URL per request means nothing public
  // or long-lived is ever stored or sent to the client.
  const withSignedUrls = await Promise.all(
    attachments.map(async (a) => {
      const { data: signed } = await supabase.storage
        .from('task-attachments')
        .createSignedUrl(a.storage_path, SIGNED_URL_EXPIRY_SECONDS)

      return { ...a, signedUrl: signed?.signedUrl ?? null }
    })
  )

  return withSignedUrls
}
```

**`features/collaboration/actions.ts`** — verificare de acces în avans + construirea `storage_path` server-side

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth-helpers'
import { AttachmentSchema } from './schemas'

// File bytes arrive via FormData in the real implementation; omitted here
// for brevity — the point of this snippet is the pre-flight check, the
// storage_path pattern, and the compensating cleanup.
export async function uploadAttachment(input: unknown, fileBytes: Blob) {
  const user = await requireAuth()
  const supabase = await createClient()

  const parsed = AttachmentSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }

  const { taskId, fileName } = parsed.data

  // v2.2 — pre-flight authorization check, before any byte reaches Storage.
  // Relies on the existing project_tasks SELECT policy (6.6): a client only
  // ever sees tasks from their own projects, super_admin sees all of them.
  // If the row comes back empty, the caller has no legitimate access to
  // taskId — stop here. Without this check, an unauthorized or invalid
  // taskId could still reach Storage and get rejected only afterwards by
  // the task_attachments INSERT policy (6.8), leaving an orphan file behind.
  const { data: taskAccess, error: taskAccessError } = await supabase
    .from('project_tasks')
    .select('id')
    .eq('id', taskId)
    .single()

  if (taskAccessError || !taskAccess) {
    return { error: 'Task not found or unauthorized' }
  }

  // storage_path is always built server-side from auth.uid() — never trust
  // a client-supplied path. This is what the storage INSERT policy checks
  // against (first path segment must equal auth.uid()).
  const storagePath = `${user.id}/${taskId}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('task-attachments')
    .upload(storagePath, fileBytes, { upsert: false })

  if (uploadError) return { error: 'Failed to upload file', details: uploadError.message }

  const { error: insertError } = await supabase.from('task_attachments').insert({
    task_id: taskId,
    storage_path: storagePath,
    file_name: fileName,
    uploaded_by: user.id,
  })

  // v2.2 — compensating cleanup: if the DB insert fails for any reason after
  // the file already landed in Storage, remove it immediately. This is
  // infrastructure hygiene, not a replacement for the task_attachments RLS —
  // RLS remains the authoritative security layer; this just prevents orphan
  // files and unnecessary storage cost from a transient failure between
  // Storage and the database.
  if (insertError) {
    await supabase.storage.from('task-attachments').remove([storagePath])
    return { error: 'Failed to record attachment', details: insertError.message }
  }

  revalidatePath(`/portal/[projectId]/task/${taskId}`)
  return { success: true }
}
```

---

## 9. WORKFLOW-URILE CRITICE

Și acest cod e aplicație (`Tools needed: file edits`), nu schemă. Folosește la runtime același client Supabase standard din secțiunea 7 — fără MCP.

### 9.1 Clone & Detach — alocarea unui program unui client

**`workflows/clone-template-to-project.ts`**

```typescript
'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'

const CloneTemplateSchema = z.object({
  programId: z.string().uuid(),
  clientId: z.string().uuid(),
  projectTitle: z.string().min(3).max(200),
})

export async function cloneTemplateToProject(input: unknown) {
  await requireSuperAdmin()
  const supabase = await createClient()

  // 1. Validate
  const parsed = CloneTemplateSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid input', details: parsed.error.flatten() }
  }

  const { programId, clientId, projectTitle } = parsed.data

  // 2. Fetch master template: program (for program_key + version) → modules
  //    (for module_key) → steps (for step_key), ordered
  const { data: program, error: programError } = await supabase
    .from('master_programs')
    .select('program_key, version')
    .eq('id', programId)
    .single()

  if (programError || !program) {
    return { error: 'Program not found' }
  }

  const { data: modules, error: fetchError } = await supabase
    .from('master_modules')
    .select(`
      id,
      module_key,
      title,
      sort_order,
      master_steps (
        id,
        step_key,
        title,
        content_instructions,
        estimated_minutes,
        track_type,
        sort_order
      )
    `)
    .eq('program_id', programId)
    .order('sort_order', { ascending: true })

  if (fetchError || !modules || modules.length === 0) {
    return { error: 'Failed to fetch template or program has no modules' }
  }

  // 3. Create the client project record
  const { data: project, error: projectError } = await supabase
    .from('client_projects')
    .insert({ client_id: clientId, title: projectTitle })
    .select('id')
    .single()

  if (projectError || !project) {
    return { error: 'Failed to create client project' }
  }

  // 4. Build flat array of tasks (one per step, across all modules).
  //    This is the "detach" moment — tasks are now independent copies.
  //    Each module gets ONE module_instance_key, generated here, shared by
  //    every step cloned from that module in this clone operation — this is
  //    the stable grouping key used by the sequential lock (8.2) and the
  //    progress RPC (6.9), instead of the fragile module_title string match
  //    used in v2.0. Every cloned task also starts with sync_mode = 'inherit'
  //    (6.6) — it stays eligible for Master Template sync until a consultant
  //    customizes it through updateTaskContent (8.2).
  const tasksToInsert = modules.flatMap((module) => {
    const steps = module.master_steps ?? []
    const moduleInstanceKey = crypto.randomUUID()

    return steps.map((step) => ({
      project_id:               project.id,
      module_instance_key:      moduleInstanceKey,
      source_program_key:       program.program_key,
      source_module_key:        module.module_key,
      source_step_key:          step.step_key,
      source_template_version:  program.version,
      track_type:                step.track_type,
      module_title:              module.title,          // display-only snapshot
      title:                      step.title,
      content_instructions:       step.content_instructions,
      estimated_minutes:          step.estimated_minutes,
      status:                     'todo' as const,
      sync_mode:                  'inherit' as const, // v2.2 — eligible for Master sync until customized
      sort_order:                 step.sort_order,
    }))
  })

  if (tasksToInsert.length === 0) {
    // Rollback project creation
    await supabase.from('client_projects').delete().eq('id', project.id)
    return { error: 'Program has no steps — nothing to clone' }
  }

  // 5. Bulk insert all tasks in a single DB round-trip
  const { error: insertError } = await supabase
    .from('project_tasks')
    .insert(tasksToInsert)

  if (insertError) {
    // Rollback: clean up the project record
    await supabase.from('client_projects').delete().eq('id', project.id)
    return { error: 'Failed to clone tasks', details: insertError.message }
  }

  revalidatePath('/agency/clients')
  return { success: true, projectId: project.id }
}
```

**Diagrama fluxului:**

```
[Control Room] → cloneTemplateToProject()
                         │
          ┌──────────────┴──────────────┐
          ▼                             ▼
  Citește master_modules         Creează client_projects
  + master_steps (ordered,       (un singur rând nou)
  cu module_key / step_key)            │
          │                             │
          └──────────────┬──────────────┘
                         ▼
              INSERT în project_tasks
        (toate task-urile dintr-odată, status = 'todo',
         sync_mode = 'inherit', fiecare modul primește un
         module_instance_key nou, generat o singură dată —
         task-urile rămân complet decuplate de master, dar
         trasabile prin source_program_key / source_module_key
         / source_step_key)
```

### 9.2 Sincronizare selectivă — propagare modificări master

**`workflows/sync-template-updates.ts`**

```typescript
'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireSuperAdmin } from '@/lib/auth-helpers'
import { revalidatePath } from 'next/cache'

// v2.1: match by stepKey (a stable UUID), not by masterStepTitle (a string).
// Titles can repeat across modules or get renamed; step_key cannot.
const SyncStepSchema = z.object({
  stepKey: z.string().uuid(),
  newContentInstructions: z.string().min(10),
  newEstimatedMinutes: z.number().int().min(1),
})

// Propagates master step changes to cloned tasks with matching source_step_key.
// NEVER touches tasks with status = 'done' — they are frozen historical
// records. NEVER touches tasks with sync_mode = 'custom' (v2.2) — those were
// manually personalized for a client via updateTaskContent (8.2) and must
// survive Master Template sync untouched, regardless of status.
export async function syncStepToActiveTasks(input: unknown) {
  await requireSuperAdmin()
  const supabase = await createClient()

  const parsed = SyncStepSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }

  const { stepKey, newContentInstructions, newEstimatedMinutes } = parsed.data

  const { count, error } = await supabase
    .from('project_tasks')
    .update({
      content_instructions: newContentInstructions,
      estimated_minutes:    newEstimatedMinutes,
      updated_at:           new Date().toISOString(),
    })
    .eq('source_step_key', stepKey)
    .eq('status', 'todo')       // ← Only update tasks not yet completed
    .eq('sync_mode', 'inherit') // ← v2.2 — never overwrite customized tasks
    .select('id', { count: 'exact', head: true })

  if (error) return { error: 'Sync failed', details: error.message }

  revalidatePath('/agency')
  return { success: true, updatedCount: count ?? 0 }
}
```

> **Notă de securitate:** la fel ca `updateTaskContent` (8.2), acest workflow scrie `content_instructions` și `estimated_minutes` — coloane pe care rolul `authenticated` nu le mai poate scrie direct după aplicarea GRANT-ului din 6.6.1. Dacă urmezi exact task-ul din 6.10, agentul va folosi automat `createServiceClient()` aici, nu `createClient()` din 7.1 — verifică explicit acest detaliu când agentul implementează workflow-ul.

---

## 10. REGULILE IMUABILE PENTRU AGENȚI AI

Salvează aceasta la `docs/ai-rules.md`. Orice agent AI care deschide această bază de cod citește acest fișier primul — indiferent dacă rulează pe Claude sau pe Gemini. Regulile sunt identice pentru ambele.

### Regula 1: Zod înaintea oricărei mutații

```typescript
// ✅ CORRECT
export async function myAction(input: unknown) {
  const parsed = MySchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }
  // ... rest of action
}

// ❌ FORBIDDEN — no raw parameters without validation
export async function myAction(title: string, userId: string) {
  await supabase.from('...').insert({ title, user_id: userId })
}
```

### Regula 2: Zero import-uri cross-feature

```typescript
// ❌ FORBIDDEN — collaboration importing from project-tracking
import { getProjectTasks } from '@/features/project-tracking/queries'

// ✅ CORRECT — if you need cross-module data, create a workflow
// or re-fetch with a direct query local to your module
```

### Regula 3: Paginile nu conțin SQL sau logică de business

```typescript
// ❌ FORBIDDEN in /app/**
const { data } = await supabase.from('project_tasks').select('*')

// ✅ CORRECT — import from feature module
import { getProjectTasks } from '@/features/project-tracking/queries'
const tasks = await getProjectTasks(projectId)
```

### Regula 4: Clienții Supabase sunt strict separați

```
lib/supabase/client.ts      → ONLY inside 'use client' components
lib/supabase/server.ts      → ONLY inside Server Components and actions.ts
lib/supabase/service.ts     → ONLY server-side, ONLY after requireSuperAdmin(),
                               ONLY for the specific mutations documented in 6.6.1
lib/supabase/middleware.ts  → ONLY inside middleware.ts
```

Folosirea clientului greșit cauzează bug-uri de sesiune care reapar aleator și sunt extrem de greu de diagnosticat — sau, în cazul `service.ts`, o gaură de securitate dacă e folosit fără verificare de rol în prealabil.

### Regula 5: Componente duble pentru agenție vs portal (WET)

```
// ✅ Two separate components — duplication is intentional
features/project-tracking/components/task-card-agency.tsx
features/project-tracking/components/task-card-portal.tsx

// ❌ Universal component with conditional props — forbidden
features/project-tracking/components/task-card.tsx  // with isAgencyView?: boolean
```

### Regula 6: Schema bazei de date se modifică exclusiv prin task-uri MCP, documentate

Orice modificare de schemă urmează acest flux, fără excepție:
1. Se descrie ca task pentru agent, format secțiunea 1.5, cu `Tools needed: Supabase MCP`.
2. Agentul aplică modificarea prin MCP.
3. Agentul generează automat fișierul de migrare SQL echivalent în `supabase/migrations/`.
4. Agentul adaugă o intrare în `docs/changelog.md`, cu `Type: schema`, conform formatului din `guides/documentation-guide.md` §5.

```
// ❌ FORBIDDEN — schema modificată direct din Supabase Dashboard, fără task,
// fără fișier de migrare, fără entry în changelog. Schimbarea există, dar
// nimeni nu poate reconstrui de ce sau când a fost făcută.

// ✅ CORRECT — fiecare schimbare de schemă trece prin pașii 1-4 de mai sus.
```

Sărind acest flux, `docs/changelog.md` rămâne neactualizat și se pierde exact istoricul de decizii pe care Handover-ul (viziunea de business) promite clientului la final. `docs/changelog.md` este singurul jurnal de schimbări din proiect — nu există un fișier separat de tip `MIGRATION_CHECKLIST.md`; modificările de schemă sunt doar o categorie de intrări în același changelog (`Type: schema`), alături de `feature`, `fix`, `refactor` și `config`.

### Regula 7: Regulile sunt agnostice de model

Acest fișier (`docs/ai-rules.md`) și formatul de task din secțiunea 1.5 trebuie respectate identic indiferent dacă task-ul e executat de Claude sau de Gemini. Nu există o variantă "relaxată" de reguli pentru un model anume.

### Regula 8: Coloanele sensibile pe `project_tasks` se scriu doar prin service client

```typescript
// ❌ FORBIDDEN — regular session client trying to write a protected column.
// This will fail at the Postgres level (column-level GRANT, section 6.6.1),
// but a task should never be written this way to begin with.
const supabase = await createClient()
await supabase.from('project_tasks').update({ content_instructions: '...' })

// ✅ CORRECT — service client, only after requireSuperAdmin()
await requireSuperAdmin()
const supabase = createServiceClient()
await supabase.from('project_tasks').update({ content_instructions: '...' })
```

`status` și `updated_at` rămân scriibile prin clientul de sesiune normal (`completeTask`, 8.2) — sunt singurele coloane pe care `authenticated` le poate scrie. Orice altă coloană pe `project_tasks` trece prin `lib/supabase/service.ts`.

### Regula 9: Identificatori stabili pentru sync și blocare — niciodată text liber

```typescript
// ❌ FORBIDDEN — matching or grouping by a human-editable title
.eq('title', someTitle)
.eq('module_title', someModuleTitle)

// ✅ CORRECT — matching or grouping by a stable UUID key
.eq('source_step_key', stepKey)
.eq('module_instance_key', moduleInstanceKey)
```

`module_title` și `title` pe `project_tasks` rămân câmpuri valide de **afișare** — nu le elimina. Doar nu le folosi niciodată ca cheie de grupare, blocare sau sincronizare. Acel rol e exclusiv al `module_instance_key`, `source_module_key` și `source_step_key`.

### Template pentru task-uri adresate agentului AI

Folosește exact formatul din secțiunea 1.5:

```
Read docs/ai-rules.md first.

Context: FoundersOS — two-sided app (Agency Control Room + Client Portal)
Module/Area: [features/x, workflows/x, or "database schema"]
Tools needed: [Supabase MCP / file edits / terminal / none]
Task: [specific, scoped description]
Files to modify: [explicit list]
Do NOT modify: [explicit list of files to leave untouched]
Expected output: [what a correct result looks like]
```

---

## 11. DEPLOYMENT

### 11.1 Repository GitHub

```bash
git init
git add .
git commit -m "feat: initial FoundersOS setup"
git remote add origin https://github.com/your-username/founders-os.git
git push -u origin main
```

### 11.2 Setup Vercel

1. Mergi la [vercel.com](https://vercel.com) → Add New Project → Import GitHub repo
2. Vercel detectează automat Next.js — nu modifica nimic în configurare
3. În **Project Settings → Environment Variables**, adaugă:

```
NEXT_PUBLIC_SUPABASE_URL          → https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY     → eyJ...
SUPABASE_SERVICE_ROLE_KEY         → eyJ...  (mark as "Sensitive")
```

4. Setează variabilele pentru **Production**, **Preview**, și **Development**
5. Apasă **Deploy** — primul deployment durează 2-3 minute

### 11.3 Configurare Supabase pentru producție

În **Supabase Dashboard → Authentication → URL Configuration**:

```
Site URL:       https://your-app.vercel.app
Redirect URLs:  https://your-app.vercel.app/auth/callback
                https://*.vercel.app/auth/callback      ← pentru preview deployments
                http://localhost:3000/auth/callback      ← pentru development local
```

### 11.4 Creare primul super_admin

Toți utilizatorii noi primesc automat rolul `client` prin trigger-ul `handle_new_user`. Primul super_admin se creează manual o singură dată — și, ca orice altă operație pe date, e mai simplu ca task pentru agent decât manual din Dashboard:

**Pasul 1:** În Supabase Dashboard → **Authentication → Users → Add User** — creează contul cu emailul tău (asta rămâne un pas manual, e despre crearea contului de auth, nu despre schemă).

**Pasul 2:** Dă agentului următorul task:

```
Tools needed: Supabase MCP
Task: Promote the profile with email 'your-email@example.com' to role 'super_admin'.
Verification: Select id, email, role for that row and confirm role = 'super_admin'.
```

**Pasul 3:** Repetă pentru al doilea fondator după ce și-a creat contul.

### 11.5 Verificare finală post-deployment

Rulează această checklist după fiecare deployment major:

```
□ /login → pagina de login se încarcă
□ Login cu super_admin → redirect la /agency/dashboard
□ Login cu client → redirect la /portal
□ Client nu poate accesa /agency/* → redirect la /portal
□ super_admin poate accesa /portal/[projectId] al unui client
□ Un client nu vede proiectele altui client (testează cu două conturi)
□ Completarea unui task actualizează progresul corect
□ Blocarea liniară funcționează (nu poți completa task 2 fără task 1),
  inclusiv atunci când sort_order are goluri (10, 20, 30)
□ Reset Task to Todo funcționează pentru super_admin (resetTaskToTodo)
□ Un client NU poate modifica content_instructions sau estimated_minutes
  printr-un request direct către PostgREST cu propriul JWT (testează manual
  cu un client uuid valid — request-ul trebuie respins de Postgres)
□ Un client NU poate atașa un fișier pe un task care nu îi aparține,
  chiar dacă ghicește un task_id valid
□ Sincronizarea (syncStepToActiveTasks) actualizează doar task-urile cu
  source_step_key corespunzător, niciodată după potrivire de titlu
□ Un task personalizat prin updateTaskContent (sync_mode = 'custom') NU e
  suprascris de syncStepToActiveTasks, chiar dacă status rămâne 'todo'
□ Un fișier atașat e accesibil doar prin signed URL, nu printr-un URL public
□ Un upload de atașament cu taskId invalid sau neautorizat NU lasă niciun
  fișier în bucket-ul task-attachments (pre-flight check, 8.3)
```

---

## ANEXĂ A: `docs/changelog.md` — jurnalul de schimbări (v2.2)

*(Notă v2.2: fișierul `docs/MIGRATION_CHECKLIST.md`, folosit în versiuni anterioare, este eliminat. Nu mai există un jurnal separat pentru schimbări de schemă — `docs/changelog.md` e singura sursă de adevăr pentru istoricul de schimbări din proiect, exact cum e definit în `guides/documentation-guide.md` §5. Dacă un proiect mai are un `docs/MIGRATION_CHECKLIST.md` rămas dintr-o versiune anterioară, conținutul lui trebuie migrat ca intrări `Type: schema` în `docs/changelog.md`, apoi fișierul vechi poate fi șters.)*

Formatul exact — inclusiv tipurile de intrare (`feature`, `fix`, `refactor`, `schema`, `config`) — e definit în `guides/documentation-guide.md` §5 și nu se duplică aici. Agentul adaugă o intrare în `docs/changelog.md` **automat**, ca ultim pas al fiecărui task de schemă (Regula 6, secțiunea 10) și, în general, la finalul oricărei sesiuni cu schimbări semnificative — nu mai e ceva ce completezi tu manual.

Exemplu de intrare pentru schema inițială (`Type: schema`):

```markdown
## [2024-01-01] — Initial schema

**Type:** schema
**Scope:** database

**What changed:**
Created the full initial schema (profiles, master_programs, master_modules,
master_steps, client_projects, project_tasks, task_comments, task_attachments),
with RLS policies and the column-level GRANT restrictions from 6.6.1.

**Files affected:**
- supabase/migrations/001_initial_schema.sql

**Database changes:** YES
Applied via Supabase MCP (Antigravity). SQL exported to
supabase/migrations/001_initial_schema.sql.

**Why:** Initial project setup.
```

## ANEXĂ B: Checklist de pornire pentru sesiuni noi cu agentul AI

La începutul fiecărei sesiuni noi de lucru în Antigravity, trimite agentului acest mesaj — indiferent dacă alegi Claude sau Gemini pentru sesiunea respectivă:

```
You are working on FoundersOS, in Google Antigravity. Before starting any task:

1. Read docs/ai-rules.md completely.
2. Understand the module boundary you're working in: /features/[name],
   /workflows/[name], or "database schema".
3. Never import across features — use /workflows for cross-module operations.
4. All mutations go through Zod validation before touching the database.
5. Any database schema change goes through Supabase MCP, then gets exported
   to supabase/migrations/ and logged in docs/changelog.md (Type: schema),
   following the format in guides/documentation-guide.md.
6. Never call MCP tools from application code — MCP is for development only.
7. All code, variables, comments, and error messages must be in English.
8. project_tasks has column-level write restrictions: the regular session
   client may only ever write status and updated_at. Any other column
   (content_instructions, estimated_minutes, title, module_title, sync_mode,
   the *_key fields) requires lib/supabase/service.ts, used only after
   requireSuperAdmin().
9. Never match or group rows by title/module_title for sync or sequential-lock
   logic — use the stable key fields (module_instance_key, source_step_key,
   source_module_key, source_program_key) instead.
10. Never let Master Template sync (syncStepToActiveTasks) overwrite a task
    with sync_mode = 'custom' — only sync_mode = 'inherit' tasks are eligible,
    regardless of status.

Current task: [describe your task here]
Tools needed: [Supabase MCP / file edits / terminal / none]
```

---

*FoundersOS v2.2 — Documentație Tehnică, adaptată pentru Google Antigravity + MCP Supabase, generată cu Claude Sonnet 4.6. Față de v2.1: adăugat `sync_mode` pe `project_tasks` pentru a proteja task-urile personalizate de suprascrierea din Master Template sync (6.6, 8.2, 9.1, 9.2); adăugat pre-flight authorization check + cleanup compensator la `uploadAttachment` pentru a preveni fișiere orfane în Storage (6.8, 8.3); înlocuit `docs/MIGRATION_CHECKLIST.md` cu `docs/changelog.md` ca jurnal unic de schimbări, conform `guides/documentation-guide.md`.*
