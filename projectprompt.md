# Clinic Appointment & Reception Management System

## Claude Code — One-Shot Build Prompt

---

You are building a **production-ready clinic appointment and reception management system** from scratch. Follow every instruction exactly. Do not skip steps. Do not use placeholder data in final code. Build the full working system.

---

## TECH STACK (all free, no paid services)

| Layer           | Tool                     | Why                                     |
| --------------- | ------------------------ | --------------------------------------- |
| Framework       | Next.js 14 (App Router)  | Full-stack, SSR, API routes             |
| UI Components   | shadcn/ui + Tailwind CSS | Beautiful, accessible, consistent       |
| Database        | Supabase (free tier)     | PostgreSQL + Realtime + Auth            |
| Auth            | Supabase Auth            | Staff login, role-based access          |
| PDF Generation  | @react-pdf/renderer      | Invoice PDF generation, free            |
| Excel Export    | SheetJS (xlsx)           | Weekly register export, free            |
| QR Code         | qrcode + react-qr-code   | Static QR for patient registration      |
| Icons           | lucide-react             | Already bundled with shadcn             |
| Date handling   | date-fns                 | Lightweight date utilities              |
| Form validation | react-hook-form + zod    | Type-safe form validation               |
| Notifications   | sonner                   | Toast notifications (shadcn compatible) |
| State           | Zustand                  | Lightweight client state                |
| Fonts           | next/font (Geist)        | Free, fast, self-hosted                 |

**No Stripe. No Razorpay integration. No paid APIs. Everything runs on Supabase free tier + Vercel free tier.**

---

## STEP 1 — PROJECT SETUP

Run these commands in order:

```bash
npx create-next-app@latest clinic-system --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd clinic-system
npx shadcn@latest init
npx shadcn@latest add button card input label select textarea badge table dialog sheet tabs form separator skeleton avatar dropdown-menu alert-dialog progress command popover calendar date-picker
npm install @supabase/supabase-js @supabase/ssr
npm install react-hook-form @hookform/resolvers zod
npm install @react-pdf/renderer
npm install xlsx
npm install qrcode react-qr-code
npm install date-fns
npm install zustand
npm install sonner
npm install lucide-react
npm install @types/qrcode
```

Create `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## STEP 2 — SUPABASE DATABASE SCHEMA

Run this SQL in the Supabase SQL editor exactly as written:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (staff accounts linked to Supabase Auth)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role text not null check (role in ('admin', 'receptionist', 'doctor')),
  created_at timestamptz default now()
);

-- Doctors
create table doctors (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  specialization text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Patients (master record)
create table patients (
  id uuid default uuid_generate_v4() primary key,
  full_name text not null,
  age integer not null check (age > 0 and age < 150),
  gender text not null check (gender in ('male', 'female', 'other')),
  phone text not null,
  address text,
  blood_group text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Visits (each clinic visit = one row)
create table visits (
  id uuid default uuid_generate_v4() primary key,
  patient_id uuid references patients(id) not null,
  doctor_id uuid references doctors(id),
  token_number integer not null,
  token_date date not null default current_date,
  chief_complaint text not null,
  status text not null default 'waiting' check (status in ('waiting', 'with_doctor', 'completed', 'cancelled')),
  notes text,
  prescription text,
  registered_by text default 'self' check (registered_by in ('self', 'receptionist')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Token counter per day
create table token_counters (
  id uuid default uuid_generate_v4() primary key,
  counter_date date not null unique default current_date,
  last_token integer not null default 0
);

-- Invoice / billing per visit
create table invoices (
  id uuid default uuid_generate_v4() primary key,
  visit_id uuid references visits(id) not null unique,
  patient_id uuid references patients(id) not null,
  invoice_number text not null unique,
  line_items jsonb not null default '[]',
  subtotal numeric(10,2) not null default 0,
  discount numeric(10,2) default 0,
  total numeric(10,2) not null default 0,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid_cash', 'paid_online')),
  payment_method text check (payment_method in ('cash', 'online_upi', null)),
  paid_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Charge presets (admin configures these)
create table charge_presets (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  amount numeric(10,2) not null,
  category text default 'general',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Seed default charge presets
insert into charge_presets (name, amount, category) values
  ('Consultation fee', 300, 'consultation'),
  ('Follow-up consultation', 150, 'consultation'),
  ('Blood test (CBC)', 150, 'lab'),
  ('Blood sugar test', 80, 'lab'),
  ('Urine test', 60, 'lab'),
  ('X-Ray', 200, 'radiology'),
  ('ECG', 150, 'diagnostic'),
  ('Dressing / wound care', 100, 'procedure'),
  ('Injection / IV', 50, 'procedure');

-- Seed default doctor
insert into doctors (name, specialization) values ('Dr. Rakesh Sharma', 'General Physician');

-- RLS Policies
alter table profiles enable row level security;
alter table patients enable row level security;
alter table visits enable row level security;
alter table invoices enable row level security;
alter table token_counters enable row level security;
alter table charge_presets enable row level security;
alter table doctors enable row level security;

-- Profiles: users can read their own
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- All authenticated staff can access patients, visits, invoices
create policy "Staff can view patients" on patients for select using (auth.role() = 'authenticated');
create policy "Staff can insert patients" on patients for insert with check (auth.role() = 'authenticated');
create policy "Staff can update patients" on patients for update using (auth.role() = 'authenticated');

create policy "Staff can view visits" on visits for select using (auth.role() = 'authenticated');
create policy "Staff can insert visits" on visits for insert with check (auth.role() = 'authenticated');
create policy "Staff can update visits" on visits for update using (auth.role() = 'authenticated');

create policy "Staff can view invoices" on invoices for select using (auth.role() = 'authenticated');
create policy "Staff can insert invoices" on invoices for insert with check (auth.role() = 'authenticated');
create policy "Staff can update invoices" on invoices for update using (auth.role() = 'authenticated');

create policy "Anyone can read token_counters" on token_counters for select using (true);
create policy "Authenticated can upsert token_counters" on token_counters for all using (auth.role() = 'authenticated');

create policy "Anyone can read charge_presets" on charge_presets for select using (true);
create policy "Staff can manage charge_presets" on charge_presets for all using (auth.role() = 'authenticated');

create policy "Anyone can read doctors" on doctors for select using (true);
create policy "Staff can manage doctors" on doctors for all using (auth.role() = 'authenticated');

-- Function to get next token for today
create or replace function get_next_token()
returns integer as $$
declare
  next_token integer;
begin
  insert into token_counters (counter_date, last_token)
  values (current_date, 1)
  on conflict (counter_date) do update
  set last_token = token_counters.last_token + 1
  returning last_token into next_token;
  return next_token;
end;
$$ language plpgsql security definer;

-- Function to generate invoice number
create or replace function generate_invoice_number()
returns text as $$
declare
  today text;
  count_today integer;
begin
  today := to_char(current_date, 'YYMM');
  select count(*) + 1 into count_today from invoices
  where created_at::date = current_date;
  return today || '-' || lpad(count_today::text, 4, '0');
end;
$$ language plpgsql security definer;

-- Realtime: enable for visits and invoices
alter publication supabase_realtime add table visits;
alter publication supabase_realtime add table invoices;
```

---

## STEP 3 — FILE STRUCTURE

Create this exact folder structure:

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── patients/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── visits/
│   │   │   └── page.tsx
│   │   ├── invoices/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── qr-code/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   ├── register/
│   │   └── page.tsx          ← PUBLIC: patient self-registration (QR lands here)
│   ├── confirmation/
│   │   └── page.tsx          ← PUBLIC: token confirmation page shown to patient
│   ├── api/
│   │   ├── register/
│   │   │   └── route.ts      ← API: patient self-registration
│   │   ├── invoices/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       └── pdf/
│   │   │           └── route.ts  ← API: PDF generation
│   │   └── export/
│   │       └── route.ts      ← API: Excel export
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── ui/                   ← shadcn components (auto-generated)
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── mobile-nav.tsx
│   ├── patients/
│   │   ├── patient-form.tsx
│   │   ├── patient-table.tsx
│   │   └── patient-card.tsx
│   ├── visits/
│   │   ├── visit-queue.tsx
│   │   ├── visit-card.tsx
│   │   ├── add-visit-dialog.tsx
│   │   └── status-badge.tsx
│   ├── invoices/
│   │   ├── invoice-form.tsx
│   │   ├── invoice-table.tsx
│   │   ├── invoice-pdf.tsx
│   │   └── payment-toggle.tsx
│   ├── dashboard/
│   │   ├── stats-cards.tsx
│   │   ├── today-queue.tsx
│   │   └── recent-activity.tsx
│   └── shared/
│       ├── page-header.tsx
│       ├── loading-skeleton.tsx
│       ├── empty-state.tsx
│       └── confirm-dialog.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── utils.ts
│   ├── validations.ts
│   └── pdf-generator.ts
├── hooks/
│   ├── use-visits.ts
│   ├── use-patients.ts
│   └── use-realtime.ts
├── types/
│   └── index.ts
└── middleware.ts
```

---

## STEP 4 — TYPES (src/types/index.ts)

```typescript
export type UserRole = "admin" | "receptionist" | "doctor";

export type VisitStatus = "waiting" | "with_doctor" | "completed" | "cancelled";

export type PaymentStatus = "pending" | "paid_cash" | "paid_online";

export type PaymentMethod = "cash" | "online_upi" | null;

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialization: string | null;
  is_active: boolean;
}

export interface Patient {
  id: string;
  full_name: string;
  age: number;
  gender: "male" | "female" | "other";
  phone: string;
  address: string | null;
  blood_group: string | null;
  created_at: string;
}

export interface Visit {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  token_number: number;
  token_date: string;
  chief_complaint: string;
  status: VisitStatus;
  notes: string | null;
  prescription: string | null;
  registered_by: "self" | "receptionist";
  created_at: string;
  patient?: Patient;
  doctor?: Doctor;
}

export interface LineItem {
  id: string;
  name: string;
  quantity: number;
  amount: number;
}

export interface Invoice {
  id: string;
  visit_id: string;
  patient_id: string;
  invoice_number: string;
  line_items: LineItem[];
  subtotal: number;
  discount: number;
  total: number;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  paid_at: string | null;
  created_at: string;
  visit?: Visit;
  patient?: Patient;
}

export interface ChargePreset {
  id: string;
  name: string;
  amount: number;
  category: string;
  is_active: boolean;
}
```

---

## STEP 5 — SUPABASE CLIENT SETUP

**src/lib/supabase/client.ts**

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

**src/lib/supabase/server.ts**

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {}
        },
      },
    },
  );
}
```

**src/middleware.ts**

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicRoute =
    request.nextUrl.pathname.startsWith("/register") ||
    request.nextUrl.pathname.startsWith("/confirmation") ||
    request.nextUrl.pathname.startsWith("/login");

  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
```

---

## STEP 6 — PUBLIC PATIENT REGISTRATION PAGE

**src/app/register/page.tsx**

Build a beautiful, mobile-first self-registration page. This is what opens when a patient scans the QR code. Requirements:

- Clean, welcoming design with clinic name/logo at top
- Large, touch-friendly inputs (minimum 48px tap target)
- Fields in this exact order:
  1. Full name (text, required)
  2. Age (number, 1-120, required)
  3. Gender (radio buttons: Male / Female / Other, required)
  4. Phone number (tel input, 10 digits, required)
  5. Chief complaint / reason for visit (textarea, required, placeholder: "Describe your symptoms briefly...")
  6. Doctor preference (dropdown from doctors table, optional, default: "Any available")
  7. Address (textarea, optional)
  8. Blood group (select: A+, A-, B+, B-, O+, O-, AB+, AB-, Don't know, optional)
- Use react-hook-form + zod for validation
- Show inline validation errors in red below each field
- On submit: POST to /api/register
- Show loading spinner on submit button while waiting
- On success: redirect to /confirmation?token=XX&name=PatientName
- On error: show toast notification with error message
- Page has a subtle pulsing dot animation at top indicating "reception is live"
- Footer: "Your data is secure and only visible to clinic staff"
- The page must work perfectly on mobile (375px width minimum)

---

## STEP 7 — CONFIRMATION PAGE

**src/app/confirmation/page.tsx**

A beautiful success page shown after self-registration. Requirements:

- Large animated checkmark (CSS animation, no external library) in green
- Token number displayed VERY prominently — huge font, centered, in a colored badge
- Patient's name in a friendly greeting: "Welcome, [Name]!"
- Current estimated wait: show token position (e.g. "You are #3 in queue")
- Instructions card with 3 steps:
  1. "Please take a seat in the waiting area"
  2. "Your token number will be called at the counter"
  3. "Proceed to reception desk when called for payment"
- "Important" notice: "Please keep your phone handy. Show this screen if asked."
- Show today's date and time of registration
- A "Register another patient" link at the bottom (goes back to /register)
- Auto-refresh token position every 30 seconds using Supabase realtime
- Confetti animation on first load (build it with pure CSS/JS, no library)

---

## STEP 8 — API ROUTE: PATIENT REGISTRATION

**src/app/api/register/route.ts**

```typescript
// This route handles public patient self-registration (no auth required)
// Steps:
// 1. Validate request body with zod
// 2. Insert patient record into patients table (or find existing by phone)
// 3. Call get_next_token() Supabase function to get today's token
// 4. Insert visit record
// 5. Create a draft invoice with consultation fee pre-filled
// 6. Return { token_number, visit_id, patient_name }
//
// Use supabase service role key for this route (bypasses RLS)
// Rate limit: reject if same phone number registered in last 2 hours for same date
```

Build the full implementation of this route.

---

## STEP 9 — DASHBOARD LAYOUT

**src/app/(dashboard)/layout.tsx**

Build a full responsive dashboard layout:

- Collapsible sidebar on desktop (250px expanded, 64px collapsed)
- Bottom navigation on mobile
- Sidebar items with icons (lucide-react):
  - Dashboard (LayoutDashboard icon) → /dashboard
  - Today's Queue (ListOrdered icon) → /visits
  - Patients (Users icon) → /patients
  - Invoices (Receipt icon) → /invoices
  - QR Code (QrCode icon) → /qr-code
  - Settings (Settings icon) → /settings (admin only)
- Top header with:
  - Clinic name on left
  - "Today: [date]" in center
  - Staff name + role badge + logout button on right
- Active state on sidebar item uses a subtle left border + background highlight
- Smooth transition animations on all interactions

---

## STEP 10 — DASHBOARD HOME PAGE

**src/app/(dashboard)/dashboard/page.tsx**

Build a real-time dashboard with:

**Stats row (4 cards):**

- Patients today (count of visits for current date)
- Waiting (count of status='waiting')
- Completed (count of status='completed')
- Revenue today (sum of invoices total where paid today)

**Today's Queue section (below stats):**

- Table/list of today's visits sorted by token number
- Columns: Token #, Patient Name, Age, Complaint, Status, Time Registered, Actions
- Status shown as colored badges:
  - Waiting → yellow badge
  - With Doctor → blue badge
  - Completed → green badge
  - Cancelled → gray badge
- Actions per row:
  - "Mark with doctor" button (→ updates status to with_doctor)
  - "Mark complete" button (→ updates status to completed)
  - "View invoice" button (→ goes to invoice page)
  - "Cancel" button (shows confirm dialog)
- "Add Patient Manually" button top-right (opens a dialog with the same registration form)
- Realtime updates: new patients appear instantly without page refresh using Supabase realtime subscription
- Empty state: illustration + "No patients yet today. QR code registrations will appear here."

**Recent patients sidebar panel (right side on desktop):**

- Last 5 registered patients with name, token, time

---

## STEP 11 — VISITS / QUEUE PAGE

**src/app/(dashboard)/visits/page.tsx**

Full visit management page:

- Date picker at top to view any day's queue (default: today)
- Filter tabs: All / Waiting / With Doctor / Completed / Cancelled
- Search bar: search by patient name or token number
- Visit cards showing: token number, patient name + age, complaint, doctor assigned, time, status, action buttons
- Bulk actions: select multiple → mark complete, export selected
- Click a visit to open a side sheet with:
  - Full patient details
  - Visit details and editable notes field
  - Editable prescription textarea
  - Doctor assignment dropdown
  - Status update buttons
  - Link to invoice

---

## STEP 12 — PATIENTS PAGE

**src/app/(dashboard)/patients/page.tsx**

Patient records list:

- Search by name or phone number
- Table: Name, Age, Gender, Phone, Blood Group, Total Visits, Last Visit, Actions
- Click patient → /patients/[id]
- Add new patient button (manual entry form in dialog)
- Export to Excel button (exports all patient data)

**src/app/(dashboard)/patients/[id]/page.tsx**

Patient detail page:

- Patient info card (edit inline)
- Visit history table (all past visits with date, complaint, doctor, status, invoice link)
- Total spent (sum of paid invoices)
- Quick "Register new visit" button

---

## STEP 13 — INVOICES PAGE & INVOICE DETAIL

**src/app/(dashboard)/invoices/page.tsx**

Invoice list with:

- Date range filter (default: today)
- Filter by payment status: All / Paid Cash / Paid Online / Pending
- Table: Invoice #, Patient, Visit Date, Total, Payment Method, Status, Actions
- "Export to Excel" button — exports filtered results as .xlsx with all columns
- Revenue summary at top: Total / Cash / Online / Pending

**src/app/(dashboard)/invoices/[id]/page.tsx**

Full invoice detail page — build EXACTLY like the payslip mockup I described:

Left panel (invoice preview):

- Clinic name, address, doctor name, registration number
- Invoice number, date
- Patient details: name, age, gender, token, phone, complaint
- Line items table: Description | Qty | Unit Price | Total
  - Each row has a delete button
  - "Add charge" button opens a popover with charge presets list + custom amount option
- Subtotal, discount field (editable), Total
- Payment section with 3 toggle buttons: Cash / Online UPI / Pending
  - When Cash or Online is selected, show "Mark as paid" button which sets paid_at timestamp
- "Generate PDF" button → calls /api/invoices/[id]/pdf and downloads the PDF
- "Print" button → window.print() with print-only CSS
- Auto-save line items and payment status on change (debounced 500ms)

Right panel (patient/visit summary):

- Patient card
- Visit details
- Quick status update

---

## STEP 14 — PDF GENERATION

**src/lib/pdf-generator.ts** + **src/app/api/invoices/[id]/pdf/route.ts**

Build a PDF invoice using @react-pdf/renderer with:

- Professional A4 layout
- Clinic header: name, address, phone, GSTIN placeholder
- "RECEIPT / INVOICE" heading with invoice number and date
- Patient info section in a 2-column grid
- Line items table with alternating row colors
- Total section with subtotal, discount, final total
- Payment status: large colored stamp ("PAID - CASH", "PAID - UPI", "PAYMENT PENDING")
- Footer: "Thank you for choosing [Clinic Name]. This is a computer generated receipt."
- "Not valid without clinic stamp" note
- Font: use built-in PDF fonts (Helvetica)

---

## STEP 15 — EXCEL EXPORT

**src/app/api/export/route.ts**

Build an Excel export endpoint using SheetJS:

Accept query params: `type` (patients | visits | invoices), `from` (date), `to` (date)

For invoices export, generate an .xlsx with these sheets:

1. "Summary" sheet: total patients, revenue, payment breakdown
2. "Visits" sheet: all visits in date range with all columns
3. "Invoices" sheet: all invoices with line items flattened

For patients export: one row per patient with all fields + visit count + total spent.

Style the Excel: bold headers, frozen first row, auto-width columns, colored header row (#1D9E75 background, white text).

Return as downloadable .xlsx with filename: `clinic-register-YYYY-MM-DD.xlsx`

---

## STEP 16 — QR CODE PAGE

**src/app/(dashboard)/qr-code/page.tsx**

A dedicated page for generating and displaying the registration QR code:

- Large QR code centered on page (using react-qr-code)
- QR encodes: `${NEXT_PUBLIC_APP_URL}/register`
- "Download QR Code" button — downloads as PNG
- "Print QR Code" button — opens print dialog with just the QR + clinic name
- Instructions card: "Place this QR code at your reception desk. Patients scan it to self-register."
- Preview of what patients see on their phone (small mockup)
- Option to regenerate (useful if URL changes)

---

## STEP 17 — LOGIN PAGE

**src/app/(auth)/login/page.tsx**

Clean, centered login page:

- Clinic name/logo at top
- Email + password fields
- "Sign in" button with loading state
- Error handling: "Invalid credentials" toast
- No sign-up link (staff accounts created by admin only)
- Use Supabase Auth email/password sign in
- After login: check profile role and redirect to /dashboard

---

## STEP 18 — SETTINGS PAGE (Admin only)

**src/app/(dashboard)/settings/page.tsx**

Tabbed settings page with tabs:

**Clinic Info tab:**

- Clinic name, address, phone, doctor name, registration number (MBBS/license)
- These values stored in a `settings` table or .env, used in PDF header

**Charge Presets tab:**

- Table of all charge presets
- Add new preset: name + amount + category
- Edit inline
- Toggle active/inactive
- Delete with confirm dialog

**Staff Accounts tab (admin only):**

- List of staff with name, email, role
- Invite new staff: send invite email via Supabase Auth
- Change role dropdown

**Doctor Management tab:**

- Add/edit/deactivate doctors

---

## STEP 19 — REALTIME HOOK

**src/hooks/use-realtime.ts**

```typescript
// Build a custom hook that:
// 1. Subscribes to visits table changes (INSERT, UPDATE) for today's date
// 2. Returns current visits array, automatically updated
// 3. Shows a toast notification when a new patient self-registers:
//    "New patient: [Name] — Token #XX"
// 4. Cleans up subscription on unmount
// 5. Works with Supabase realtime channels
```

Build the full implementation.

---

## STEP 20 — STYLING & UI POLISH

Apply these design decisions consistently across ALL pages:

**Color palette:**

- Primary: `#1D9E75` (teal green — medical trust)
- Primary hover: `#0F6E56`
- Background: white / `#F8FAFC`
- Sidebar background: `#0F172A` (dark slate)
- Sidebar text: `#94A3B8`, active: white

**Typography:**

- Font: Geist Sans (next/font)
- Page titles: 24px, font-weight 600
- Section headers: 16px, font-weight 500
- Body: 14px, font-weight 400
- Table cells: 13px

**Component patterns:**

- All cards: white background, 1px border `#E2E8F0`, border-radius 12px, subtle shadow
- Buttons: use shadcn Button with custom primary color class
- Status badges: use shadcn Badge with semantic colors
- Tables: use shadcn Table with sticky header, hover row highlight
- Forms: use shadcn Form with proper label spacing, helper text below inputs
- Dialogs: use shadcn Dialog/Sheet, never full-page navigations for quick actions
- Loading states: use shadcn Skeleton for all async data
- Empty states: centered illustration (simple SVG) + heading + subtext + CTA button

**Micro-interactions:**

- Page transitions: subtle fade-in (CSS only, no library)
- Button clicks: scale(0.98) active state
- New queue items: slide-in from top animation
- Toast notifications: bottom-right, auto-dismiss 4 seconds
- Sidebar collapse: smooth 200ms width transition

**Mobile responsiveness:**

- Dashboard: single column stack on mobile
- Sidebar: hidden on mobile, bottom nav instead
- Tables: horizontal scroll on mobile with sticky first column
- All tap targets minimum 44px height

---

## STEP 21 — ERROR HANDLING & EDGE CASES

Handle these cases gracefully throughout the app:

1. Supabase connection failure → show "Connection lost" banner, retry automatically
2. QR registration when clinic is closed → check business hours (configurable), show "Registration is closed. Please visit us during working hours."
3. Duplicate registration → if same phone + same date → show "You are already registered today. Your token is #XX"
4. Token counter rollover → tokens reset to 1 each day automatically (handled by DB function)
5. Empty invoice → warn before PDF generation if no line items added
6. Offline state → show offline banner, disable submit buttons
7. Session expiry → redirect to login with "Your session expired. Please sign in again." message
8. Invalid QR URL → if /register is accessed without valid clinic setup, show friendly error

---

## STEP 22 — FINAL CHECKLIST

Before considering the build complete, verify:

- [ ] `/register` page works without authentication
- [ ] `/confirmation` page shows correct token
- [ ] Dashboard shows realtime updates when new patient registers
- [ ] Receptionist can add patient manually from dashboard
- [ ] Invoice can be created, edited, and marked paid
- [ ] PDF downloads correctly with all patient/invoice data
- [ ] Excel export downloads with correct data
- [ ] QR code page generates downloadable PNG
- [ ] Login/logout flow works
- [ ] All pages are mobile responsive
- [ ] All forms have validation with clear error messages
- [ ] Loading skeletons show during data fetch
- [ ] Empty states show when no data
- [ ] Sidebar navigation highlights active route
- [ ] No TypeScript errors
- [ ] No console errors in browser

---

## HOW TO RUN

```bash
# Development
npm run dev

# Build for production
npm run build
npm start

# Deploy to Vercel (free)
npx vercel --prod
```

**Vercel deployment:** Connect your GitHub repo to Vercel. Add all `.env.local` variables to Vercel environment variables. Deploy. Done — free hosting on Vercel's free tier handles a clinic's traffic comfortably.

---

## SEED DATA FOR TESTING

After setup, run this in Supabase SQL editor to create a test staff account:

```sql
-- First create user via Supabase Auth dashboard (Authentication → Users → Add user)
-- Email: receptionist@clinic.com, Password: Clinic@1234
-- Then run:
insert into profiles (id, full_name, role)
values ('PASTE_USER_UUID_HERE', 'Test Receptionist', 'receptionist');
```

---

_Build the complete, production-ready system. Every page, every component, every API route — fully implemented. No TODOs, no placeholder comments, no mock data in production code._
