# Flight Schedule Domain — Algorithm Trace

*Generated: 2026-05-29 | Source: api/flightSchedule/index.js, app.js, config/development.js, api/delays/index.js*

---

## 1. Data Model

### Tables

#### `flight_schedule_rules`
The template layer. Each row represents a repeating flight contract.

| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | Rule identity |
| `recurring` | BOOLEAN | Whether this rule repeats on a schedule |
| `date_start` | INT (unix timestamp) | Contract effective start — start of day UTC |
| `date_end` | INT (unix timestamp) | Contract effective end |
| `airline` | INT FK → airlines.id | Carrier |
| `client` | VARCHAR | Client short name |
| `remarks` | VARCHAR | Free text |
| `flight_number` | VARCHAR | Flight designator |
| `flight_number_out` | INT | Unused — deprecated, always stored as 0 |
| `scheduled_arrival_time` | TIME (HH:MM) | Time-only; no date component |
| `scheduled_departure_time` | TIME (HH:MM) | Time-only; no date component |
| `sta_offset` | INT | Days to add to STA epoch when generating legs (handles overnight arrivals) |
| `arrival_city` | CHAR(3) | IATA code |
| `departure_city` | CHAR(3) | IATA code |
| `monday` – `sunday` | BOOLEAN | Which days of the week this rule fires |
| `ac_type` | INT FK → ac_types.id | Aircraft type |
| `next_leg_pointer` | INT FK → flight_schedule_rules.id | Points to the next rule in a multi-leg chain |

#### `flight_schedule_buffer`
Pre-generated upcoming flights — days 2 through 15 from today (configurable via `flightBufferLength = 14`).

| Column | Type | Notes |
|---|---|---|
| `id` | INT PK AUTO_INCREMENT | Row identity |
| `generated_id` | VARCHAR | `{rule_id}-{day_unix_timestamp}` |
| `date` | INT (unix timestamp) | Start-of-day UTC for this leg instance |
| `airline` | INT FK | |
| `client` | VARCHAR | |
| `remarks` | VARCHAR | |
| `flight_number` | VARCHAR | |
| `scheduled_arrival_time` | INT (unix timestamp) | Absolute epoch: date + time-of-day + sta_offset days |
| `scheduled_departure_time` | INT (unix timestamp) | Absolute epoch: date + time-of-day |
| `arrival_city` | CHAR(3) | |
| `departure_city` | CHAR(3) | |
| `next_leg_pointer` | VARCHAR | `{next_rule_id}-{day_unix_timestamp}` for the same day |
| `ac_type` | INT FK | |
| `flightStatus` | INT | 1 = On Time (default on creation) |
| `estimated_arrival_time` | INT NULL | |
| `actual_arrival_time` | INT NULL | |
| `estimated_departure_time` | INT NULL | |
| `actual_departure_time` | INT NULL | |
| `ac_reg` | VARCHAR NULL | Tail number assigned |
| `gate` | VARCHAR NULL | |
| `pax` | INT NULL | Passenger count |
| `wheelchair_count` | INT NULL | |
| `isSubservice` | BOOLEAN NULL | |
| `lastUpdatedUserId` | INT NULL | |
| `lastUpdatedTimestamp` | INT NULL | |
| `flight_coordinator` | VARCHAR NULL | |
| `pier` | VARCHAR NULL | |
| `lob` | VARCHAR NULL | Left on Board count |
| `rush` | VARCHAR NULL | Rush bags count |
| `inf` | VARCHAR NULL | Infant count |
| `avih` | VARCHAR NULL | Animal in hold count |

#### `flight_schedule_activity`
Materialized legs for today and tomorrow (`flightActivityLength = 2`). Same schema as `flight_schedule_buffer`, with the addition of fields like `flight_coordinator` being actively used.

The distinction from buffer: activity legs are the ones agents operate against in real time. They have already been promoted from the buffer by the nightly cron.

#### `flight_schedule_delays`
One delay record per delay event on a leg. Multiple records allowed per flight leg.

| Column | Type | Notes |
|---|---|---|
| `id` | INT PK | |
| `leg_id` | INT FK → flight_schedule_activity.id | Always points to activity row |
| `min` | INT | Delay minutes |
| `code` | VARCHAR | Delay code (IATA or custom) |
| `at_fault` | VARCHAR | Responsible party |
| `remarks` | VARCHAR NULL | |

#### `delay_codes`
Reference table. Delay codes ordered numerically by `code` column.

| Column | Notes |
|---|---|
| `code` | Stored as VARCHAR (mixed numeric/alpha codes exist) |
| (other columns) | Description, etc. |

### Supporting tables touched by this domain
- `airlines` — referenced by `airline` FK
- `ac_types` — referenced by `ac_type` FK; also has `ac_type_category` used in staffing queries
- `additional_services` — child of flight legs; deleted in cascade when a leg is deleted
- `departments` — read-only by flight schedule for staffing virtualization
- `client_employee_positions_defaults` — read in staffing virtualization
- `employee_positions` — read in staffing virtualization
- `flight_coordinators` — read-only reference

---

## 2. Business Rules

### Point of View (POV) city
All queries are scoped to `POVCity = 'MIA'`. This is a hardcoded module-level constant. A leg appears in results if either its `arrival_city` OR `departure_city` equals the POV city, and its relevant time (STA or STD) falls within the requested window.

### Timeline model — three zones
The system divides time into three zones:

```
|--- ACTIVITY (today + tomorrow) ---|--- BUFFER (days 2–15) ---|--- RULES (day 16+) ---|
```

- **Activity**: Materialized rows in `flight_schedule_activity`. Agents write operational data (actual times, gate, pax, etc.) here.
- **Buffer**: Pre-generated rows in `flight_schedule_buffer` for the upcoming 14 days. Serves read-only previewing. Becomes activity via nightly promotion.
- **Rules**: On-demand virtual generation from `flight_schedule_rules`. No persistent rows exist beyond the buffer window.

`flightActivityLength = 2` (today + tomorrow)
`flightBufferLength = 14`

### generated_id format
The cross-table identifier linking a rule to a specific day:
- In buffer/activity (created by `fillBufferOnRuleCreation`): `{rule_id}-{start_of_day_unix}` e.g. `42-1685491200`
- In rules virtual view (computed in SQL): `{rule_id}-{DATEDIFF_from_rule_start}` — **this is a different format** and is a known inconsistency between how buffer/activity and rules generate their IDs.

### next_leg_pointer
Links one leg to the next in a turnaround chain (e.g. inbound leg 1 → outbound leg 2). Stored as:
- In rules table: `INT` — foreign key to `flight_schedule_rules.id` of the linked rule
- In buffer/activity: `VARCHAR` — `{linked_rule_id}-{day_unix_timestamp}`, computed at generation time

### Flight status values
- `1` = On Time (default at creation)
- Other values exist but are not defined in the server code (managed by front end)

### Rule effective date check
When generating legs, a rule fires on a given day if:
`day_timestamp >= date_start AND day_timestamp <= date_end AND {day_of_week} = true`

The `date_start` and `date_end` in `flight_schedule_rules` are stored as unix timestamps (start of day UTC).

### STA offset
`sta_offset` is an integer number of days to add to the STA. Used for overnight flights where arrival is the next calendar day. Applied as `sta_offset * 86400` added to the STA epoch.

### Reopen window
A user can reopen a flight (reverse a finalization) only if they are the `lastUpdatedUserId` AND the update occurred within the last 24 hours (86400 seconds).

---

## 3. Core Algorithm

### 3a. Creating a rule (`POST /createRule`)

1. Validate JWT. Decode user identity.
2. Insert row into `flight_schedule_rules` with all rule fields. `flight_number_out` is always 0 (deprecated).
3. Get the inserted rule's `insertId`.
4. Write action to log file (`flightActivity` array).
5. Call `fillBufferOnRuleCreation(ruleForm, insertId, ignoreActivity=false)`.
6. Return the insert response.

### 3b. `fillBufferOnRuleCreation(ruleForm, insertId, ignoreActivity)`

This is the core buffer-filling algorithm.

1. Compute `today` = start of day UTC (unix timestamp).
2. Compute `tomorrow` = today + 86400.
3. Set loop index `i`:
   - If `ignoreActivity` is false: `i = 0` (include today and tomorrow in iteration)
   - If `ignoreActivity` is true: `i = flightActivityLength` (start at day 2, skip activity)
4. Acquire a connection from the pool and begin a transaction.
5. **For each day** from `i` to `flightActivityLength + flightBufferLength` (inclusive):
   a. Compute `dayOfForLoop` = today + (i × 86400).
   b. Determine the local timezone offset in hours (using `moment().utcOffset()`).
   c. Determine `dayOfWeek` by formatting `(dayOfForLoop + localOffset_hours × 3600)` as `'dddd'`.
   d. Check if `dayOfForLoop` is within `[date_start, date_end]`. If not, `continue`.
   e. Determine target table:
      - `dayOfForLoop == today OR == tomorrow` → `flight_schedule_activity`
      - Otherwise → `flight_schedule_buffer`
   f. Compute the key `formDayOfWeekKey` (e.g. `'formMonday'`) and check if the rule fires on this day.
   g. If rule fires:
      - Compute STA: `dayOfForLoop + (staHours × 3600) + (staMinutes × 60) + (sta_offset × 86400)`
      - Compute STD: `dayOfForLoop + (stdHours × 3600) + (stdMinutes × 60)`
      - Compute `generated_id`: `{insertId}-{dayOfForLoop}`
      - Compute `next_leg_pointer`: if not null, `{next_leg_pointer}-{dayOfForLoop}`
      - Set `flightStatus = 1` (On Time)
      - Execute INSERT into the target table within the transaction.
6. Commit the transaction.
7. On any error, rollback and rethrow.
8. Always release the connection.

### 3c. Updating a rule (`POST /updateRule`)

1. Validate JWT.
2. Update the row in `flight_schedule_rules`.
3. Delete all buffer rows where `generated_id LIKE '{rule_id}-%'` (does NOT touch activity).
4. Write action to log.
5. Call `fillBufferOnRuleCreation(ruleForm, rule_id, ignoreActivity=true)` — regenerates buffer only, skips today/tomorrow.
6. Return the update response.

### 3d. Querying flights for a time window

Three endpoints serve different purposes:

**`POST /getFlightActivity`** — returns activity-only rows for a time window. Filters by POVCity, optional airline/client. Tags each result `origin: 'activity'`.

**`POST /getFlightBuffer`** — returns buffer-only rows for a time window. Same filtering. Tags `origin: 'buffer'`.

**`POST /getFlightRules`** — virtual generation from rules. Does NOT read buffer or activity. Computes a 3-way UNION: rules projected onto `fromUtc`, `fromUtcMinusOne`, `fromUtcPlusOne`. This is the "look back and forward one day" pattern to catch overnight legs. Each projection:
- Filters `flight_schedule_rules` where STD falls within `[date_start, date_end]` and the day-of-week column is true.
- Computes STA and STD as absolute timestamps.
- Computes `generated_id` as `{rule_id}-{DATEDIFF}`.
- Computes `next_leg_pointer` as `{ptr_rule_id}-{DATEDIFF_accounting_for_both_rule_starts}`.
- Wraps in an outer WHERE to filter by POVCity and the original time window.

**`POST /getFlightDataForStaffing`** — a composite read used by the staffing module. Conditionally builds a UNION ALL of:
1. Always: activity table query.
2. If requested window overlaps buffer zone: buffer table query.
3. If requested window extends beyond buffer: rules virtual projection.

**`POST /virtualizeStaffingCrews`** — same composite flight query as above, plus a LEFT JOIN to `ac_types` to pull `ac_type_name` and `ac_type_category`.

### 3e. Leg operations

**`POST /updateFlightLeg`** — updates a single leg in either activity or buffer (determined by `req.body.origin`). Builds a raw UPDATE string with all mutable fields. No auth middleware guard (commented out — a known gap). Records `lastUpdatedUserId` and `lastUpdatedTimestamp` from the decoded token.

**`POST /createFlightLeg`** — inserts a new leg into `flight_schedule_activity` only. Sets `generated_id = NULL` initially, then runs a second UPDATE to set `generated_id = lastInsertId`. No auth middleware (commented out).

**`POST /deleteFlightLeg`** — deletes a leg using a 3-step transaction:
1. Delete child rows from `additional_services` WHERE `flightId = leg_id`.
2. Delete child rows from `flight_schedule_delays` WHERE `leg_id = leg_id`.
3. Delete the leg itself from `flight_schedule_activity`.
No auth middleware (commented out).

**`POST /canReopenFlight`** — checks if the requesting user is the `lastUpdatedUserId` and the update is within 24 hours. Returns boolean.

### 3f. Delay operations

Both `api/flightSchedule/index.js` and `api/delays/index.js` expose delay endpoints with the same logic (delays module uses different task auth numbers: 37/38 vs 22).

**`GET /getFlightDelays/:id`** — fetches all delays for a given `leg_id`.

**`GET /getDelayCodes`** — fetches all delay codes ordered numerically.

**`POST /createDelay`** — inserts a delay record.

**`POST /updateDelay`** — updates a delay record by `id`.

**`POST /deleteDelay`** — deletes a delay record by `id`.

**`POST /saveFlightDelays`** — accepts `req.body.queryArray`, an array of raw SQL strings sent from the client, and executes each one. **This is a critical SQL injection vulnerability** — raw SQL from the client is executed directly against the database without sanitization or parameterization.

---

## 4. Background Job (Nightly Cron)

Runs at `0 2 * * *` (2:00 AM server local time, which is server timezone — not UTC-enforced).

**Step 1 — Generate the far-buffer day:**
- Computes `dateToGenerate` = start of today UTC + (`flightActivityLength + flightBufferLength`) days.
- Determines `dayOfWeek` for that date (uses local timezone offset).
- Runs a single INSERT INTO `flight_schedule_buffer` from a SELECT on `flight_schedule_rules` where STD would fall within the rule's `[date_start, date_end]` and the correct day-of-week column is true.
- `generated_id` is computed as `CONCAT(id, '-', dateToGenerate)` — this uses the raw dateToGenerate timestamp, **not** a DATEDIFF like the activity/buffer creation path uses. This format diverges from the DATEDIFF-based format used in the rules virtual view.
- `next_leg_pointer` is computed as `CONCAT(next_leg_pointer, '-', dateToGenerate)` — no DATEDIFF offset accounting.

**Step 2 — Promote buffer to activity:**
- Copies all buffer rows WHERE `date <= today + 1 day` into `flight_schedule_activity`.
- Deletes those same rows from `flight_schedule_buffer`.
- The "today + 1" window means both today and tomorrow get promoted simultaneously.

**Note:** The cron does not use a transaction across both steps. If the copy succeeds but the delete fails, rows will exist in both tables.

---

## 5. Edge Cases and Conditional Logic

### Filter handling
`airline` and `client` filters use string value `-1` to mean "all". The filter logic uses `this.airlineFilter` (module-level `this` in a route handler — in Node.js this refers to the module's `this` context, not a local variable, meaning filters can bleed between concurrent requests). This is a concurrency bug.

### Rule virtual view — day boundary overlap
The `getFlightRules` query projects onto three consecutive days (today, yesterday, tomorrow) to catch legs whose STA or STD crosses midnight UTC. Only the outer WHERE filters to the actual requested window. This is correct logic but results in 3× the database work per query.

### STA empty string handling
If `formScheduled_arrival_time` is empty string, STA is stored as `NULL`. STD has no equivalent null check — a missing STD would produce incorrect arithmetic.

### Buffer update on rule edit
When a rule is updated, only buffer rows are regenerated (`ignoreActivity = true`). Activity rows for today/tomorrow are NOT updated. Any operational changes to a rule do not retroactively affect the current day's flight data.

### Auth bypass on leg mutations
`updateFlightLeg`, `createFlightLeg`, and `deleteFlightLeg` have `auth.authenticateRequest(22)` commented out. Only JWT validity (not permission) is checked.

---

## 6. Timezone and Time Handling

All timestamps in `flight_schedule_rules` (`date_start`, `date_end`) and in buffer/activity (`date`, `scheduled_arrival_time`, `scheduled_departure_time`, etc.) are **unix timestamps in UTC**.

`scheduled_arrival_time` and `scheduled_departure_time` in the rules table are stored as MySQL **TIME type** (`HH:MM`), not timestamps. They represent the scheduled clock time of the flight, without a date.

When generating buffer legs, the server uses `moment().utcOffset()` to compute the local timezone offset. This means the day-of-week calculation is server-local (EST/EDT), not UTC. If the server's timezone is EST (-5), a flight scheduled at 23:00 UTC on Monday may be treated as Tuesday local. This is intentional but undocumented.

The cron fires at `0 2 * * *` in server local time. The "2 AM" was presumably chosen to be a quiet period in Eastern Time (approximately 7 AM UTC).

The `getFlightDataForStaffing` endpoint accepts `isRequestLocal` boolean; when true, `endOfToday` is computed as `moment().endOf('day').unix()` (server local), otherwise UTC.

---

## 7. Dependencies

This domain reads from:
- `airlines` (for display/filtering)
- `ac_types` (including `ac_type_category` for staffing)
- `airports` (not in this domain; referenced by IATA code strings only)
- `departments` (read-only for staffing virtualization)
- `client_employee_positions_defaults` (referenced in staffing, unimplemented)
- `employee_positions` (referenced in staffing, unimplemented)
- `flight_coordinators` (read-only reference in config queries)

This domain writes to:
- `flight_schedule_rules`
- `flight_schedule_buffer`
- `flight_schedule_activity`
- `flight_schedule_delays`
- `additional_services` (only to delete, cascading from leg delete)
- JSON log file (via `logger.writeToLogFile`)

---

## 8. Known Fragility

1. **`saveFlightDelays` SQL injection**: The endpoint accepts `queryArray` — an array of raw SQL strings from the client — and executes them directly. No parameterization. Any authenticated user with task 22 or 38 can execute arbitrary SQL.

2. **Concurrent filter bleed**: `this.airlineFilter` and `this.clientFilter` are assigned to the module-level `this`, not to local variables. Under concurrent requests, one request's filter can overwrite another's mid-execution.

3. **Auth bypass on leg mutations**: `updateFlightLeg`, `createFlightLeg`, `deleteFlightLeg` lack the `auth.authenticateRequest()` middleware.

4. **`generated_id` format inconsistency**: Buffer/activity use `{rule_id}-{day_unix_timestamp}` (absolute epoch). Rules virtual view uses `{rule_id}-{DATEDIFF_from_rule_start}` (relative offset). Cron also uses absolute epoch. The client must understand which format to expect from which source.

5. **No cron transaction**: The two steps (generate new buffer day, promote buffer to activity) are not wrapped in a transaction. A failure between them leaves the database in an inconsistent state.

6. **Hardcoded POV city**: `POVCity = 'MIA'` is a module-level constant. The system cannot serve any other station without a code change.

7. **Hardcoded DB credentials**: `app.js` contains the database password in plaintext.

8. **Day-of-week computed with server local time**: The buffer fill and cron both use `moment().utcOffset()` on the server to determine which day of week a UTC timestamp falls on. This is correct for Eastern Time stations but is not documented or configurable.

9. **`createFlightLeg` two-query pattern**: Inserts a null `generated_id`, then updates it to `LAST_INSERT_ID()`. These two queries are not in a transaction; a crash between them leaves a row with a null `generated_id`.

10. **`checkPermutation` stub**: The function at line 2219 is an empty stub — staffing crew virtualization logic is incomplete.
