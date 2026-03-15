# Match Database Verification Queries

Pre- and post-condition SQL queries for validating game integrity in the
`matches` table. All queries use PostgreSQL JSONB operators against columns
that are populated by `MatchRepository.saveMatch`.

**Column reference:**

| Column | Type | Contents |
|---|---|---|
| `id` | uuid | Match ID |
| `status` | text | `pending` / `active` / `completed` / `cancelled` |
| `transaction_log` | jsonb | `TransactionLogEntry[]` — full engine audit trail |
| `action_history` | jsonb | `Action[]` — raw client actions |
| `state` | jsonb | Latest `GameState` snapshot |
| `outcome` | jsonb | `{ winnerIndex, victoryType, turnNumber }` or null |

---

## Pre-conditions — active matches

These should return **0 rows**. Any row is a data integrity violation.

```sql
-- P1: Every active match has at least a system:init entry in the log.
--     A match with an empty log was never properly started.
SELECT id
FROM matches
WHERE status = 'active'
  AND jsonb_array_length(transaction_log) = 0;

-- P2: The first log entry is always system:init.
--     Any other action type as entry 0 means the init step was skipped.
SELECT id,
       transaction_log -> 0 -> 'action' ->> 'type' AS first_action
FROM matches
WHERE status IN ('active', 'completed')
  AND transaction_log -> 0 -> 'action' ->> 'type' != 'system:init';

-- P3: Log length equals action_history length + 1
--     (action_history does not include system:init; log does).
SELECT id,
       jsonb_array_length(transaction_log)  AS log_len,
       jsonb_array_length(action_history)   AS action_len
FROM matches
WHERE status = 'active'
  AND jsonb_array_length(transaction_log) != jsonb_array_length(action_history) + 1;
```

---

## Post-conditions — completed matches

These should return **0 rows**. Any row is a data integrity violation.

```sql
-- C1: Completed matches must have a non-empty transaction log.
SELECT id
FROM matches
WHERE status = 'completed'
  AND jsonb_array_length(transaction_log) = 0;

-- C2: Completed matches must have an outcome set.
SELECT id
FROM matches
WHERE status = 'completed'
  AND outcome IS NULL;

-- C3: Winner index must be 0 or 1.
SELECT id,
       (outcome ->> 'winnerIndex')::int AS winner_index
FROM matches
WHERE status = 'completed'
  AND (outcome ->> 'winnerIndex')::int NOT IN (0, 1);

-- C4: Victory type must be one of the four defined types.
SELECT id,
       outcome ->> 'victoryType' AS victory_type
FROM matches
WHERE status = 'completed'
  AND outcome ->> 'victoryType' NOT IN (
    'lpDepletion', 'cardDepletion', 'forfeit', 'passLimit'
  );

-- C5: Sequence numbers must be contiguous (0, 1, 2, ...).
--     Gaps or duplicates indicate lost or replayed turns.
WITH entries AS (
  SELECT id AS match_id,
         (entry ->> 'sequenceNumber')::int AS seq,
         row_number() OVER (
           PARTITION BY id
           ORDER BY (entry ->> 'sequenceNumber')::int
         ) - 1 AS expected_seq
  FROM matches,
       jsonb_array_elements(transaction_log) AS entry
  WHERE status = 'completed'
)
SELECT match_id, seq, expected_seq
FROM entries
WHERE seq != expected_seq;

-- C6: All detail types must be valid discriminated union members.
--     system:init reuses detail type 'pass' internally; that is expected.
WITH entries AS (
  SELECT m.id AS match_id,
         entry ->> 'sequenceNumber' AS seq,
         entry -> 'details' ->> 'type' AS detail_type
  FROM matches m,
       jsonb_array_elements(m.transaction_log) AS entry
  WHERE m.status = 'completed'
)
SELECT match_id, seq, detail_type
FROM entries
WHERE detail_type NOT IN ('deploy', 'attack', 'pass', 'reinforce', 'forfeit');

-- C7: Hash chain integrity — stateHashAfter of entry N must equal
--     stateHashBefore of entry N+1 throughout the log.
WITH ordered AS (
  SELECT m.id AS match_id,
         (entry ->> 'sequenceNumber')::int AS seq,
         entry ->> 'stateHashBefore'       AS hash_before,
         entry ->> 'stateHashAfter'        AS hash_after
  FROM matches m,
       jsonb_array_elements(m.transaction_log) AS entry
  WHERE m.status = 'completed'
    AND entry ->> 'stateHashAfter' != ''      -- hashing enabled
)
SELECT a.match_id,
       a.seq          AS at_seq,
       a.hash_after   AS prev_hash_after,
       b.hash_before  AS next_hash_before
FROM ordered a
JOIN ordered b
  ON a.match_id = b.match_id
 AND a.seq + 1  = b.seq
WHERE a.hash_after != b.hash_before
  AND a.hash_after != '';

-- C8: The final state's phase must be 'gameOver' for completed matches.
SELECT id,
       state ->> 'phase' AS phase
FROM matches
WHERE status = 'completed'
  AND state ->> 'phase' != 'gameOver';
```

---

## Observability — summary and coverage

```sql
-- O1: Recent match health summary (last 50).
SELECT id,
       status,
       jsonb_array_length(transaction_log) AS total_entries,
       jsonb_array_length(action_history)  AS total_actions,
       outcome ->> 'victoryType'           AS victory_type,
       (outcome ->> 'winnerIndex')::int    AS winner,
       created_at,
       updated_at
FROM matches
ORDER BY created_at DESC
LIMIT 50;

-- O2: Action type distribution across all completed matches.
--     Useful for spotting action types that never appear (coverage gap).
SELECT entry -> 'action' ->> 'type' AS action_type,
       count(*)                      AS occurrences
FROM matches,
     jsonb_array_elements(transaction_log) AS entry
WHERE status = 'completed'
GROUP BY action_type
ORDER BY occurrences DESC;

-- O3: Average log length per victory type — long games under forfeit
--     or passLimit may indicate bot or client issues.
SELECT outcome ->> 'victoryType'         AS victory_type,
       count(*)                          AS match_count,
       avg(jsonb_array_length(transaction_log))::int AS avg_entries,
       min(jsonb_array_length(transaction_log)) AS min_entries,
       max(jsonb_array_length(transaction_log)) AS max_entries
FROM matches
WHERE status = 'completed'
GROUP BY victory_type
ORDER BY match_count DESC;

-- O4: Matches with broken hash chains (quick scan — non-zero count is a bug).
WITH ordered AS (
  SELECT m.id AS match_id,
         (entry ->> 'sequenceNumber')::int AS seq,
         entry ->> 'stateHashAfter'        AS hash_after
  FROM matches m,
       jsonb_array_elements(m.transaction_log) AS entry
  WHERE m.status = 'completed'
    AND entry ->> 'stateHashAfter' != ''
),
pairs AS (
  SELECT a.match_id
  FROM ordered a
  JOIN ordered b
    ON a.match_id = b.match_id
   AND a.seq + 1  = b.seq
  JOIN matches m ON m.id = a.match_id
  WHERE a.hash_after != (
    SELECT entry ->> 'stateHashBefore'
    FROM jsonb_array_elements(m.transaction_log) AS entry
    WHERE (entry ->> 'sequenceNumber')::int = b.seq
    LIMIT 1
  )
)
SELECT count(*) AS broken_chain_count FROM pairs;
```

---

## Notes

- **Hash chain queries (C7, O4)** only fire when `stateHashAfter != ''`.
  The server always passes `hashFn: computeStateHash` to `applyAction`, so
  all matches created by the server will have populated hashes. Matches
  replayed without a hash function (e.g. in tests) will have empty strings
  and are skipped by these queries.

- **system:init detail type** is `'pass'` internally (see `engine/src/turns.ts`
  line 548). Query C6 correctly accepts `'pass'` as a valid detail type; the
  distinction between a real `pass` action and `system:init` lives in
  `entry.action.type`, not `entry.details.type`.

- **No `events` column yet.** The `matches` table does not store
  `PhalanxEvent[]`. That column and its verification queries are part of
  TASK-45.4 (Event Log Persistence). Once that lands, add a C9 query:
  verify `jsonb_array_length(events) > 0` for all completed matches.
