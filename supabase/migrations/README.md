# Migration state (updated 2026-06-10)

## Ordering

Files apply in filename order. `20250130_add_search_optimization.sql` was
renamed from `20250119_…` on 2026-06-10: it `ALTER TABLE products …` and so
must sort **after** `20250129_create_base_schema.sql` (audit finding A-2).
Rollback scripts live in `../rollbacks/`, never in this directory.

## Repo files vs. prod history — known divergence

Production (`brciesmgvfmeugpsnmvy`) was **not** built by replaying these
files; pieces were applied over time via the SQL editor and the Supabase
MCP. The remote `supabase_migrations.schema_migrations` table currently
records only:

| version | name |
|---|---|
| 20260129132221 | create_base_schema |
| 20260129132244 | add_search_optimization |
| 20260609163306 | fix_quotation_status |
| 20260610132953 | rls_cleanup |
| 20260610133220 | security_definer_hardening |

`20250203_fix_all_schema_issues` and the four `20260315_*` migrations are
live in prod but unrecorded. **Do not run `supabase db push` against prod**
until the history is reconciled with `supabase migration repair` (requires
CLI + DB credentials) or a prod-derived baseline replaces the early files
(audit task 1.5, implementation sketch in `tasks/audit-2026-06-10.md`).

New schema changes: apply via MCP `apply_migration` (records history
automatically) **and** commit the same SQL here with a matching name.
