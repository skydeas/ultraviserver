# Flight Schedule Domain — Rebuild Plan

*Generated: 2026-05-29 | Algorithm reference: docs/trace-flight-schedule-algorithm.md*

This plan follows the domain-driven layout and coding rules from CLAUDE.md. The rebuild targets the same functional behavior but corrects structural fragility, security issues, and the concurrency bug identified in the trace.

---

## Phase 1 — Schema

### Tables

#### `flight_schedule_rules`

```sql
CREATE TABLE flight_schedule_rules (
    id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
    recurring      TINYINT(1)   NOT NULL DEFAULT 1,
    date_start     INT UNSIGNED NOT NULL,              -- unix timestamp, start of day UTC
    date_end       INT UNSIGNED NOT NULL,              -- unix timestamp
    airline        INT UNSIGNED NOT NULL,              -- FK → airlines.id
    client         VARCHAR(64)  NOT NULL,
    remarks        VARCHAR(255),
    flight_number  VARCHAR(16)  NOT NULL,
    scheduled_arrival_time   TIME,                    -- HH:MM, nullable for departure-only legs
    scheduled_departure_time TIME NOT NULL,
    sta_offset     TINYINT      NOT NULL DEFAULT 0,   -- days; handles overnight arrivals
    arrival_city   CHAR(3)      NOT NULL,
    departure_city CHAR(3)      NOT NULL,
    monday         TINYINT(1)   NOT NULL DEFAULT 0,
    tuesday        TINYINT(1)   NOT NULL DEFAULT 0,
    wednesday      TINYINT(1)   NOT NULL DEFAULT 0,
    thursday       TINYINT(1)   NOT NULL DEFAULT 0,
    friday         TINYINT(1)   NOT NULL DEFAULT 0,
    saturday       TINYINT(1)   NOT NULL DEFAULT 0,
    sunday         TINYINT(1)   NOT NULL DEFAULT 0,
    ac_type        INT UNSIGNED NOT NULL,              -- FK → ac_types.id
    next_leg_pointer INT UNSIGNED,                     -- FK → flight_schedule_rules.id
    PRIMARY KEY (id),
    KEY idx_rules_date_range (date_start, date_end),
    KEY idx_rules_airline (airline),
    CONSTRAINT fk_rules_airline FOREIGN KEY (airline) REFERENCES airlines(id),
    CONSTRAINT fk_rules_ac_type FOREIGN KEY (ac_type) REFERENCES ac_types(id),
    CONSTRAINT fk_rules_next_leg FOREIGN KEY (next_leg_pointer) REFERENCES flight_schedule_rules(id)
) ENGINE=InnoDB;
```

**Changes from original:**
- Removed `flight_number_out` — confirmed deprecated (always 0).
- `scheduled_arrival_time` made nullable (departure-only legs).
- Added explicit FK constraints (originals had none).

---

#### Shared leg columns (applied to both buffer and activity)

Both tables share this column set. Define once here to avoid duplication in documentation.

```
id                       INT UNSIGNED NOT NULL AUTO_INCREMENT
generated_id             VARCHAR(64)  NOT NULL  -- '{rule_id}-{day_epoch}'
date                     INT UNSIGNED NOT NULL  -- start-of-day UTC unix timestamp
airline                  INT UNSIGNED NOT NULL
client                   VARCHAR(64)  NOT NULL
flight_number            VARCHAR(16)  NOT NULL
scheduled_arrival_time   INT UNSIGNED           -- absolute unix timestamp, nullable
scheduled_departure_time INT UNSIGNED NOT NULL
estimated_arrival_time   INT UNSIGNED
actual_arrival_time      INT UNSIGNED
estimated_departure_time INT UNSIGNED
actual_departure_time    INT UNSIGNED
arrival_city             CHAR(3)      NOT NULL
departure_city           CHAR(3)      NOT NULL
next_leg_pointer         VARCHAR(64)            -- '{rule_id}-{day_epoch}', nullable
ac_type                  INT UNSIGNED NOT NULL
ac_reg                   VARCHAR(16)            -- tail number, nullable
gate                     VARCHAR(8)
pax                      SMALLINT UNSIGNED
wheelchair_count         SMALLINT UNSIGNED
isSubservice             TINYINT(1)   DEFAULT 0
flightStatus             TINYINT      NOT NULL DEFAULT 1  -- 1=On Time
remarks                  VARCHAR(255)
lastUpdatedUserId        INT UNSIGNED
lastUpdatedTimestamp     INT UNSIGNED
flight_coordinator       VARCHAR(64)
pier                     VARCHAR(8)
lob                      SMALLINT UNSIGNED  -- Left on Board
rush                     SMALLINT UNSIGNED  -- Rush bags
inf                      SMALLINT UNSIGNED  -- Infants
avih                     SMALLINT UNSIGNED  -- Animals in hold
```

#### `flight_schedule_buffer`

```sql
CREATE TABLE flight_schedule_buffer (
    /* shared leg columns above */
    PRIMARY KEY (id),
    UNIQUE KEY uq_buffer_generated_id (generated_id),
    KEY idx_buffer_arrival  (arrival_city,  scheduled_arrival_time),
    KEY idx_buffer_departure (departure_city, scheduled_departure_time),
    KEY idx_buffer_date (date)
) ENGINE=InnoDB;
```

#### `flight_schedule_activity`

```sql
CREATE TABLE flight_schedule_activity (
    /* shared leg columns above */
    PRIMARY KEY (id),
    KEY idx_activity_arrival   (arrival_city,  scheduled_arrival_time),
    KEY idx_activity_departure (departure_city, scheduled_departure_time),
    KEY idx_activity_date (date),
    KEY idx_activity_gen_id (generated_id)
) ENGINE=InnoDB;
```

**Notes:**
- Activity does not need `UNIQUE` on `generated_id` — manually created legs (no rule) use `id` as `generated_id`.
- Both tables need composite indexes on `(city, time)` — the primary query pattern in all read paths.

#### `flight_schedule_delays`

```sql
CREATE TABLE flight_schedule_delays (
    id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
    leg_id   INT UNSIGNED NOT NULL,
    min      SMALLINT     NOT NULL,           -- delay minutes
    code     VARCHAR(8)   NOT NULL,
    at_fault VARCHAR(64),
    remarks  VARCHAR(255),
    PRIMARY KEY (id),
    KEY idx_delays_leg_id (leg_id),
    CONSTRAINT fk_delays_leg FOREIGN KEY (leg_id) REFERENCES flight_schedule_activity(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

**Changes from original:**
- Added `ON DELETE CASCADE` — the original delete-leg flow does a manual 3-step cascade; the FK cascade makes it atomic and removes the need for the manual transaction.

#### `delay_codes` (unchanged)

Reference table — no structural changes needed.

---

**Prerequisites before migrating:** Backup existing data. Verify `flight_schedule_rules.flight_number_out` is unused before dropping it.

**Definition of done:** All four tables exist. Indexes confirmed via `SHOW INDEX`. FK constraints verified. Existing data migrated.

---

## Phase 2 — Domain Module Structure

```
api/
└── flightSchedule/
    ├── MODULE.md
    ├── index.js          (router — thin HTTP layer)
    ├── service.js        (business logic)
    └── repository.js     (all SQL queries)
```

Also create:
```
api/delays/
├── MODULE.md
├── index.js          (router)
├── service.js
└── repository.js
```

> **Open question:** Should `delays` remain a separate Express router at `/api/delays`, or should it be fully absorbed into `flightSchedule`? Currently both `/api/flightSchedule` and `/api/delays` expose overlapping delay endpoints with different auth task numbers (22 vs 37/38). Recommend consolidating into `flightSchedule` with a single permission set. **Needs decision before building.**

### MODULE.md for `flightSchedule`

```markdown
# Module: flightSchedule

Owns the full lifecycle of flight legs — from schedule rules through buffer generation to operational activity.

## Owns
- Tables: flight_schedule_rules, flight_schedule_buffer, flight_schedule_activity, flight_schedule_delays
- Concepts: rules, buffer, activity, leg, delay, POV city filtering, buffer promotion

## Exposes
None. This domain is consumed only via HTTP routes.

## Depends on
- airlines (read-only, FK)
- ac_types (read-only, FK including ac_type_category)
- additional_services (write-only: delete cascade on leg delete)
- departments, employee_positions, client_employee_positions_defaults (read-only, staffing)
```

---

## Phase 3 — Repository Functions

All SQL goes here. No SQL in service or routes. Functions are parameterized (no string interpolation for user values).

**Prerequisites:** Tables exist. DB connection pool is available.

| Function | Inputs | Outputs | Query |
|---|---|---|---|
| `getRules()` | — | Rule[] | SELECT * FROM flight_schedule_rules |
| `createRule(fields)` | rule fields object | insertId | INSERT INTO flight_schedule_rules |
| `updateRule(id, fields)` | id, fields object | affectedRows | UPDATE flight_schedule_rules |
| `insertLeg(table, fields)` | 'buffer'\|'activity', leg fields | insertId | INSERT INTO target table |
| `deleteBufferByRuleId(ruleId)` | ruleId | affectedRows | DELETE WHERE generated_id LIKE '{ruleId}-%' |
| `getActivity(from, until, airlineId, clientId)` | timestamps + optional filters | Leg[] | SELECT from activity WHERE city + time window |
| `getBuffer(from, until, airlineId, clientId)` | timestamps + optional filters | Leg[] | SELECT from buffer WHERE city + time window |
| `getRulesForDate(fromUtc, dayOfWeek)` | UTC start-of-day epoch, day name | VirtualLeg[] | Rules virtual projection query |
| `updateLeg(table, id, fields)` | 'buffer'\|'activity', id, fields | affectedRows | UPDATE target table — parameterized |
| `createActivityLeg(fields)` | leg fields | insertId | INSERT + UPDATE generated_id in transaction |
| `deleteLeg(id)` | id | — | Transaction: delete delays, delete activity leg |
| `getDelaysByLegId(legId)` | legId | Delay[] | SELECT from flight_schedule_delays |
| `getDelayCodes()` | — | Code[] | SELECT from delay_codes ORDER BY CAST(code AS UNSIGNED) |
| `createDelay(fields)` | delay fields | insertId | INSERT into flight_schedule_delays |
| `updateDelay(id, fields)` | id, fields | affectedRows | UPDATE flight_schedule_delays |
| `deleteDelay(id)` | id | affectedRows | DELETE from flight_schedule_delays |
| `getFlightDataForStaffing(startTs, endTs, bufferEnd, rulesStart, dayOfWeek, filters)` | timestamps, day info, filters | Leg[] | Conditional UNION ALL (activity + buffer + rules) |
| `getDepartments()` | — | Department[] | SELECT from departments |
| `insertBufferFromRules(dateToGenerate, dayOfWeek)` | epoch, day name | affectedRows | Cron INSERT query |
| `promoteBufferToActivity(upToDate)` | epoch | — | Transaction: INSERT INTO activity + DELETE FROM buffer |

**Definition of done:** Every function runs against a local DB without error. No raw user values interpolated into SQL strings.

---

## Phase 4 — Service Functions

Business logic layer. No SQL. No HTTP objects. Calls repository functions only.

| Function | Inputs | Logic | Returns |
|---|---|---|---|
| `getRules()` | — | Calls repository.getRules | Rule[] |
| `createRule(ruleForm, userId)` | parsed form, user id | Validate fields, call createRule, call fillBuffer(ruleId, form, false), log | {rule, insertId} |
| `updateRule(ruleId, ruleForm, userId)` | id, form, user | Validate, updateRule, deleteBufferByRuleId, fillBuffer(ruleId, form, true), log | affectedRows |
| `fillBuffer(ruleId, ruleForm, ignoreActivity)` | rule id, form object, boolean | Loop over days 0–16 (or 2–16), compute day epoch, check date range, check day-of-week, compute STA/STD epochs, insert into correct table in a single transaction | void |
| `getFlightActivity(from, until, filters)` | timestamps, filter object | Calls repository, tags each result `origin: 'activity'` | Leg[] |
| `getFlightBuffer(from, until, filters)` | timestamps, filter object | Calls repository, tags `origin: 'buffer'` | Leg[] |
| `getFlightRules(from, until, filters)` | timestamps, filter object | Calls repository with day-before and day-after projections, tags `origin: 'rules'` | VirtualLeg[] |
| `updateFlightLeg(legId, origin, fields, userId)` | id, table, fields, user | Validate origin is 'activity' or 'buffer', set lastUpdatedUserId + lastUpdatedTimestamp, call repository | affectedRows |
| `createFlightLeg(fields, userId)` | leg fields, user id | Insert into activity with null generated_id, update generated_id = insertId — in a single transaction | insertId |
| `deleteFlightLeg(legId, userId)` | id | Call repository.deleteLeg (FK cascade handles delays) | void |
| `canReopenFlight(lastUpdatedUserId, lastUpdatedTimestamp, requestingUserId)` | three values | userId match AND timestamp within 86400 | boolean |
| `getDelaysByLegId(legId)` | legId | repository call | Delay[] |
| `getDelayCodes()` | — | repository call | Code[] |
| `createDelay(fields, userId)` | delay fields, user | validate, insert, log | insertId |
| `updateDelay(id, fields, userId)` | id, fields, user | validate, update, log | affectedRows |
| `deleteDelay(id, userId)` | id, user | delete, log | void |
| `getFlightDataForStaffing(startTs, endTs, isLocal, filters)` | params | Determine buffer/rules zone boundaries, call repository with correct UNION strategy | Leg[] with ac_type_category |
| `virtualizeStaffingCrews(startTs, endTs, isLocal, filters)` | params | Same as above, includes ac_type join | Leg[] with ac_type fields |
| `getDepartments()` | — | repository call | Department[] |
| `runNightlyPromotion()` | — | Call insertBufferFromRules for the +16 day, then call promoteBufferToActivity in a transaction | void |

**Open questions before building:**
- What are the valid `flightStatus` integer values and their labels? (Only `1 = On Time` is used server-side; the rest are front-end managed.)
- Should `fillBuffer` use UTC for day-of-week calculation, or continue using server local time? Current behavior: server local. Recommend UTC-explicit with a configurable station offset.
- `saveFlightDelays` (raw SQL from client) — this should be removed entirely. Confirm no front-end feature depends on it that cannot be served by the individual create/update/delete endpoints.

**Definition of done:** Unit tests covering `fillBuffer` loop logic (day range boundary, day-of-week match, STA/STD epoch computation, ignoreActivity flag). All other functions covered by integration tests.

---

## Phase 5 — Route Handlers

Thin wrappers. JWT verification and permission check happen in `auth.authenticateRequest(taskId)` middleware. Routes call one service function each.

**Auth task ID mapping (from current code):**
- Task 20 = manage flight schedule rules
- Task 22 = view / edit flight schedule
- Task 37 = view delays (delays module)
- Task 38 = create/edit delays (delays module)

**Recommendation:** Consolidate delays auth into flight schedule task permissions. Simplify to two tasks: view (22) and manage (20).

| Method | Path | Auth Task | Service Call | Request Shape | Response Shape |
|---|---|---|---|---|---|
| GET | `/getRules` | 20 | `getRules()` | — | Rule[] |
| POST | `/createRule` | 20 | `createRule(form, userId)` | multipart form | {insertId} |
| POST | `/updateRule` | 20 | `updateRule(id, form, userId)` | multipart form | {affectedRows} |
| POST | `/getFlightActivity` | 22 | `getFlightActivity(from, until, filters)` | `{from, until, airline, client}` | Leg[] |
| POST | `/getFlightBuffer` | 22 | `getFlightBuffer(from, until, filters)` | `{from, until, airline, client}` | Leg[] |
| POST | `/getFlightRules` | 22 | `getFlightRules(from, until, filters)` | `{from, until, airline, client}` | VirtualLeg[] |
| GET | `/getFlightDelays/:id` | 22 | `getDelaysByLegId(id)` | path param | Delay[] |
| GET | `/getDelayCodes` | 22 | `getDelayCodes()` | — | Code[] |
| POST | `/createDelay` | 22 | `createDelay(fields, userId)` | multipart form | {insertId} |
| POST | `/updateDelay` | 22 | `updateDelay(id, fields, userId)` | multipart form | {affectedRows} |
| POST | `/deleteDelay` | 22 | `deleteDelay(id, userId)` | `{delayId}` | {success} |
| POST | `/updateFlightLeg` | 22 | `updateFlightLeg(id, origin, fields, userId)` | multipart form | {affectedRows} |
| POST | `/createFlightLeg` | 22 | `createFlightLeg(fields, userId)` | multipart form | {insertId} |
| POST | `/deleteFlightLeg` | 22 | `deleteFlightLeg(id, userId)` | `{id}` | {success} |
| POST | `/canReopenFlight` | 22 | `canReopenFlight(lastUserId, lastTs, reqUserId)` | `{lastUpdatedUserId, lastUpdatedTimestamp}` | boolean |
| POST | `/getFlightDataForStaffing` | 22 | `getFlightDataForStaffing(...)` | `{startTimestamp, endTimestamp, isRequestLocal, airlineSearchQuery, clientSearchQuery}` | Leg[] |
| POST | `/virtualizeStaffingCrews` | 22 | `virtualizeStaffingCrews(...)` | same as above + department | Leg[] with ac_type fields |
| GET | `/getDepartments` | 22 | `getDepartments()` | — | Department[] |

**Endpoints to remove:**
- `POST /saveFlightDelays` — raw SQL injection vector, no safe rebuild path. Remove entirely.

**Endpoints with missing auth to add back:**
- `updateFlightLeg`, `createFlightLeg`, `deleteFlightLeg` — all need `auth.authenticateRequest(22)`.

**Definition of done:** All routes return correct shapes on happy path. Auth middleware verified — unauthenticated requests return 401, unauthorized requests return 403. Leg mutation routes have auth restored.

---

## Phase 6 — Background Job (Nightly Cron)

### Current behavior
Runs at `0 2 * * *` server local time. Two steps:
1. Generate the N+16 buffer day from rules.
2. Promote today and tomorrow from buffer to activity (copy + delete).

### Rebuild

Extract to `service.runNightlyPromotion()`. Keep the cron trigger in `app.js`.

```javascript
cron.schedule('0 2 * * *', async () => {
    try {
        await flightScheduleService.runNightlyPromotion();
    } catch (err) {
        console.error('Nightly cron failed:', err);
        // TODO: alert (email/webhook) on cron failure
    }
});
```

### Idempotency
The current cron is NOT idempotent. If it runs twice:
- Step 1 will try to INSERT rows with duplicate `generated_id` values (may fail with duplicate key, or silently insert duplicates if no unique constraint).
- Step 2 will promote already-promoted rows again (duplicate activity rows).

**Fix:**
- Add `UNIQUE KEY uq_buffer_generated_id (generated_id)` to `flight_schedule_buffer` (included in Phase 1 schema).
- Step 1: Use `INSERT IGNORE` or `ON DUPLICATE KEY UPDATE` to be re-run safe.
- Step 2: Wrap in a transaction. Check that buffer rows being promoted do not already exist in activity before copying.

### generated_id format — cron vs fillBuffer
The cron uses `CONCAT(id, '-', dateToGenerate)` where `dateToGenerate` is the epoch timestamp. `fillBufferOnRuleCreation` also uses `{insertId}-{dayOfForLoop}` epoch. These match. The mismatch is only in the rules virtual view which uses DATEDIFF. The cron format is correct and consistent with buffer/activity.

### Error handling
The current cron throws on error, which crashes the query callback but does not affect the server. Rebuild with try/catch and alerting.

**Definition of done:** Cron runs in isolation. Running it twice on the same day produces the same database state as running it once. Failures are logged and (ideally) alerted.

---

## Open Questions

Count: **4**

1. **Delay auth consolidation**: Keep tasks 37/38 in a separate delays module, or absorb into tasks 20/22 in flightSchedule? Current split creates duplicate endpoints and inconsistent auth. Recommend absorb.

2. **flightStatus values**: What integers beyond `1 = On Time` exist? Need a complete enumeration to define the column properly and potentially add a CHECK constraint.

3. **Day-of-week timezone**: Should day-of-week calculation during buffer fill use the server's local timezone (current behavior) or UTC? For a Miami operation this is not likely to matter, but for portability it should be explicit. Recommend adding a `STATION_TIMEZONE` config value and using it explicitly rather than relying on `moment().utcOffset()`.

4. **POV city**: Is `POVCity = 'MIA'` always correct, or does the system need to support multiple stations? If single-station, promote to named config constant. If multi-station, routes need a `station` parameter and all queries need to become parameterized on city.
