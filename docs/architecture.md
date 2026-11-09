# Personal Workout Tracker — Architecture and MVP

Status: accepted initial direction; implementation pending  
Last updated: 2026-11-08

This document owns product scope, technical decisions and the overall delivery roadmap. Phase PRDs refine it in the local, Git-ignored `.planning/prds/` directory. A phase PRD requires approval before implementation. New decisions that affect later phases must be recorded here.

## 1. Purpose and users

Build a self-hosted gym and calisthenics tracker for everyday personal use and a software engineering portfolio. Provide familiar routine building and fast workout logging, unrestricted routine creation, identifiable variations and explicitly defined analytics.

The initial user is one authenticated person using Android Chrome, including its installed PWA mode. Multiple devices may use that account. This is a personal application, not a commercial SaaS or social network.

Priorities, in order:

1. Reliable, low-friction smartphone workout logging.
2. Durable local saves and safe synchronization.
3. Useful routines, history and honest analytics.
4. A maintainable, tested and documented NestJS backend.
5. Portable deployment and low resource/hosting costs.

## 2. Product scope

### MVP requirements

| Area | Required behavior |
| --- | --- |
| Exercise catalog | Seed common barbell, dumbbell, machine, cable and bodyweight exercises, plus calisthenics push, pull, squat, hinge, core, mobility and static holds. Search and filter by useful attributes. Support custom exercises. |
| Variations | Distinguish family identity, equipment and technique variations, and progression relationships. Each selectable variant has independent performance history. Progressions are data, not frontend rules or universal difficulty guarantees. |
| Routines | Create, edit, duplicate, archive and delete; add/remove/reorder exercises; configure planned sets, rep targets, load, duration, rest and notes; optionally attach a cover image. |
| Unscheduled training | Start without a permanent template; add exercises during training; optionally save a reusable routine afterward. |
| Workout execution | Start, pause/resume, finish or abandon; record timestamps, active and elapsed duration; change exercise order; compare planned and actual sets; edit sets; support warm-up, working and drop sets, failure, optional RPE/RIR and notes. |
| Rest timer | Configurable intervals and accurate recovery after refresh/suspension. Workout completion never depends on a background timer or notification. |
| Units and resistance | Kilograms/pounds with per-exercise display preferences; explicit bodyweight, assisted and weighted bodyweight modes. |
| Offline | Persist immediately, reopen and recover offline after initialization, display pending/error states, and retain unsynchronized records. |
| Synchronization | Stable client identifiers, durable queue, idempotent writes, retries, conflicts, deletion propagation, manual sync and network preferences. |
| History | Completed workout summaries, calendar/history, editing and deleting completed workouts without modifying templates. |
| Analytics | Totals, weekly/monthly frequency, duration, frequent exercises, volume load, muscle exposure, routine breakdowns, progression and meaningful records; date/exercise/routine filters. |
| Security and ownership | Provisioned personal login, server-side secrets and owner checks for every private record/reference/asset. HTTPS outside localhost. |
| Data ownership | Emergency local export, versioned application export/import, independent backup/restore, and confirmed local reset. |
| Release | Personal deployment, automated checks, configuration and operating documentation, accessible responsive UI and bounded resource use. |

Historical workouts are independent snapshots. Editing or deleting a routine or changing an exercise definition must not rewrite past performance or its interpretation.

### Exclusions and future extensions

Exclude public signup/profiles, social feeds, friends/comments/likes, routine marketplaces, payments/subscriptions, meal/calorie tracking, AI-generated plans, paid AI APIs and OpenAI usage, MCP integration, real-time collaboration, native Android/Wear OS clients and Health Connect from the initial MVP.

Future candidates:

- Authenticated read-only MCP tools for history, training summaries, exercise progress, muscle exposure and routines, reusing existing Nest services. Writes require a separate decision.
- Native Android and Wear OS clients reusing REST contracts; each needs its own local persistence and synchronization implementation.
- Hevy export migration with exercise mapping, unit conversion and duplicate detection. Optional in Phase 5, not a release blocker.

Avoid microservices, Kubernetes, brokers, premature scaling and speculative abstractions.

## 3. ADR-0001 — Local-first modular monolith

Status: accepted  
Decision date: 2026-11-08

### Context

Gym connectivity is unreliable. Logging must not depend on a live backend, and app/browser interruptions must not lose acknowledged local changes. One user's workload does not justify distributed infrastructure. Future clients need stable server contracts rather than frontend-specific backend behavior.

### Decision and technology choices

| Concern | Choice |
| --- | --- |
| Repository | pnpm workspace, `apps/web` and `apps/api`; no monorepo orchestration framework initially. |
| Runtime | Node.js 24 LTS (pinned to 24.22.2) and pnpm 12.18.0; PostgreSQL 17. |
| Web | Vue 3, TypeScript, Vite, Vue Router and Pinia. Pinia is UI/session state, not the sole durable record store. |
| Local storage | Dexie over IndexedDB, with transactional writes and versioned local migrations. |
| PWA | `vite-plugin-pwa` with generated Workbox asset caching initially. Application foreground code owns data sync. |
| UI | Semantic HTML, reusable Vue controls and plain CSS initially. Add a component library only for a demonstrated need. |
| API | NestJS modular monolith using its default Express adapter, REST, Swagger/OpenAPI, DTO validation and structured errors. |
| Database | PostgreSQL, Drizzle and `pg`; checked-in SQL migrations. No schema push against production. |
| Authentication | One provisioned account, Argon2id password hashing and opaque server sessions. Secure HttpOnly cookies, CSRF protection and login rate limiting. |
| Images | Private S3-compatible object storage in deployment; filesystem volume in local development. Provider selection remains pending. |
| Tests | Vitest for frontend/pure logic; Nest test tooling and Supertest for API; Playwright for critical browser flows. Add runners when their behavior is introduced. |
| Operations | Docker Compose locally, production Docker build and GitHub Actions. Environment-based configuration, validated on startup. |

Generate frontend transport types from OpenAPI when real endpoints exist. Do not create a speculative shared DTO/domain package. Share framework-independent rules only when both clients and server actually need them.

```text
Vue screens / Pinia
       ↓
Local application operations
       ↓
IndexedDB records + outbox (one transaction)
       ↓
Foreground synchronization
       ↓
Nest controllers → services/domain rules → Drizzle → PostgreSQL
                                    ↘ private file storage
```

### Consequences

- Logging remains usable during network outages and backend cold starts.
- IndexedDB holds the device's current working state; PostgreSQL holds synchronized durable records.
- Both databases require migrations and tested upgrade/recovery behavior.
- Foreground synchronization is sufficient for correctness; background sync is optional.
- Whole-aggregate conflicts are simpler but may require explicit user resolution instead of field-level merging.

## 4. Boundaries and source organization

| Backend module | Owns |
| --- | --- |
| Auth | Provisioning, sessions, login/logout and current user. |
| Exercises | Seed/custom catalog, families, variants, muscles, equipment and progression links. |
| Routines | Templates, ordered entries, planned sets and archive state. |
| Workouts | Session lifecycle, pause intervals, snapshots and performed sets. |
| Sync | Mutation receipts, revision checks, reconciliation and tombstone transport. |
| Media | Asset validation, ownership, upload/replacement and cleanup. |
| Analytics | Read-only calculations with the definitions below. |
| Data portability | Versioned export and validated restore, introduced when needed. |

Controllers own HTTP concerns. Services coordinate rules and transactions. Persistence code stays within its owning module. Domain logic must remain testable without HTTP. Do not create generic repositories, event buses or separate layers that only forward calls.

Sync delegates business validation to the owning module; it must not become a second implementation of workout/routine rules. All private queries and referenced identifiers must be scoped to the authenticated owner.

## 5. Domain model

### Catalog

| Entity | Responsibility |
| --- | --- |
| ExerciseFamily | Related movement identities, such as push-ups or pull-ups. |
| ExerciseVariant | Selectable and independently tracked identity, such as incline push-up or weighted pull-up. |
| MuscleGroup / Equipment | Controlled reference data. |
| Variant associations | Primary/secondary muscle groups and equipment requirements. |
| ProgressionLink | Directed suggested relationship between variants with an optional explanatory note. |

Variants contain a stable ID, name, family, movement category, instructions/notes, optional local reference image, built-in versus user-owned classification, tracking mode, resistance mode, equipment/technique descriptors, load convention and preferred display unit.

Initial tracking modes: reps, load/reps, duration and load/duration. Initial resistance modes: external, bodyweight, assisted bodyweight and weighted bodyweight. Do not encode assistance as negative external load.

Example progression data may connect wall → incline → standard → decline → archer push-ups, assisted → standard → weighted pull-ups, assisted pistol variants, pike variants and hollow-body variants. These links describe possible paths, not universal rankings. Reject progression self-links and directed cycles. A user can define a variant without defining a progression.

Seed IDs must be stable and seeding idempotent. Built-ins are read-only initially; customization creates user-owned records. Referenced variants are archived rather than destructively removed. Seed descriptions must be original or appropriately licensed; prefer local placeholders over image downloads.

### Templates, sessions and supporting records

| Entity | Responsibility |
| --- | --- |
| Routine | Name, notes, archive state, optional cover asset. |
| RoutineExercise | Ordered variant reference, notes and display preference. |
| RoutineSetTarget | Ordered planned set, rep target/range, load, duration and rest. |
| Workout | Lifecycle, UTC timestamps, time zone, pauses, notes, optional bodyweight and source routine. |
| WorkoutExercise | Ordered variant reference, relevant exercise/load/muscle metadata snapshot and notes. |
| WorkoutSet | Planned target snapshot, actual measurements, completion state, set kind, failure and optional effort/notes. |
| MediaAsset | Owner, storage key, validated metadata and upload/deletion state. |
| UserPreferences | Units, reporting time zone and sync preferences. |

Supporting records include User, server Session, local OutboxMutation and server MutationReceipt. Synced aggregates carry owner, revision and deletion state. Exact tables, columns and DTOs belong to the relevant phase PRD.

### Invariants

- Starting from a routine copies targets and relevant metadata; later template edits do not affect that workout.
- An unscheduled workout creates no template unless explicitly saved as one.
- Preserve an optional source-routine ID and name snapshot for history/filtering. Routine deletion does not cascade to workouts.
- Planned and actual measurements are separate. Unknown, zero and not applicable are distinct.
- Set kind is warm-up, working or drop. Failure is an independent flag, not an exclusive set kind.
- Optional RPE/RIR require an explicit scale and consistency rule before entry is implemented.
- Completed history can be corrected or deleted through revisioned operations.
- Allow one active workout per device initially; prevent competing edits to the same workout across tabs. Different devices can create distinct workouts.
- UTC timestamps and pause intervals determine elapsed versus active duration. Store the session's time zone; reports use the selected reporting time zone and Monday-start weeks.

### Units and load conventions

Use kilograms in fixed-precision decimal representation, integer milliseconds for durations and integer repetitions. Convert using `1 lb = 0.45359237 kg`; define storage precision/input limits in Phase 1 and round at those boundaries or for display, not on every unit toggle.

Every applicable variant has an explicit load convention: total external load, per-implement load with implement count, or another named convention required by its equipment. Record unilateral repetitions consistently and explain whether entry is per side. Snapshot conventions into sessions so later changes cannot reinterpret history. Define exact entry and volume treatment before enabling those variants.

Bodyweight is optional session metadata. Never infer an exercise's effective bodyweight resistance. Assisted movements record assistance separately from added load.

## 6. Local persistence and synchronization

### Local save and recovery contract

Each edit commits its records and outbox entry in one IndexedDB transaction. Display saved status only after commit. Surface quota/transaction errors immediately; do not depend on unload handlers. Use client-generated UUIDs for stable record and mutation IDs.

First login and initialization require network access. Thereafter, the installed/cached app must reopen offline, restore active workouts, and retain pending edits. Request persistent browser storage when saving valuable user data; show persistence status and approximate storage usage.

Persist timer deadlines and pause state, then derive the display from timestamps after suspension. Do not promise reliable sound, vibration or notification while Chrome is suspended/closed. Delay service-worker activation during active workouts; never automatically clear the database on an upgrade failure. Test migrations with queued edits and recoverable active sessions.

Browser storage clearing, device loss and user-denied persistence remain outside the app's durability guarantee. Provide emergency local export in Phase 2 and independent backup/restore before personal release.

### Write protocol

Use whole-aggregate updates initially: routine plus entries/targets; workout plus entries/sets. Other mutable resources use their own revisioned operations.

Every mutation carries mutation ID, entity ID, operation, expected server revision, payload and supported schema version. In a server transaction:

1. Authenticate and scope the mutation/receipt to its owner.
2. Check duplicate mutation ID and payload identity.
3. Validate business rules and expected revision.
4. Apply the aggregate update and persist its result receipt atomically.

A replay returns the recorded result. Reusing an ID with a different payload is rejected. Acknowledging an older queued edit must not clear newer local changes. Define receipt retention and client compatibility before implementing sync; an expired receipt must never allow a retried create to duplicate an existing stable ID.

### Reconciliation rules

- Start with a paginated revision manifest and fetch changed aggregates; add a change-log cursor only if measured history size requires it.
- Never overwrite dirty local state on pull. Detect revision conflicts, preserve local and server versions, and require explicit resolution. No timestamp-based last-write-wins for workouts.
- Propagate deletions using tombstones. A stale edit cannot resurrect a deleted entity. Define retention and stale-device rebootstrap behavior before any tombstone cleanup.
- Retry transient failures with exponential backoff and jitter. Keep validation failures actionable; pause on authentication failure without dropping pending records.
- Trigger eligible sync on app open, foreground return, reconnect hints and manual action. Browser online state is a hint; request results determine actual reachability.
- Expose pending count, syncing, last success, blocked authentication, conflicts and errors.
- Assets synchronize separately. Record completion cannot depend on image transfer.

### Network preferences

Provide automatic records, Wi-Fi-preferred and manual-only modes, plus a separate automatic-image preference. In Wi-Fi-preferred mode, unknown connection type defers automatic transfers. Do not interpret `effectiveType`/speed as Wi-Fi. Manual Sync now explicitly explains that mobile data may be used. Unsupported network detection or background synchronization must never block logging/completion.

## 7. Authentication and local privacy

Use account login plus Android's device protection, with no additional local PIN/biometric gate in the MVP. IndexedDB is not application-encrypted storage. An unlocked device/browser can expose cached data; an app-only PIN screen would not change that storage property.

- Initial login is online. No credentials or server secrets in browser storage/bundles.
- Keep opaque server session credentials in secure HttpOnly cookies. Define expiry/revocation and CSRF protection in the authentication PRD.
- Session expiry permits continued local work but blocks sync until reauthentication. It does not erase local data.
- Explicit logout locks local private views and keeps them locked after reopening. With pending changes, offer sync, local export or cancellation before any explicit discard. Do not rely on a hidden screen as encryption.
- Local reset is a separate destructive action with pending-record counts and explicit confirmation.
- Scope local stores to account identity and prevent another authenticated account from viewing or uploading the previous account's data.
- Validate all private ownership and references server-side. Do not cache authenticated API responses indiscriminately in the service worker.
- Use HTTPS outside localhost, structured safe errors, bounded request/upload sizes and logs without credentials or workout payloads by default.

Additional app lock/encryption, password reset UX and external identity providers require demonstrated need and separate scope decisions. A documented server-side account recovery procedure is required before personal release.

## 8. Images and file lifecycle

Accept JPEG, PNG and WebP initially; provide a useful error for unsupported formats, including HEIC. Set byte/dimension limits before upload implementation. Preview selections locally and validate on both client and server, including actual content rather than the filename alone. Strip metadata/re-encode where necessary to meet privacy and validation requirements. Compression/resizing is optional.

Store offline image blobs locally, with references in routines. Keep the existing cover until replacement upload and reference update succeed. Upload to a new asset/key; do not overwrite the old object in place. Owner checks apply to upload, attachment, retrieval and deletion. Private downloads use authenticated access or short-lived authorized URLs.

Treat partial uploads and unreferenced objects as recoverable cleanup work. Only remove replaced assets once references and retry safety permit it. Reclaim cached synchronized images before critical pending records; never silently evict unsynchronized assets. Default exercise placeholders stay local and do not require bulk remote downloads.

## 9. Analytics contract

All metrics use nondeleted records and explicit date filters. Historical exercise snapshots determine classification. Incomplete sets are excluded. Explain overlap and missing measurements rather than producing misleading totals.

| Metric | Initial definition |
| --- | --- |
| Workout count | Finished workouts containing at least one completed set. |
| Exercise sessions | Workout-exercise entries containing at least one completed set. |
| Frequency | Workout count and distinct training days, separately. |
| Completed sets | Completed sets, with warm-up/non-warm-up breakdowns. |
| Hard sets | Completed non-warm-up sets with recorded RIR ≤ 3. Missing RIR is unknown; no automatic inference from RPE or set kind initially. |
| Volume load | External kilograms × repetitions for completed non-warm-up sets, normalized using the snapshotted load convention. |
| Bodyweight/assisted work | Show reps, hold duration and added load/assistance separately; exclude these resistance modes from combined volume-load comparisons. |
| Static holds | Duration and muscle exposure, never rep-based volume. |
| Muscle exposure | Qualifying completed non-warm-up sets per primary and secondary muscle, reported separately. Counts overlap and are not additive workload shares. |
| Routine breakdown | Planned-set muscle exposure, labeled as planned rather than completed training. |
| Duration | Both elapsed and active; only active duration excludes pauses. |
| Most frequent exercise | Distinct qualifying workouts per variant, not raw set count. |
| Progress/records | Compatible variants, resistance modes and load conventions only; best load, reps or hold duration where meaningful. |

Weekly/monthly reports use the configured reporting time zone. Calendar assignment uses workout start time. Compare date periods and routine/exercise filters explicitly. Show when local dashboards include pending edits. Server and local calculations must agree for the same synchronized records.

Frequency, exposure and volume are different metrics and do not by themselves establish muscle growth. Defer estimated one-rep maxes, fractional muscle weighting and automatic progression recommendations.

## 10. Development and deployment

### Local development and Android access

Compose provides PostgreSQL with a persistent named volume. Add application containers as part of reproducible builds; do not require ngrok credentials for local development or CI.

For physical-phone testing, use an optional HTTPS ngrok tunnel to one browser-facing entry point. In Vite development, proxy `/api` to local NestJS. In a production-build rehearsal, NestJS serves the built web application and `/api` under one origin. Never expose PostgreSQL directly through the tunnel.

Use a stable tunnel hostname when available. IndexedDB, service workers, cookies and installed PWA identity are origin-scoped: changing hostname creates a separate local installation. Preserve/export pending data before changing origins. Test offline caching against the built PWA, not only the development server.

### Hosting decision: pending

Production provider selection is not a Phase 0 blocker. Keep a standard Node/Nest runtime, PostgreSQL and replaceable file storage so deployment stays portable. Select and validate a production topology before Phase 5 release.

Free compute with cold starts can be acceptable because logging is local-first. Do not treat free hosting as guaranteed availability or provider retention as a backup. No keep-alive traffic to evade sleep limits.

Feasibility references checked on 2026-11-08 (recheck at selection):

- [Render](https://render.com/docs/free): free web service sleeps after 15 idle minutes; filesystem is ephemeral. Free Postgres expires after 30 days and is not appropriate for durable personal data.
- [Neon](https://neon.com/pricing): free PostgreSQL currently includes 1 GB/project and 100 CU-hours/project, with scale-to-zero and quota limits.
- [R2](https://developers.cloudflare.com/r2/pricing/): Standard free allowance currently includes 10 GB-month storage, 1 million Class A and 10 million Class B requests/month.
- [MDN Network Information API](https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API): limited cross-browser support; network type cannot be assumed available.
- [Persistent browser storage](https://web.dev/articles/persistent-storage): permission and browser behavior do not replace backups or prevent user-cleared storage.

### Quality and operations

- Check in dependency lockfile, SQL migrations and nonsecret configuration examples.
- Validate required configuration on startup; keep secrets server-side and out of Git.
- Use consistent structured errors with machine-readable codes and field validation details; never leak stack traces in production.
- Run builds, type checks and meaningful automated tests in CI; add checks only when applicable.
- Test database constraints, ownership, unit conversion, lifecycle, idempotency, conflicts and recovery where introduced.
- Provide labeled keyboard-accessible controls, focus/error states, responsive layout and at least 44 × 44 CSS-pixel primary touch targets.
- Test the installed Android Chrome PWA on a physical device before personal release; desktop emulation alone is insufficient.
- Track bundle size, local storage and image/cache growth. Set measured budgets when the relevant feature exists; avoid unlimited cached assets and unneeded local infrastructure.
- Back up PostgreSQL plus media and document an independent restore. Exercise restore into a clean environment before trusting the release.

## 11. Delivery roadmap

The complete MVP spans Phases 0–5. Phase 2 is an early local-use milestone, not the finished release. Deliverables below are phase-level scope, to be split into small, preferably single-commit tasks in each approved PRD.

### Phase 0 — Foundation

Depends on: this accepted direction and an approved Phase 0 PRD.

1. Workspace, pinned tooling and minimal web/API shells.
2. Compose PostgreSQL, configuration validation, Drizzle connection and migration workflow.
3. Health endpoint and web/API smoke path.
4. Automated builds/type checks/tests and reproducible production-build rehearsal.
5. Optional ngrok Android HTTPS smoke check.

Acceptance: a fresh checkout runs using documented commands; a clean database migrates; web reaches API; missing configuration fails clearly; builds/checks pass; a production-built shell runs under one origin. Physical-phone tunnel validation is recorded when available.

No feature schema, auth, PWA engine, Dexie, image SDK, analytics or production provider is required yet. Their contracts are established in this document.

### Phase 1 — Exercises and routine builder

Depends on: Phase 0.

1. Account provisioning, sessions and ownership enforcement before private APIs are exposed.
2. Idempotent exercise seed, search/filters and custom variants/progressions.
3. IndexedDB migrations, PWA shell caching and transactional local outbox.
4. Routine CRUD, duplication, archive/delete, order, targets and notes.
5. Matching revision-aware APIs and visible local pending state.
6. Cover preview, offline persistence, private upload and safe replacement.
7. Shared exercise selection and unscheduled-workout preparation.

Acceptance: initialized app/routines reopen offline; seed reruns do not duplicate records; custom variants retain distinct identity; private references are owner-checked; archive/delete differ; cover failure preserves existing data. Until Phase 3, clearly identify local-only pending edits; no claim of automatic sync.

Tests: ownership/API validation, seed idempotency, progression validation, local transaction failure, routine builder/reload and asset replacement.

### Phase 2 — Workout execution

Depends on: Phase 1 catalog, routines, PWA and durable local storage.

1. Scheduled/unscheduled start and historical snapshots.
2. Set entry/editing, exercise changes and unit display.
3. Pause/resume, rest deadlines and multi-tab edit protection.
4. Refresh/closure recovery with useful error states.
5. Finish/abandon, summaries, basic history and corrections.
6. Explicit save-as-routine and emergency local export.

Acceptance: complete a workout offline and recover it after reopening; edits to templates never alter history; timer state recovers after suspension; save errors are visible; empty/abandoned behavior is defined; local export contains pending data.

Tests: lifecycle, snapshots, conversions/load conventions, competing-tab behavior and full offline recovery/export browser flow.

### Phase 3 — Data synchronization

Depends on: Phase 2 and existing revisions/outbox contracts.

1. Transactional mutation receipts and idempotent aggregate writes.
2. Foreground push/pull reconciliation and retry/authentication states.
3. Conflict resolution, tombstones and stale-client behavior.
4. Network preferences, manual sync and visible status.
5. Asset retries/cleanup independent of workout records.
6. Second-device restore and schema/version compatibility.

Acceptance: repeated/lost-response delivery creates one workout; stale updates preserve both versions; pulls preserve dirty records; deletes cannot resurrect; unknown network type follows policy; logout/account change never leaks or discards queued data.

Tests: replay/payload mismatch, failed acknowledgment, edit/edit and delete/edit conflicts, newer edit during acknowledgment, owner isolation, interrupted assets and fresh-device recovery.

### Phase 4 — Statistics and analytics

Depends on: Phase 3 data integrity and reliable history.

1. Calculation fixtures and local/server agreement.
2. Calendar, totals, frequency and duration.
3. Variant progress and comparable personal records.
4. Volume load, muscle exposure and routine breakdown.
5. Weekly/monthly comparisons and date/exercise/routine filters.
6. Offline dashboard with pending-data disclosure.

Acceptance: fixture totals match the analytics contract, time-zone boundaries are correct, unsupported comparisons are excluded/labeled, and local/server results agree for identical data.

Tests: warm-up/incomplete/assistance/hold fixtures, date boundaries, load conventions, filters and dashboard error/empty states.

### Phase 5 — Personal release

Depends on: Phases 0–4; production hosting selection and validation.

1. Versioned full export/import and nondestructive validation.
2. Independent database/media backups and clean-environment restore drill.
3. Confirmed local reset, pending-count disclosure and account recovery instructions.
4. Physical-device accessibility, performance and storage review.
5. Upgrade/recovery regression, production HTTPS deployment and migration rehearsal.
6. Onboarding, operating instructions and portfolio presentation.
7. Optional, separately scoped Hevy import.

Acceptance: a clean restore succeeds; invalid import leaves existing data intact; unsynced records are never silently discarded; critical Android flows pass; production deployment/migrations are reproducible; secrets and ownership checks are verified.

Tests: export/import round trip, invalid/version-incompatible import, reset safeguards, migration/backup restore and full installed-PWA workflow.

## 12. Planning workflow and open decisions

Prepare phase PRDs one at a time, beginning with Phase 0. Each defines purpose/outcome, stories, functional/nonfunctional requirements, model changes, API contracts, screens/components, dependencies, acceptance criteria, automated tests, exclusions and Definition of Done. Mark approval explicitly before implementation.

Do not create Ralph JSON until its format contract (schema/consumer/example) and output path are known. No format has been selected.

Phase 0 decisions: Node `24.22.2`, pnpm `12.18.0` and PostgreSQL `17` are pinned in `.nvmrc`, `package.json` and Compose. API development compiles and starts once rather than hot-reloading.

| Decision | Owner | Due |
| --- | --- | --- |
| ngrok stable hostname/account availability | Project owner | Physical-device setup |
| Entry limits, load precision, unilateral conventions, RPE/RIR consistency, seed breadth | Project owner, with phase proposal | Phase 1/2 PRD approval, before affected features |
| Exact conflict UX, receipt/tombstone retention and stale-device handling | Project owner, with phase proposal | Phase 3 PRD approval |
| Local cache retention, measured performance budgets | Project owner, with implementation measurements | Relevant feature introduction; release gate in Phase 5 |
| Production host, database/media providers, billing/region limits and backup destination | Project owner | Before Phase 5 deployment |

Documentation ownership: this file owns accepted scope/decisions; `AGENTS.md` owns agent workflow; `README.md` will own runnable onboarding once tooling exists; future operational how-to documents should link here rather than repeat decisions.
