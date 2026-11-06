# TheraPlay — Feature Audit

Basis: read from the source code (routes, controllers, middleware, models, migrations, React pages and helpers) on 2026-11-06. Nothing was changed, run against the database, or migrated for this audit.

**How to read the status labels**
- **FULLY IMPLEMENTED** — code exists on both sides (where needed) and is covered by automated tests (backend 551 passing, frontend 452 passing at last run).
- **PARTIAL** — exists with a limitation, stated.
- **BACKEND ONLY / FRONTEND ONLY** — as named.
- **NEEDS MANUAL TESTING** — nothing in this project has been exercised in a real browser by the assistant. **Every UI behaviour below is "confirmed by code and automated tests", not by a person using it**, unless said otherwise. Real email delivery has never been verified.

---

## 1. Project Overview

TheraPlay is a therapy-activity web app for parents of children who need therapy practice.
- **Frontend:** React 19 + Vite + Tailwind CSS v4 + React Router (`src/`).
- **Backend:** Laravel + Sanctum JSON API (`backend/`), MySQL (dev DB `theraplay_db`).
- **Roles actually implemented:** `parent` and `admin` (plus the states guest and unverified parent, which are derived).
- **Authentication:** Sanctum bearer token (stored in the browser; 7-day expiry by default). No cookies/CSRF cookie.
- **Content:** six fixed categories; 73 activities were imported by the owner; attachments are PDFs/images.

---

## 2. Complete Feature Inventory (summary)

| # | Area | Features |
|---|---|---|
| A | Authentication & accounts | Register, Login (remember me), Logout, Forgot/Reset password, Email-code verification, Verify later, Profile edit, Profile photo, Delete account, Session handling |
| B | Parent | Children profiles (multiple), child selector, Dashboard, Progress, Contact/Feedback |
| C | Catalog | Activity list with thumbnails, completed marking, filters |
| D | Search/filter | Category and difficulty filters; global search (pages + activities) |
| E | Details & resources | Activity page, objective/instructions/materials, attachment preview and download |
| F | Completion & journal | Mark completed, Undo, session journal (1–5 stars + note, one per child+activity, edit/delete) |
| G | Progress | Weekly bars, completion %, streaks, skills, trend, recent activity |
| H | Feedback | Site feedback with optional rating; admin read/delete; admin Activity Feedback list |
| I | Admin dashboard | Totals, recent uploads, parent feedback, activity feedback |
| J | Content management | Activities CRUD, picture, attachments, publish/unpublish, archive/restore/delete, conditions, categories (description only), contacts, developer team, accounts |
| K | Email | Verification code, verification link (legacy), password reset, honest delivery reporting, test command |
| L | Security | Roles, verified-parent gate, rate limits, upload sniffing, headers, CSP, token expiry |
| M | UI/accessibility | Responsive sidebar, modals, confirm dialogs, skeletons, keyboard support, reduced motion |
| N | System | Artisan commands, thumbnails, tunnel sharing, tests |

---

## 3. Detailed Feature Descriptions

### A. Authentication and Account Management

**A1. Registration** — *Guest.* Form: first name, last name, email, phone, password + confirmation (password toggles on both). Server validates names ≤100, email unique/≤255, phone required ≤30, password ≥8 and confirmed. Creates the parent **unverified**, returns a login token, emails a six-digit code, answers `email_verification {sent, delivery_available, expires_in}`. The official admin email is reserved and refused. A submitted `role` is ignored. Rate limited (10/min per address). Then goes to `/verify-code`. Status: FULLY IMPLEMENTED (email delivery NEEDS MANUAL TESTING).

**A2. Email verification code (step 2 of 3)** — *Logged-in unverified parent.* One numeric input (digits only, 6 max, paste supported, one-time-code autocomplete), expiry countdown, Verify, Resend (30 s cooldown shown), honest errors for wrong/expired/too many attempts. Server: code stored only as an HMAC in the cache, single use, 10-minute lifetime (configurable), 5 wrong guesses destroys it, resend invalidates the older code. Limits: verify 10/min, resend 3/min per account. Status: FULLY IMPLEMENTED; real inbox delivery NEEDS MANUAL TESTING; needs a persistent cache store.

**A3. Verify later** — *Unverified parent.* A button on the code page that goes to the dashboard without verifying. The account stays restricted (see L). Status: FULLY IMPLEMENTED.

**A4. Create child profile (step 3 of 3)** — *Verified parent without a child.* Forced stage: a verified parent with no child is sent to `/create-child`. Same form as in Profile. Status: FULLY IMPLEMENTED.

**A5. Onboarding routing** — the server decides (`onboarding` in `GET /api/user`): unverified parent → browses freely with a reminder banner; verified without child → `/create-child`; verified with child or admin → complete. A parent who leaves midway just logs in again. Status: FULLY IMPLEMENTED.

**A6. Login** — *Guest.* Email + password, password toggle, "Remember me" (default on: token in localStorage; off: sessionStorage for the tab), link to Forgot Password, success/error message area. Server: generic "email or password is incorrect" for wrong password and unknown email (same cost via a throw-away hash). Throttles: 20/min per address, plus 5 failed tries per 5 minutes per email+address. Admins go to `/professional-dashboard`, parents to the dashboard/child step. Status: FULLY IMPLEMENTED.

**A7. Logout** — *Logged in.* Sidebar "Log Out" → confirm dialog → revokes the token on the server and clears local storage. Status: FULLY IMPLEMENTED.

**A8. Session handling** — `GuestOnly` redirects logged-in people away from login/register/forgot; `SessionWatcher` sends a page to login when the token disappears (back/forward cache restore, logout in another tab); pages redirect with "Your session has expired" on 401; token expiry 7 days. Status: FULLY IMPLEMENTED (browser behaviour NEEDS MANUAL TESTING).

**A9. Forgot password** — *Guest.* Enter email → same answer for known/unknown emails; emails a reset link (60 min, single use). Says honestly if mail delivery is not configured. Rate limit 5/min. Status: FULLY IMPLEMENTED; delivery requires email configuration and is unverified.

**A10. Reset password** — *Anyone with the emailed link* (`/reset-password?token&email`). New password + confirmation (≥8), invalid/expired link message, all existing logins revoked after a reset; an unverified account becomes verified (opening the link proves the address). Status: FULLY IMPLEMENTED.

**A11. Profile reset button** — *Logged-in user.* "Reset Password" in Profile emails a reset link to the user's own address. Status: FULLY IMPLEMENTED (needs email).

**A12. Profile view/edit** — name, contact number, email (read-only for verified accounts; an **unverified** parent may correct their email — max 5 changes/hour; the old code is invalidated and a new one sent to the new address). Edit / Cancel / Save Changes, success/error messages. Status: FULLY IMPLEMENTED.

**A13. Profile picture** — upload JPEG/PNG/WebP up to 5 MB (content-sniffed), preview, Save/Cancel, remove; stored on the private disk and shown through an authenticated fetch (only the owner can read it). Rate limited. Status: FULLY IMPLEMENTED.

**A14. Delete own account** — password required; refused for admins and for accounts with child profiles (children must be removed first, and children with progress cannot be deleted). Status: FULLY IMPLEMENTED.

**A15. Verification banner** — a reminder on every page for unverified parents ("Verify now / Change email"). Status: FULLY IMPLEMENTED.

**A16. Legacy verification link** — `/verify-email` page + public `POST /email/verify/{id}/{hash}` for old links, admin-created accounts and old pending-email links; statuses verified / email_changed / already_verified / expired / invalid / email_taken. Status: FULLY IMPLEMENTED (kept for compatibility).

### B. User/Parent Features

**B1. Child profiles** — *Verified parent.* Several children per parent. Name (required), date of birth (not in the future, not more than 18 years ago), optional conditions picked from the admin-managed list (active ones only). Add / edit / delete; a child with saved progress cannot be deleted (explained message). Creating/editing/deleting needs a verified email. Same-name-same-birthday submitted twice within a minute returns the first (no duplicate). Status: FULLY IMPLEMENTED.

**B2. Child selector** — top-bar control to choose the active child; remembered per account in browser storage (a preference only); Activities, Dashboard and Progress follow it. "Choose Child" button also on Profile. Status: FULLY IMPLEMENTED.

**B3. Parent Dashboard** — "Hello, {name}!"; *Continue / Recommended Activity* (an in-progress activity if one exists, otherwise the first published activity not yet completed); *Streak* (consecutive days with a completion; yesterday still counts); *Summary of Progress*; *Recent Activities* (last 3, hides undone ones); loading skeleton, error and empty states; prompts for "no child" / "verify first". Status: FULLY IMPLEMENTED.

**B4. Contact Us** — public list of professional contacts (name, title, email/phone links, picture), the Developer Team card, and a feedback form (message ≤5000, optional 1–5 star rating) for parents. Status: FULLY IMPLEMENTED.

### C. Activity Catalog and Browsing

**C1. Activities list** — everyone can see **all published, non-archived** activities (the child's conditions do not filter). Cards show picture (dedicated picture → generated PDF page-1 thumbnail → first attached image → placeholder), difficulty badge, title, description, "View Activity" link. Loading skeleton, error and empty states. Status: FULLY IMPLEMENTED.

**C2. Completed marking and order** — for the selected child, completed activities show a green-tinted card with a "Completed ✓" label and are listed after the not-completed ones. Guests, admins, and parents without a child see no marks. Status: FULLY IMPLEMENTED.

**C3. Card hover glow** — decorative glow/lift on hover or keyboard focus (hover-capable devices only). Status: FULLY IMPLEMENTED (look NEEDS MANUAL TESTING).

### D. Activity Search, Filtering and Categorization

**D1. Category filter** — dropdown built from the categories the loaded activities have (client-side). **D2. Difficulty filter** — Easy / Medium / Hard (client-side). "No activities match these filters / Reset filters" empty state. Status: FULLY IMPLEMENTED.

**D3. Global search** — floating pill with suggestions: pages (limited by who is asking; match on title and aliases, ranked) and activities (title, description; up to 5). Keyboard: Arrow keys, Enter, Escape; clear button; listbox/combobox ARIA roles; "no results" status. Status: FULLY IMPLEMENTED (suggestion blur look NEEDS MANUAL TESTING).

**D4. Categories** — six fixed categories (Executive Function, Fine Motor Skills, Functioning Skills, Handwriting, Sensory, Visual). Status: FULLY IMPLEMENTED.

**Not implemented:** free-text search box or sort control on the Activities page itself, pagination of the activity list.

### E. Activity Details and Learning Resources

**E1. Activity page** `/activities/:id` — picture, category, difficulty, description, **Objective**, **Instructions** (numbered list), **Materials**, attachments, "Back to Activities". Readable by guests (public API). Status: FULLY IMPLEMENTED.

**E2. Attachment preview** — modal viewer for images (JPG/PNG/WebP/GIF), PDFs (browser's viewer in a frame on a blob) and TXT (escaped plain text); loading/missing/error states, Close, Escape, Download fallback. Status: FULLY IMPLEMENTED (PDF preview in real browsers NEEDS MANUAL TESTING).

**E3. Attachment download** — Download button saves the file; Office files (DOCX/XLSX/PPTX) are download-only. Served as an attachment with an allow-listed content type, `nosniff` and a sandbox CSP. Status: FULLY IMPLEMENTED.

### F. Activity Completion and Journaling

**F1. Mark as Completed** — *Verified parent with a selected child.* Records a `completed` progress row (reuses the row if one exists); the button becomes a green "Completed ✓" with a red "Undo completion". Unverified parents see it disabled with a "Verify now" link; guests are sent to login. Status: FULLY IMPLEMENTED.

**F2. Undo completion** — confirm dialog; returns the record to `in_progress` if it has a start time, else `not_started`; the row is kept; available on the activity page and on Progress → Recent. Status: FULLY IMPLEMENTED.

**F3. Session journal** — after a *fresh* completion a popup asks for a **1–5 star rating** (required) and an **observation note** (optional, ≤5000 characters, counter, fixed-size scrolling box). **One journal per child and activity** (even after undo + re-complete). Edit and delete in the "Session Journal for {child}" history on the activity page; "Add journal entry" if none. Skipping with typed text asks first; a failed save keeps the text. Status: FULLY IMPLEMENTED.

### G. Progress Monitoring and Activity History

**G1. My Progress page** (selected child): *Weekly Participation* (completion rate %, bars per day of the current week, total this week), *Skills Practiced* (counts per category), *Activity Trend*, *Recent Activity* (5 latest, with Undo), longest streak. Equal-height card grid, skeleton, error/empty states. Status: FULLY IMPLEMENTED. **Known caveat:** the "completion rate" is completed ÷ attempted; because nothing in the app ever records `in_progress`, it is effectively 100% whenever anything is completed (documented, deliberately not changed).

### H. Feedback and Rating System

**H1. Site feedback** — Contact page; parent only, verified; message + optional stars; 10/min limit; message and rating kept on failure. Admin sees it on the dashboard and can delete it. Status: FULLY IMPLEMENTED.

**H2. Activity (session) feedback** — the journal entries from F3, shown to admins read-only (see I3). Status: FULLY IMPLEMENTED.

### I. Administrator Dashboard

**I1. Overview cards** — Total Activities, Total Users (counted from the accounts list). **I2. Recent Activity Uploads** (4 newest, link to Manage Activities). **I3. Parent Feedback** (site feedback, newest first, with delete-confirm popup). **I4. Activity Feedback** — paginated (10 per page, Newer/Older): parent name, activity, stars, child, session date, note; no emails shown; admins cannot edit. Loading skeletons, retry on error. Status: FULLY IMPLEMENTED.

### J. Activity and Content Management (Admin only)

**J1. Manage Activities** — Active / Archived switch; create / edit a form (title, category *required and fixed list*, description, objective, instructions list, materials list, difficulty Easy/Medium/Hard, relevant conditions or "all conditions"); picture upload (JPEG/PNG/WebP ≤5 MB) with replace/remove; attachments (PDF, DOCX, XLSX, PPTX, PNG, JPG/JPEG, WebP, GIF, TXT; 10 MB each, up to 10 files; type detected from content); new activities start as drafts. Status: FULLY IMPLEMENTED.
**J2. Publish / Unpublish**. **J3. Archive** (hides separately from unpublish, keeps everything), **Restore** (returns the previous publication state), **Delete permanently** (archived only, confirmation popup, removes the activity's progress records, attachments, picture). Archived activities reject edits/uploads (409). Status: FULLY IMPLEMENTED.
**J4. Manage Conditions** (popup) — add, rename, describe, switch on/off; never deleted. **J5. Manage Categories** (popup) — only descriptions can be edited. Status: FULLY IMPLEMENTED. *Note:* conditions assigned to activities are stored but **do not filter** what parents see (PARTIAL by design).
**J6. Manage Contacts** — add / edit / delete professional contacts (name, title, email, phone digits-only pattern, description, photo ≤2 MB), delete popup. **J7. Edit Development Team** (popup: name, description, up to 10 emails and phones). Status: FULLY IMPLEMENTED.
**J8. Manage Accounts** — two tables (Parent Accounts / Administrator Accounts) each with its own search and "Showing X of Y"; shows verified/not-verified; **Create Administrator** (name, email, password ≥8; always creates an admin and emails a verification link); **Edit** (name only; email read-only); **Make Admin / Make Parent** (row confirmation; signs the person out); **Delete** (popup). Guards: cannot delete/demote yourself or the last admin; cannot delete accounts with child profiles. Status: FULLY IMPLEMENTED.
**J9. Predefined administrator** — `php artisan admin:initialize` creates the official admin from `.env` values (backend only; no screen). Status: BACKEND ONLY.

### K. Email and Notification Features
- Verification **code** email (branded template). Verification **link** email (legacy/admin-created accounts). Password reset email.
- Delivery reporting: responses say `delivered:false` / "email delivery is not set up" for the log/array mail drivers instead of claiming a send; SMTP timeout 15 s; `php artisan mail:test <address>` (backend only).
- In-app notices: success/error banners, "Saved, but the email could not be sent" messages. Status: FULLY IMPLEMENTED in code; **real SMTP delivery has never been confirmed** (needs the owner's Gmail app password in `backend/.env`).

### L. Security and Access Control
Server-enforced roles (`role:admin`, `role:parent`), `verified.parent` gate, `RequireRole` (UX only), per-route named rate limiters, bcrypt hashing, hashed one-time codes, login throttling and dummy hash, private-disk uploads with content sniffing and server-made paths, response headers (`nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`), production CSP meta tag, CORS allow-list, debug forced off outside local/testing, 7-day token expiry, trusted-proxy handling for the tunnel. Details in §7.

### M. UI, Navigation and Accessibility
Sidebar (role-specific links; collapses to an icon rail at ≤900 px; glow/glass hover and active states), floating search pill, top-right profile shortcut, child selector, breakpoints (laptop/tablet/phone), skeleton loaders (≥500 ms), confirmation popups (logout, delete, undo, archive), modals with Escape/backdrop/focus trap/focus return, error boundary per section, 404 page, reduced-motion support, labelled controls (`aria-label` on toggles/search/nav), `role=status/alert` messages. Details in §8.

### N. Backend and System Capabilities
Artisan commands: `user:promote-admin`, `admin:initialize`, `activities:remove-test`, `activities:import-library`, `activities:generate-thumbnails`, `mail:test`; an `about` section reporting email/enforcement status; PDF page-1 thumbnails (needs Node + `npm install` in `backend/`); Cloudflare Quick Tunnel helper (`scripts/start-tunnel.ps1`, `TUNNEL.md`). Status: FULLY IMPLEMENTED (tunnel NEEDS MANUAL TESTING by someone other than the owner).

### O. Other small features
Password visibility toggles (login, register); Remember me; date-of-birth limits; character counters; duplicate-submit protection on forms; busy/disabled buttons; document titles per page (`useDocumentTitle`); retry buttons on failed loads; 404 for archived/unpublished content to the public.

---

## 4. Role and Permission Comparison (verified in routes/middleware)

| Capability | Guest | Parent – unverified | Parent – verified | Admin |
|---|---|---|---|---|
| Register / Login / Forgot password | Yes | – | – | Login yes; register no |
| Browse published activities, view details, preview/download files | Yes | Yes | Yes | Yes |
| Contact page (contacts, developer team) | View | View | View | View + edit |
| Send site feedback | No | **No (403)** | Yes | No (403) |
| Mark completed / Undo / journal write | No | **No (403)** | Yes | No (403) |
| Read journal history and children list | No | Yes | Yes | No (403) |
| Read progress (`GET /progress`) | No | Yes | Yes | Allowed by the route but returns nothing (admins have no children) |
| Create / edit / delete child | No | **No (403)** | Yes | No |
| Edit profile name/phone | – | Yes | Yes | Yes |
| Change own email | – | **Yes (limited)** | No | No |
| Profile picture / delete own account | – | Yes | Yes | Picture yes; delete refused |
| Verify with code / resend | – | Yes | n/a | – |
| Admin pages and `/api/admin/*` | No (401) | No (403) | No (403) | Yes |
| Create admin / promote / demote / delete accounts | No | No | No | Yes (with guards) |
| Manage activities, contacts, conditions, categories, developer team | No | No | No | Yes |
| Read parents' feedback and journal entries | No | No | No | Yes (read-only; feedback deletable) |

Admin parent-only endpoints are refused by the `role:parent` middleware. Frontend checks (`RequireRole`, sidebar) are only UX; the API enforces everything.

---

## 5. API Endpoint Inventory (`backend/routes/api.php`)

Auth column: **P** public, **A** `auth:sanctum`, **Par** parent role, **Ver** `verified.parent`, **Adm** admin role. Limiter names in `(…)`.

### Authentication and account
| Method | Route | Purpose | Auth | Payload / result |
|---|---|---|---|---|
| POST | /register | Create unverified parent, email code, return token | P (register) | first_name, last_name, email, phone, password(+confirmation) |
| POST | /login | Log in | P (login) | email, password → token, user |
| POST | /logout | Revoke token | A | – |
| GET | /user | Current account + onboarding step + verification state | A | – |
| PUT | /profile | Update name/phone; email only if unverified | A (profile-update) | name, contact_number, email? |
| DELETE | /profile | Delete own account | A (account-delete) | password |
| GET/POST/DELETE | /profile/photo | Read / upload / remove own picture | A (profile-photo on writes) | photo file |
| POST | /profile/password-reset | Email a reset link to own address | A (profile-password-reset) | – |
| POST | /forgot-password | Request reset link | P (forgot-password) | email |
| POST | /reset-password | Complete reset | P (reset-password) | token, email, password(+confirmation) |
| GET | /email/code/status | Code state/expiry | A | → verified, email, code_active, expires_in |
| POST | /email/code/verify | Verify code | A (email-code-verify) | code |
| POST | /email/code/resend | New code (30 s cooldown) | A (email-code-resend) | – |
| POST | /email/verify/{id}/{hash} | Verify via signed link (legacy) | P (email-verify) | signature params |
| POST | /email/verification-notification | Resend link email | A (email-resend) | – |

### Parent features
| Method | Route | Purpose | Auth |
|---|---|---|---|
| GET | /children | List own children | A, Par |
| POST | /children | Create child | A, Par, Ver |
| PUT | /children/{child} | Update child | A, Par, Ver |
| DELETE | /children/{child} | Delete child (refused if it has progress) | A, Par, Ver |
| GET | /progress?child_id= | Progress records of one own child | A |
| POST | /activities/{id}/complete | Mark completed (`child_id`) | A, Par, Ver |
| POST | /progress/{progress}/undo | Undo a completion | A, Par, Ver |
| POST | /progress/{progress}/journal | Save journal (rating, note) | A, Par, Ver (journal) |
| PUT / DELETE | /journal/{entry} | Edit / delete journal | A, Par, Ver (journal) |
| GET | /activities/{id}/journal?child_id= | Journal history | A, Par |
| POST | /feedback | Site feedback (message, rating?) | A, Par, Ver (feedback) |

### Public catalog and content
| Method | Route | Purpose |
|---|---|---|
| GET | /activities, /activities/{id} | Published, non-archived list / details |
| GET | /activities/{activity}/image | Picture of a published activity |
| GET | /activities/{activity}/resources/{resource}/download | Attachment (attachment disposition) |
| GET | /activities/{activity}/resources/{resource}/thumbnail | PDF page-1 JPEG |
| GET | /conditions | Active conditions |
| GET | /contacts, /contacts/{contact}/photo | Professional contacts |
| GET | /developer-team | Developer Team card |

### Admin (`/api/admin/*`, A + Adm)
| Method | Route | Purpose |
|---|---|---|
| GET/POST | /activities | List (`?archived=1` for archived) / create |
| GET/PUT/PATCH/DELETE | /activities/{id} | Show / update / delete (archived only) |
| POST | /activities/{id}/publish, /unpublish, /archive, /restore | State changes |
| GET/POST/DELETE | /activities/{id}/image | Picture (writes blocked when archived) |
| POST | /activities/{id}/resources | Upload attachments (blocked when archived) |
| DELETE | /activities/{id}/resources/{resource} | Remove attachment |
| GET | /activities/{id}/resources/{resource}/download | Admin download (also drafts) |
| GET/POST/PUT/DELETE | /contacts, /contacts/{id} | Contacts CRUD |
| POST/DELETE | /contacts/{id}/photo | Contact photo |
| GET/POST/PUT/PATCH/DELETE | /users, /users/{id} | List / create admin / update name / guarded delete |
| POST | /users/{id}/promote, /demote | Change role |
| GET/POST/PUT | /conditions, /conditions/{id} | Conditions (no delete) |
| GET/POST/PUT/DELETE | /categories | Store always refused (fixed set); update description only; delete refused for the required six |
| GET/PUT | /developer-team | Read / save team card |
| GET | /activity-feedback?page&per_page | Parents' journal entries (read-only, ≤50 per page) |
| GET | /feedback, DELETE /feedback/{id} | View / delete site feedback |

---

## 6. Backend and Database Capabilities

**Tables (migrations):** users (+ photo path, contact number, email verification, role), personal_access_tokens, children, conditions, child_condition, categories, activities (instructions/materials as JSON, difficulty, image path, is_published, archived_at, archived_was_published), activity_condition (+ is_for_all_conditions), activity_progress (status, started_at, completed_at), activity_resources, activity_journal_entries, professional_contacts, feedback, developer_team, cache, jobs.

**Relationships:** User hasOne/hasMany Child; Child belongsToMany Condition, hasMany ActivityProgress; Activity belongsTo Category and creator User, belongsToMany Condition, hasMany ActivityResource and ActivityProgress; ActivityProgress belongsTo Child and Activity; ActivityJournalEntry belongsTo progress, child, activity (FK cascades); Feedback belongsTo User.

**Important operations:** transactional activity purge (removes progress, resources, links, activity; files deleted after commit and only if unshared); archive/restore keeps and restores publication state; lock-protected last-admin/self checks; one-journal-per-child-activity under a child-row lock; role set with `forceFill` (never mass-assigned); picture/attachment paths generated server-side only.

---

## 7. Security and Validation Features
- **Access control:** `auth:sanctum`, `role` and `verified.parent` middleware; scoped route bindings; ownership checks through the caller's own children (another parent's id = 404).
- **Passwords:** hashed; min 8; confirmed; login failure messages identical for known/unknown emails; reset tokens single-use, 60 min; all tokens revoked after reset.
- **Rate limits (own counter each):** login 20/min (+5 failed per 5 min per email+address), register 10, feedback 10, journal 20, profile-photo 10, email-verify 10, email-resend 3, email-code-verify 10, email-code-resend 3 (+30 s cooldown), forgot 5, reset 10, profile-password-reset 5, profile-update 20, account-delete 5, email-change 5/hour. Over the limit → HTTP 429 with a clear message.
- **Uploads:** content sniffing (not client MIME), size and count limits, allow-list, private storage, restricted serving headers.
- **Headers/CSP/CORS:** nosniff, frame deny, referrer policy; CSP meta tag (production build only); CORS allow-list, no credentials; production errors hide details.
- **Validation:** server-side on every write (lengths, formats, enums, uniqueness); matching client-side checks (password length/match, date-of-birth range, rating, message length).

---

## 8. UI/UX and Accessibility Features
Responsive layouts with named breakpoints; collapsing sidebar rail; sticky modal header/footer with blur fades; keyboard: Escape closes modals/dialogs, Tab trapped and focus returned, arrow keys in search; visible focus rings; `aria-label`s on icon buttons and toggles; `role=alert/status` for messages; `aria-pressed` on view switches; screen-reader-only labels; skeleton loading placeholders; empty states and retry buttons; confirmation dialogs; reduced-motion support; per-section error boundary; 404 page. *Accessibility has not been audited with a screen reader or contrast tool — NEEDS MANUAL TESTING.*

---

## 9. Implementation Status Summary

| Status | Items |
|---|---|
| FULLY IMPLEMENTED (code + automated tests) | A1–A16, B1–B4, C1–C3, D1–D4, E1–E3, F1–F3, G1, H1–H2, I1–I4, J1–J8, K, L, N |
| PARTIAL | Conditions on activities/children (stored, do not filter anything); Progress completion rate (not meaningful, see G1); Categories management (descriptions only, by design); email features (code complete, delivery unverified) |
| BACKEND ONLY | Official admin creation, thumbnail generation, library import, `mail:test`, `about` section, legacy verify-link API (the page exists, but new emails don't use it) |
| FRONTEND ONLY | None found |
| PLANNED / NOT IMPLEMENTED | Text search/sort/pagination on the Activities page; admin password reset for other accounts; admin editing of journals; admin-changed emails; recording of `in_progress`; auto-deletion of abandoned unverified sign-ups |
| NEEDS MANUAL TESTING | Everything in a real browser (layouts, hover/glow, modals, PDF preview, mobile), real email delivery, the Cloudflare tunnel by groupmates, accessibility with assistive tech |

---

## 10. Limitations and Outstanding Items
- **Email:** all email features need SMTP configured (Gmail app password in `backend/.env`); until then responses say delivery is not set up. No real email has been confirmed received.
- **Cache:** the code and the pending-email data need a persistent cache store (database), not `array`.
- **Not browser-tested:** UI work from Stages 2–4 and the later journal/verification/modal work has only automated-test verification.
- **Progress statistics:** `in_progress` is never recorded; completion rate and the "Continue" card depend on it.
- **Conditions** are collected but do not influence the catalog.
- **Email changes:** verified emails are locked for everyone, including admins.
- **Abandoned unverified sign-ups** keep their address reserved (recoverable via login/Forgot password).
- **Token storage:** bearer token lives in browser storage (XSS would expose it; CSP reduces the risk). Distributed guessing from many addresses is limited only by per-address limits. Registering with an existing email reveals that it is taken.
- **Thumbnails** need Node and `npm install` in `backend/`.
- **Tunnel sharing:** temporary URLs, single-threaded PHP dev server, shared real database.
- **External dependencies:** Gmail SMTP, Google Fonts, Cloudflare (tunnel only).
- **Admin-only features** are listed in §4. Admin account creation relies on the owner's `.env` password (not in the repository).

---

## 11. Summary — What TheraPlay Can Currently Do

A parent can register, verify their email with a six-digit code, create profiles for one or more children, browse a library of 73 published therapy activities across six categories, filter by category and difficulty, search the site, open an activity to read its objective, instructions and materials, preview or download worksheets, mark an activity completed for a chosen child, undo it, rate the session and keep a note, and follow the child's weekly participation, streak, skills practiced and recent activity. They can manage their own profile and picture, reset a forgotten password by email, send feedback to the team, and see professional contacts and the developer team.

An administrator gets a dashboard with totals, recent uploads, parents' feedback and session feedback, and can create, edit, publish, archive, restore and permanently delete activities with pictures and attachments; manage conditions, categories' descriptions, professional contacts and the developer team card; and create administrators, promote or demote accounts and delete accounts, with safeguards against locking everyone out.

Behind the scenes the system enforces roles and email verification on the server, rate-limits sensitive actions, validates uploads by content, serves files safely, and offers command-line tools for setup and maintenance.
