---
description: "Add a new rule ID to RULES.md with test stub and TESTPLAN.md entry"
argument-hint: "<PHX-CATEGORY-NNN> <one-line description>"
model: haiku
allowed-tools: "Read, Write, Edit, Bash, Grep, Glob"
---

Add a new game rule to the Phalanx project. The rule ID and description are: $ARGUMENTS

Follow these steps exactly:

1. **Read current state:**
   - Read `docs/RULES.md` to find the correct section for this rule category
   - Read `docs/TESTPLAN.md` to find the mapping table
   - Read `engine/tests/rules.test.ts` to see existing test stubs

2. **Add rule to RULES.md:**
   - Determine the correct section based on the category prefix (DEPLOY, COMBAT, ACE, SUIT, CARDS, HEROICAL, TURNS, VICTORY, RESOURCES)
   - If the section does not exist, create it under an appropriate heading
   - Add the rule with format:
     ```
     ### <ID> — <Short Title>

     <Description from arguments>

     **TODO: finalize**
     ```

3. **Add row to TESTPLAN.md mapping table:**
   - Add a row: `| <ID> | <description> | engine/tests/rules.test.ts |`

4. **Add test stub to engine/tests/rules.test.ts:**
   - Add a new `describe('<ID>: <title>', () => { ... })` block
   - Include at least one `it.todo(...)` placeholder inside

5. **Verify:**
   - Run `pnpm rules:check` to confirm the new ID is found in test files
   - Report the result

Do NOT implement any game logic. Only add documentation and test stubs.
