# ShikkhaSetu — School management for Bangladeshi schools (frontend demo)

Next.js 16 frontend for a school management system built around two problems:

1. **Forged result-card signatures.** Results go straight to the parent's own verified account.
   The parent acknowledges with **their PIN + an OTP sent to the phone the school registered**.
   Every other guardian gets an SMS when someone acknowledges, the class teacher sees who / when /
   how, and rule-based anomaly flags point at suspicious acknowledgments. Printed cards carry a QR
   code; `/verify/<code>` shows whether a guardian acknowledged it digitally.
2. **"Is my child really at school?"** Gate check-in/out by ID-card QR, the class register, instant
   guardian alerts (arrived / absent / late / left early / absent N days), and **gate-vs-class
   mismatch detection** (checked in at the gate but absent in class).

Plus notices, homework & diary, timetable with conflict detection, exams & marks entry, fees with
mock bKash/Nagad/Rocket payments, leave, teacher–guardian messaging, meetings, promotion, reports
and an audit log. English + বাংলা.

There is **no backend**. All data lives in the browser (IndexedDB) behind a service layer.

## Run it

```bash
npm install
npm run dev            # http://localhost:3000
npm test               # 73 unit tests (grading, permissions, anomaly rules, attendance, OTP, seed)
npm run typecheck
npm run lint
npm run build
```

### Demo accounts

The login page has one-click demo buttons. Every demo password is `demo1234`; every parent PIN is `2580`.

| Account | Sign in with | What to try |
|---|---|---|
| Parent with 2 children | `01711000100` | Home → "New result" → acknowledge Rahim's Class Test 3 (PIN → OTP) |
| Mother (2nd guardian) | `01711000101` | See "your child's result was acknowledged by…" |
| Class teacher of 8-A | `01711000010` | Section board (mismatches), Acknowledgments (flags, SMS-code call flow), finish the Annual Math marks → lock |
| Teacher who is also a parent | `01711000011` | Switch role in the account menu |
| School admin | `01711000001` | Publish locked sections, correct a result, change a guardian phone, settings |
| Student (8-A) | `DMHS-26-08101` (Student tab) | Results show only "acknowledged yes/no"; parent routes give 403 |
| Gate staff | `01711000005` | Scan / type `DMHS-26-08101`, IN/OUT, early checkout, offline queue |

The **Dev panel** (bottom-right) shows the simulated **SMS outbox** (OTPs and codes appear there,
since nothing is really sent), lets you time-travel the clock (late arrivals, register lock),
toggle latency / error injection / gate offline mode, and reset the demo database.

### Golden paths

1. **Acknowledgment:** Teacher (8-A) → Marks entry → *Annual Examination · General Mathematics · 8-A*
   → fill the empty rows → Submit → Result review → Lock. Admin → Exams → Annual → select 8-A →
   Publish. Parent → Home → acknowledge (PIN `2580`, OTP from the SMS outbox). The mother's account
   and the class teacher's tracker show it immediately.
2. **Bunking:** Gate → check in a student of 8-A. Teacher → Take attendance → mark that student
   Absent → Submit. The parent gets a mismatch alert; the class teacher resolves it on the section board.
3. **Forbidden:** sign in as the student and open `/parent` → 403.
4. **Phone change:** Admin → Guardians → Phone → change. The old number gets an SMS (outbox), devices
   are signed out, and the next acknowledgment by that guardian is flagged *high*.

## Public website

Server-rendered marketing pages share one header and footer (`app/(public)/layout.tsx`):
`/` home, `/features`, `/parents` (Bangla-first), `/security`, `/faq`, `/about`,
`/contact` (demo-request form), `/privacy`, `/terms`, plus `sitemap.xml`, `robots.txt` and the site icon.

Look and feel: light ("white") mode by default with a dark toggle, Baloo Da 2 headings (Bangla + English),
school colours (`--sun`, `--coral`, `--sky`, `--leaf`, `--grape`, `--cream` in `app/globals.css`),
notebook-paper heroes, taped photo snapshots, stickers and a blackboard call-to-action
(`components/marketing/doodles.tsx`, `blocks.tsx`). Photos of Bangladeshi students are in
`public/images/school/` (Pexels License — see `CREDITS.md`).

Before launch, review:
* Replace the stock photos with photos of your pilot school, with written consent from guardians.
* `lib/site.ts` — contact email, office and hours are placeholders.
* `/privacy`, `/terms` — drafts; have them checked by a lawyer.
* `/contact` — the form saves to the browser only until there is an API.
* Set `NEXT_PUBLIC_SITE_URL` for correct sitemap and social-preview links.

## Architecture

```
app/(public)        marketing site (server-rendered, no data wait)
app/(app-public)    /login, /verify/[code], /forbidden (wait for the browser database)
app/(dashboard)     /admin /teacher /parent /student /gate  (one AppShell, role-aware nav)
proxy.ts            optimistic role redirects from a MOCK session cookie (Next 16 "proxy")
features/<domain>/  service.ts (contract + mock), lib/ (pure rules + tests), components/
lib/auth            permissions.ts (role → permission map), scope.ts (which records), session
lib/mock            schema, deterministic seed, Zustand + IndexedDB store, dev settings
lib/services        runtime (query/command, notify, audit), lookups, provider switch (index.ts)
types/              domain types — single source of truth
messages/           en.json, bn.json (next-intl)
tests/              Vitest
```

* UI never touches the mock store. Every call goes through `services.<domain>` (`lib/services/index.ts`).
* Every service method enforces permission **and scope** as if it were the backend
  (a teacher can only mark sections they teach; a parent only sees their own children).
* Frontend checks are UX only. The backend must re-check everything; `lib/auth/permissions.ts`
  and `lib/auth/scope.ts` have no UI dependencies so it can import them.

### Swapping in a real backend

1. Implement `apiXxxService` objects that satisfy the existing types
   (`export const apiResultService = { ... } satisfies ResultService`).
2. Switch them in `lib/services/index.ts`.
3. Replace the mock session cookie with a signed httpOnly session; keep `proxy.ts` as the optimistic check.
4. Move the rules in `features/*/lib` to the server (pure functions with tests).
5. Real SMS gateway, hashed OTP storage, rate-limit `/verify` and OTP endpoints, file storage for
   photos/attachments, and bKash/Nagad via their hosted checkout + webhooks.

See `DECISIONS.md` for choices made where the spec was open, and `SYSTEM_PROMPT.md` for the spec.

## Known limits of this demo

* Data is per-browser. Two people on two devices do not see each other's changes.
* Some admin/teacher table labels are English-only; the parent-facing flow, navigation and
  statuses are translated.
* No real photos — initials are shown where the student photo would be.
* Holiday dates in the seed are approximate.
