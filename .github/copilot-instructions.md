# Bitebook — Permanent Copilot Instructions

Read this before making any change to this repository. Also read
`docs/COPILOT_HANDOVER.md` (full project context) and `docs/Bitebook_Build_Instructions.md`
(master product/UX/engineering spec) before starting substantial work.

## Project Purpose

Bitebook is a premium, dark-mode, image-first social food diary and discovery app
(React Native + Expo). Core loop: **Discover → Try → Log → Rate → Share → Follow →
Discover again**. Inspired by Letterboxd's social-diary concept, but Bitebook is an
original product — never copy Letterboxd branding, assets, UI, or code.

## Architecture Principles

- Expo Router (file-based routing) under `src/app/`. Keep route files thin — no
  business logic or direct complex Supabase queries inline in a route; put data access
  in `src/lib/db/*.ts` and UI in `src/components/`.
- Reuse existing components (`src/components/ui/`, `src/components/food/`) instead of
  creating parallel/duplicate ones for the same concept.
- One shared Supabase client only: `src/lib/supabase.ts`. Never instantiate a second
  client.
- One shared auth context: `src/hooks/useAuth.tsx`. Extend it if needed; do not build a
  second auth mechanism.
- Separate UI from data/business logic in every new feature.
- Include loading, empty, and error states for every screen/feature (reuse
  `Skeleton`/`EmptyState`/`ErrorState` from `src/components/ui/`).
- Make UI responsive across iPhone sizes; keep it accessible and performant.

## Important Technologies

Expo SDK ~57, React 19.2, React Native 0.86, TypeScript ~6.0 (strict mode),
Expo Router ~57, NativeWind 4 / Tailwind 3, @supabase/supabase-js ^2.112,
PostgreSQL 17 + PostGIS (via Supabase). Do not introduce a new major dependency
(state management library, navigation library, UI kit, etc.) without a clear need —
Bitebook intentionally has a small, deliberate dependency set.

## Database-First Rules

- **Treat `supabase/migrations/*.sql` as the single source of truth for the schema.**
  Never hand-edit the schema via the Supabase dashboard for anything permanent — always
  add a new numbered migration file (`00NN_description.sql`) in logical, dependency-safe
  order.
- **Do not invent new tables or columns.** If a feature needs data that doesn't exist in
  the schema, stop and flag it for a decision rather than silently adding speculative
  fields.
- **Do not restructure existing tables/relationships** without an explicit, documented
  decision — this schema has been through multiple audit and correction passes; treat
  changes to it as high-risk.
- Read `docs/database-architecture.md` before touching anything database-related — it
  documents what the migrations actually create, including non-obvious things like the
  composite FK on `diary_entries.review_id` and the PostGIS trigger-based lat/lng sync.
- Preserve the denormalised-counter design (`0018_counters_triggers.sql`) — counters are
  exclusively trigger-maintained; never add client-side counter increment/decrement
  logic.

## Supabase / RLS / Security Requirements

- **RLS must remain enabled on every table.** Never disable RLS "for convenience" or to
  unblock local testing — fix the policy instead.
- **Never weaken an existing RLS policy** without an explicit, documented decision
  (e.g. do not re-add a client write policy to `restaurants` — this was deliberately
  removed as a security fix).
- Reuse `can_view_review(owner_id, visibility)` for any new feature that needs to check
  whether a review is visible to the current user — do not reimplement visibility logic.
- Any `SECURITY DEFINER` function must have `set search_path = public` and must be
  scoped as narrowly as possible (ideally only reachable via a trigger, not directly
  callable by arbitrary clients).
- Storage buckets: `avatars`/`dish-photos`/`restaurant-photos` are public-read;
  `review-photos` is private and visibility-gated — never make it public, and never rely
  on path obscurity instead of a real Storage RLS policy.
- **Never use the service-role key in client code.** Only the anon/publishable key
  belongs in `src/lib/supabase.ts` / `EXPO_PUBLIC_*` env vars.
- **Never commit secrets.** No API keys, tokens, passwords, or `.env` values in code,
  commits, or documentation — use `<REDACTED>` placeholders and document only variable
  *names* and *purposes*.
- No paid restaurant API integration without an explicit product decision to do so
  (Phase 2 deliberately restricted restaurant sources to `manual`/`user_submitted`/
  `seed`).

## TypeScript Requirements

- Strict mode is enabled (`tsconfig.json`) — keep it that way.
- Do not use `any` unless truly unavoidable; if used, comment why.
- Type all Supabase table access via `Database['public']['Tables'][...]` from
  `src/types/database.ts` (see that file's header comment for its current
  hand-authored/regeneration status — check `docs/COPILOT_HANDOVER.md` §11 for the
  latest status before assuming it's up to date).
- Run `npx tsc --noEmit` after any significant change and fix all resulting errors
  before considering the change complete.

## Testing Requirements

- Run `npx tsc --noEmit`, `npx expo lint`, and `npx expo-doctor` after any significant
  change.
- Database/security changes must be reflected in
  `supabase/tests/database/security_and_integrity.test.sql` (pgTAP) where practical.
  Note: this suite requires Docker Desktop to execute (`npx supabase test db`); if
  Docker isn't available, still write/update the tests, but clearly state they are
  unexecuted rather than claiming they pass.
- Never claim "runtime verified" for a database change unless it has actually been run
  against a live database (local via Docker, or the linked remote project) — static
  review is not equivalent to runtime verification, and prior project history shows this
  distinction matters (see `docs/COPILOT_HANDOVER.md` §13).

## Coding Conventions (observed in this codebase)

- Functional React components, hooks-based (no class components).
- Data-access functions live in `src/lib/db/<table-or-domain>.ts`, exporting typed
  functions (e.g. `getProfile`, `setUsername`) that throw on Supabase error rather than
  silently swallowing it — let callers decide how to surface errors.
- NativeWind `className` styling using the design tokens defined in
  `tailwind.config.js` (colors, `borderRadius`, `spacing`) — do not hard-code colors/
  spacing values that already have a token.
- Dark-mode only — do not add a light theme or make dark mode conditional.
- Comments are used sparingly, mainly to explain *why* a non-obvious decision was made
  (e.g. deferred setState via microtask to satisfy a lint rule) — follow this style
  rather than commenting every line.

## Working Rules

- **Inspect existing code before modifying it.** Do not assume prior chat history or
  documentation is fully up to date — this project has previously had cases where a
  report described a state ("no live database exists") that had since changed. Verify
  directly against the repository and, for database questions, the actual Supabase
  project (`npx supabase migration list --linked`) before making claims or changes.
- **Do not duplicate existing functionality** — search `src/components/`, `src/lib/`,
  and `src/hooks/` before writing a new component/utility/hook that might already exist.
- **Do not build features beyond the current phase's explicit scope** without
  confirming with the project owner — this project has been developed in deliberately
  incremental phases with explicit stop conditions (e.g. Phase 2 correction pass
  explicitly excluded starting Phase 3, integrating a restaurant API, or building the
  real Log flow).
- **Update documentation when a major architectural decision changes** — update
  `docs/database-architecture.md` for schema/security decisions, and
  `docs/COPILOT_HANDOVER.md` for anything a future session would need to know that this
  file doesn't already cover (e.g. new completed phases, new known issues).
- When uncertain, mark it as **UNKNOWN / NEEDS VERIFICATION** rather than assuming or
  guessing — this is the established convention in this project's documentation.
