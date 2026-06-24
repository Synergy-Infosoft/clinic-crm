# Clinic Management System Upgrade Log

Generated: 2026-06-23T10:29:53.147Z

## Summary

Implemented the first recommended upgrade pass focused on security, registration correctness, validation, and accessibility.

## Completed upgrades

- Added a Supabase migration at `supabase/migrations/20260623100157_secure_clinic_data_and_registration.sql`.
- Added baseline table definitions for local reproducibility.
- Hardened RLS by replacing legacy policies on sensitive tables.
- Revoked anonymous access to patient, visit, invoice, profile, token counter, settings, and audit-log data.
- Added role-aware policies for admin, receptionist, and doctor access.
- Added audit logging for patient, visit, and invoice mutations.
- Added clinic settings storage.
- Added confirmation tokens for private patient confirmation links.
- Added collision-safe token and invoice counters.
- Added a server-only atomic registration RPC restricted to `service_role`.
- Added a database trigger that recalculates invoice totals and normalizes payment status.
- Added server-only Supabase admin client.
- Added `/api/register`, `/api/public-config`, and `/api/registration-status`.
- Refactored patient self-registration away from direct browser-side database writes.
- Refactored confirmation page away from URL-provided token/name data and broad queue reads.
- Added Supabase SSR middleware route protection.
- Added security headers in `next.config.mjs`.
- Added database TypeScript types used by Supabase clients.
- Added non-interactive ESLint configuration.
- Added Vitest tests for registration validation and clinic-hours logic.
- Upgraded Next.js to `15.5.19` and removed unused vulnerable `xlsx`.
- Removed unused `recharts` and `sonner`.
- Improved modal accessibility with dialog roles, labels, focus entry, and focus trapping.
- Improved toast accessibility with live regions and dismiss labels.
- Added reduced-motion CSS handling.
- Fixed invalid CSS focus-ring declaration.
- Upgraded QR code page to use `NEXT_PUBLIC_APP_URL`, download PNG, add print support, and replace structural emoji icons.
- Added `.env.example` documenting required server-only variables.

## Validation performed

- `npm run lint` — passed.
- `npm run typecheck` — passed.
- `npm run test` — passed, 4 tests.
- `npm run build` — passed on Next.js 15.5.19.
- Local production smoke test on port 3010:
  - `/dashboard` unauthenticated redirects to `/login?next=%2Fdashboard`.
  - `/login` returns 200.
  - `/register` returns 200.
  - `/api/public-config` returns 200.
  - `/api/registration-status?ref=bad` returns 400.
  - `POST /api/register` returns 503 when `SUPABASE_SERVICE_ROLE_KEY` is not configured, which is the intended fail-closed behavior.

## Could not complete automatically

- Hosted Supabase migration was not applied because the workspace has no authenticated Supabase CLI session, no MCP configuration, no service-role key, and no DB URL.
- `supabase db lint --local` and `supabase migration list --local` could not run because the local Supabase database is not running on port 54322.
- Live RLS verification must be rerun after applying the migration.

## Required next steps before production

1. Add `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, and `REGISTRATION_RATE_LIMIT_SALT` to local and deployment environments.
2. Authenticate the Supabase CLI or configure Supabase MCP.
3. Apply `supabase/migrations/20260623100157_secure_clinic_data_and_registration.sql` to the hosted database.
4. Verify anonymous requests can no longer read `patients`, `visits`, or `invoices`.
5. Run Supabase security/performance advisors after the migration.
6. Review the remaining moderate npm audit finding caused by Next's transitive PostCSS dependency. No high or critical npm findings remain.

## Follow-up after remote Supabase link

Updated: 2026-06-23T10:52:00.000Z

- User linked the hosted Supabase project `ofjhnalotjcpoztfqhjq`.
- User applied remote migration `20260623100157_secure_clinic_data_and_registration.sql` with `supabase db push`.
- User ran `supabase db advisors --linked --type security`; the remaining reported warning was `auth_leaked_password_protection`.
- Added local env entries for:
  - `NEXT_PUBLIC_APP_URL`
  - `REGISTRATION_RATE_LIMIT_SALT`
  - `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` is intentionally still empty in `.env.local` because this agent process could not access a Supabase CLI login token and should not invent or store a fake service key.
- Verified anonymous REST access is blocked for `patients`, `visits`, and `invoices` after the remote migration.
- Re-ran `npm run check`; lint, typecheck, Vitest, and production build passed.

## Remaining production setup

1. Paste the real service-role key into `SUPABASE_SERVICE_ROLE_KEY` locally and in the deployment environment.
2. Enable Supabase Auth leaked-password protection in the Supabase dashboard.
3. Set `NEXT_PUBLIC_APP_URL` to the deployed production URL before production QR-code use.

## Patient registration field update

Updated: 2026-06-23T11:14:00.000Z

- Added `supabase/migrations/20260623110331_patient_visit_metadata.sql`.
- Added optional patient fields: `father_name` and `referral_source`.
- Added visit scheduling fields: `consultation_date`, `consultation_time`, and `visit_type`.
- Removed Blood Group from patient-facing and staff-facing forms. The existing nullable database column is preserved to avoid data loss.
- Changed visit statuses from `waiting / with_doctor / completed / cancelled` to `pending / completed / cancelled`.
- Migrated existing `waiting` and `with_doctor` visits to `pending` on the linked Supabase database.
- Updated QR registration, manual staff registration, patient add form, patient list/profile, dashboard, visit queue, confirmation status polling, TypeScript types, and mock data.
- Updated disease/symptoms minimum length to 5 characters in the public form.
- Applied the migration to the linked Supabase project with `supabase db push --linked --yes`.
- Verified new columns exist through a read-only `information_schema` query.
- Verified existing live visit statuses are now only `pending`, `completed`, and `cancelled`.
- Supabase security advisor still reports only `auth_leaked_password_protection`.

Validation performed:

- `npm run typecheck` ? passed.
- `npm run lint` ? passed.
- `npm run test` ? passed, 4 tests.
- `npm run build` ? passed.

## Settings route fix

Updated: 2026-06-23T11:25:00.000Z

- Added the missing `/settings` dashboard page to fix the sidebar 404.
- Added editable clinic settings for clinic details, contact info, registration number, working hours, working days, and timezone.
- Wired the page to the existing `clinic_settings` table through the authenticated Supabase client.
- Added clinic settings data-service helpers and completed the `ClinicSettings` type with `timezone`.

Validation performed:

- `npm run typecheck` ? passed.
- `npm run lint` ? passed.
- `npm run test` ? passed, 4 tests.
- `npm run build` ? passed and includes `/settings`.

## Split clinic working-hours support

Updated: 2026-06-23T11:40:00.000Z

- Added `working_schedule` JSONB support on `clinic_settings` through `supabase/migrations/20260623112936_clinic_working_schedule.sql`.
- Preserved old `working_hours_start`, `working_hours_end`, and `working_days` as fallback compatibility fields.
- Updated clinic open/closed logic to support multiple time slots per day, including morning/evening sessions.
- Added a Settings shortcut to apply a split schedule: Monday-Saturday `08:00-14:00` and `17:00-21:00`, Sunday `09:00-13:00`.
- Updated the public registration closed/open messaging to show the full schedule instead of one broad time range.
- Added a regression test proving the clinic is closed between split sessions.
- Applied the migration to the linked Supabase project and verified `clinic_settings.working_schedule` exists as `jsonb`.
- Supabase security advisor still reports only `auth_leaked_password_protection`.

Validation performed:

- `npm run typecheck` ? passed.
- `npm run lint` ? passed.
- `npm run test` ? passed, 5 tests.
- `npm run build` ? passed.

## Invoice analytics UI refinement

Updated: 2026-06-23T12:25:00.000Z

- Replaced the scattered analytics period buttons with a compact `Analytics period` select.
- Added a `Last 1 year` analytics period.
- Moved detailed invoice filters into a right-side slide-over panel to reduce page clutter.
- Kept the main invoice page focused on analytics cards, search, export, reset, and the invoice table.
- Added a filter count badge so active advanced filters remain visible while the panel is closed.

Validation performed:

- `npm run typecheck` ? passed.
- `npm run lint` ? passed.
- `npm run test` ? passed, 5 tests.
- `npm run build` ? passed.

## Invoice collection analytics and filters

Updated: 2026-06-23T12:05:00.000Z

- Upgraded the `/invoices` page with a collection and patient analytics summary.
- Added selected-range summary cards for total collection, cash collection, online/UPI collection, average bill, patient count, repeat patients, discount given, and pending amount.
- Collection metrics now count paid invoices by `paid_at`; pending amount and patient visit counts use invoices created in the selected date range.
- Added analytics period support for Today, Yesterday, 2 days ago, Last 7 days, This week, and This month.
- Added custom From/To date fields with a date-basis filter for invoice/payment/activity date.
- Expanded invoice search to include invoice number, patient name, phone, father name, token number, disease/complaint, payment type, dates, and amounts.
- Added filters for payment status, payment method, visit type, discount status, and amount range.
- Added a CSV export for the currently filtered invoice report.
- Expanded the invoice table with patient contact, visit type, complaint, created time, paid time, subtotal, discount, total, status, and method columns.
- Updated quick "mark paid" action to record cash as the payment method.
- Aligned dashboard revenue calculation with collection logic by using `paid_at` instead of invoice creation date.

Validation performed:

- `npm run typecheck` ? passed.
- `npm run lint` ? passed.
- `npm run test` ? passed, 5 tests.
- `npm run build` ? passed.

## Patient profile detail layout

Updated: 2026-06-23T12:40:00.000Z

- Redesigned the patient detail page with a clearer profile header, visit summary counters, and responsive two-column layout.
- Added a full registration details section showing full name, father name, age/gender, phone, address, referral source, and registration timestamp.
- Added a latest visit summary with visit type, consultation date/time, registration source, doctor, and current status.
- Expanded visit history cards to show token number, consultation schedule, visit type, registered-by source, doctor, status, chief complaint/disease, notes, and prescription when available.
- Replaced hidden/conditional patient fields with explicit `Not provided` states so staff can see what was collected versus missing.

Validation performed:

- `npm run typecheck` - passed.
- `npm run lint` - passed.
- `npm run test` - passed, 5 tests.
- `npm run build` - passed.

## Registration origin validation fix

Updated: 2026-06-24T00:00:00.000Z

- Fixed overly strict `/api/register` origin validation that could reject valid form submissions behind HTTPS proxies or custom deployment domains.
- Registration now accepts the current request origin, forwarded host/protocol origin, configured `NEXT_PUBLIC_APP_URL`, and optional comma-separated `APP_ALLOWED_ORIGINS`.
- Documented `APP_ALLOWED_ORIGINS` in `.env.example` for deployments with multiple accepted domains.

Validation performed:

- `npm run typecheck` - passed.
- `npm run lint` - passed.
- `npm run test` - passed, 5 tests.
- `npm run build` - passed.
