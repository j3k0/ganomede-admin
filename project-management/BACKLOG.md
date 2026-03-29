# Admin Panel UX Backlog

Improvement backlog for the ganomede-admin support agent experience.
Sourced from a full frontend + backend UX review (2026-03-29).

Legend: `[S]` small, `[M]` medium, `[L]` large effort.
Scope: `admin` = ganomede-admin only, `upstream` = also needs triominos-server changes.

---

## Critical

### 1. Clickable search results `[S]` `upstream`
When a query matches multiple users, agents see raw IDs and must
re-search manually. Search results should be direct links to user
profiles with enough context (display name, creation date) to
disambiguate without clicking through each one.

The basic click-to-navigate is admin-only, but showing metadata
(display name, creation date) in results requires the directory service
to surface those fields — currently it only returns `{ id, aliases }`.

**Admin files:** `web/js/users.jsx` (SearchResults, lines 194-232),
`src/server/routes/users.ts` (lines 63-84)
**Upstream:** `triominos-server/src/directory/users/Profile.ts` — expose
creation date from alias documents; consider surfacing display name from
usermeta.

### 2. Surface partial service failures in profile view `[M]` `admin`
Profile assembly uses `Promise.allSettled` across 6 upstream services
but silently falls back on failure. Agents can't tell whether data is
missing because the user has none or because a service is down. The API
should include a `_warnings` array listing unavailable services, and the
frontend should display a banner when data is incomplete.

**Files:** `src/server/routes/users.ts` (lines 132-208),
`web/js/users.jsx` (Profile component, lines 490-597)

### 3. Paginate transaction history `[M]` `admin`
Transactions are fetched with `limit: 100000` in a single payload. This
causes slow loads and browser lag for active users. The virtualcurrency
service already supports `limit` and `before` (cursor) query params —
the admin panel just needs to use them with a sensible default (e.g. 50
per page) and add a "load more" control.

**Files:** `src/server/routes/users.ts` (line 151),
`server/users/helpers.js` (line 25),
`web/js/users.jsx` (TransactionsGrouped, lines 71-127)

### 4. Add audit trail for admin actions `[L]` `upstream`
Ban, unban, reward, and password-reset actions are fire-and-forget. No
record of which agent performed the action, when, or why. No audit or
logging service exists in triominos-server today — this would need to be
built from scratch (new service or CouchDB-backed log), plus a read-only
timeline in the admin panel's profile view.

**Admin files:** all action endpoints in `src/server/routes/users.ts`,
`server/users/helpers.js`
**Upstream:** new audit service needed.

---

## High

### 5. Require a reason for rewards `[S]` `upstream`
The reward endpoint accepts only `amount` and `currency`. The
virtualcurrency service hardcodes `reason: 'reward'` in the transaction
document. The upstream endpoint needs to accept an optional reason/note
parameter, and the admin panel needs a text field for it.

**Admin files:** `src/server/routes/users.ts` (rewardSchema, lines
273-296), `web/js/users.jsx` (Award component)
**Upstream:** `triominos-server/src/virtualcurrency/db/transaction.ts` —
accept and store a reason/note field on reward transactions.

### 6. Improve password-reset UX `[S]` `admin`
The generated password is shown in a SweetAlert modal with no copy
button. Add a click-to-copy button and a visibility toggle. Also confirm
which user is being reset in the modal title.

**Files:** `web/js/users.jsx` (lines 759-813)

### 7. Simplify email-sending workflow `[M]` `admin`
Sending an email is a 4-step modal sequence (template > locale > preview
> send). Collapse into an inline form: pick template + locale in one
step, preview inline, send with one click.

**Files:** `web/js/users.jsx` (lines 599-756)

### 8. Add autocomplete and conversation list to chat viewer `[M]` `upstream`
Chat requires typing two exact usernames. Autocomplete needs the
directory service to support prefix/fuzzy search (currently exact-match
only). Listing conversations for a user isn't supported by the chat
service at all — no endpoint exists and rooms aren't indexed by
participant.

Client-side keyword search within already-loaded messages and date
separators are admin-only changes.

**Admin files:** `web/js/chatRoom.jsx`, `web/css/chat-room.css`,
`src/server/routes/users.ts` (lines 112-130)
**Upstream:** `triominos-server/src/directory/` — add prefix search
endpoint. `triominos-server/src/chat/` — add room-listing-by-user
endpoint + Redis index.

### 9. Human-readable error messages `[S]` `admin`
Errors are displayed as raw JSON or stack traces. Map common upstream
failures to short, actionable messages (e.g. "User service unavailable
-- try again in a moment") and keep the raw detail in a collapsible
section for debugging.

**Files:** `web/js/components/Loader.jsx`,
`src/server/errors.ts` (lines 30-68)

### 10. Make reports view actionable `[M]` `upstream`
The reported-users table shows username and count but no link to the
user profile, no report reasons, no date, no ban-status indicator, and
no sorting or filtering. Inline links and sorting are admin-only, but
report reasons aren't stored upstream — only the action type "REPORTED"
is recorded, with no reason text. Timestamps are available.

**Admin files:** `web/js/reportedUsers.jsx`,
`src/server/routes/users.ts` (lines 103-110)
**Upstream:** `triominos-server/src/blocked-users/` — add reason field
to REPORTED events.

---

## Medium

### 11. Make rewards idempotent `[S]` `upstream`
Double-clicking the reward button awards twice. The virtualcurrency
service has no idempotency support — every POST creates a new
transaction. Needs `Idempotency-Key` header support upstream (Redis or
in-memory dedup), plus the admin panel sending a generated key per
request.

**Admin files:** `src/server/routes/users.ts` (lines 278-296)
**Upstream:** `triominos-server/src/virtualcurrency/` — add idempotency
key handling.

### 12. Serve avatar as URL instead of base64 `[S]` `admin`
Avatar is fetched as PNG, base64-encoded, and inlined in the profile
JSON response (~33% bloat). Return a proxy URL from the admin API and
let the frontend `<img>` tag fetch it with browser caching.

**Files:** `src/server/routes/users.ts` (lines 160-165, 189-193),
`server/users/helpers.js` (lines 29-39)

### 13. Per-service timeout configuration `[S]` `admin`
All upstream requests share a single 30 s timeout. A slow avatar service
blocks the entire profile load. Allow per-service timeout overrides.

**Files:** `src/server/config.ts` (line 37)

### 14. Collapsible profile sections `[M]` `admin`
Profile data is laid out in one long vertical scroll. Group into
collapsible sections (identity, balance & transactions, metadata, admin
actions, reports & blocks) so agents can jump to what they need.

**Files:** `web/js/users.jsx` (Profile component, lines 490-597)

### 15. JSON editor validation and formatting `[S]` `admin`
The CodeMirror JSON editor has no real-time validation, no "format"
button, and no diff view. Add JSON lint on keystroke and a pretty-print
shortcut so non-technical agents don't accidentally save broken
documents.

**Files:** `web/js/components/JsonEditor.jsx`

### 16. Paginate chat history `[M]` `upstream`
Chat returns the full conversation in one response. The chat service has
no pagination support — `fetchMessages` returns all messages with no
limit parameter. Needs `limit`/`offset` query param support in the
upstream API, plus a "load earlier" button in the frontend.

**Admin files:** `src/server/routes/users.ts` (lines 112-130),
`web/js/chatRoom.jsx`
**Upstream:** `triominos-server/src/chat/api.ts`,
`triominos-server/src/chat/room-manager.ts` — add paginated message
retrieval.

### 17. Loading-state indicators `[S]` `admin`
Loading states just say "Loading..." with no context. Show what is being
loaded ("Loading transactions...") and add a spinner or progress bar.

**Files:** `web/js/components/Loader.jsx`

---

## Low / Nice-to-Have

### 18. Support-agent dashboard `[L]` `admin`
No landing page showing work to do. Build a dashboard with: number of
open reports, recently viewed users, and quick-action shortcuts.

### 19. Bulk operations `[L]` `upstream`
Can't ban, reward, or email multiple users at once. No batch endpoints
exist upstream (except for data/metadata bulk upsert). Would need batch
ban, reward, and email endpoints in triominos-server, plus multi-select
UI in the admin panel.

### 20. User activity timeline `[L]` `upstream`
Account activity (logins, purchases, bans, emails sent) is scattered
across profile sections. Login/session history isn't tracked by any
upstream service today. Would need login event tracking plus a unified
timeline component.

### 21. Search history and recent users `[S]` `admin`
No memory of past lookups. Store recent searches in localStorage and
show them on the search page.

### 22. Data export to CSV `[M]` `admin`
No way to export transaction history or reported-users lists for
management reporting.

### 23. Modernize CSS framework `[L]` `admin`
Still on Bootstrap 3 (2013). Migrate to a current framework for better
components, accessibility, and responsive support.

### 24. Accessibility pass `[M]` `admin`
No ARIA labels, missing keyboard focus states, color-only status
indicators. Run an a11y audit and fix the basics.

### 25. Document deletion safeguard `[S]` `admin`
Data document delete is a single SweetAlert confirm. Add a "type DELETE
to confirm" gate and consider soft-delete.
