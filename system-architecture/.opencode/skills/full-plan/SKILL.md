---
name: full-plan
description: Three-phase planning workflow — explore to clarify, brainstorm to design, then grill to stress-test. Use when user invokes /full-plan or /fp, or asks for a complete planning process before implementation.
---

# Full Plan: Pre-flight → Explore → Brainstorm → Grill

A four-phase workflow: loads global multi-repo context first (Phase 0), then explores, designs, and stress-tests. Run through all phases sequentially. Do not skip any phase.

**Hard gate**: Do NOT write any code, scaffold any project, or implement anything until all four phases are complete and the final plan document is produced.

## Trigger

The user invokes this skill with `/full-plan <topic>` or `/fp <topic>`. If no topic is given, ask what they want to plan.

---

## Phase 0: Pre-flight — Load Global Context

**Hard gate**: Do NOT proceed to Phase 1 until global context is confirmed loaded and topology understood.

**Stance**: Before any exploration or design begins, establish the global system map. This phase loads the multi-repo architecture context so the AI knows the full topology, not just the current directory.

### Steps (execute in order — do not skip)

1. **Locate system-architecture context**
   - Check if `topology.yaml` exists in the current working directory
   - Check env `$env:SYSTEM_ARCH_DIR`
   - Check `../system-architecture/`
   - Check `./system-architecture/`
   - If not found → ask the user: "I need the system-architecture context to understand the global topology. Where is your system-architecture repo (or where is `topology.yaml`)?"
   - Set the discovered path as `$CONTEXT_ROOT` internally

2. **Load topology.yaml** (use Read tool)
   - Parse: all services, repo paths, ports, dependencies, responsibilities
   - Present a summary to the user:
     ```
     [System: <name>]
     Client_Web_APP(:3000) → API_Gateway(:8080) → Gateway_Plugin(:8081) → Service_API(:8082)
     ```
   - Ask: "Does this topology look correct for this task?"

3. **Load CLAUDE.md or AGENTS.md or CONTEXT.md or PLAN_AGENTS.md** (use Read tool)
   - Internalize responsibility boundaries:
     - What each service OWNS and DOES NOT OWN
     - Which services may contain business logic and which may not
   - Internalize data flow direction and error propagation pattern
    - Internalize development rules (these are architecture constraints, not suggestions)

4. **Identify developer (identity check)**
   - List files in `$CONTEXT_ROOT/PROGRESS/` directory
   - If `PROGRESS/` contains developer files like `alice.md`, `bob.md`:
     - Ask: "I see progress files for: Alice, Bob. Which developer are you?"
   - If `PROGRESS/` is empty or no matching file:
     - Ask: "I don't see your progress file yet. What's your developer name? I'll create PROGRESS/<name>.md for you."
   - Set `$DEV_NAME` internally — ALL progress updates in this session go to `PROGRESS/$DEV_NAME.md`
   - Never write to another developer's progress file
   - 💡 [Plan 模式提示]：準備建立 PROGRESS/$DEV_NAME.md 檔案時，請打開 build / act 模式，寫入檔案後，明確標記出檔案的路徑（例如：已寫入檔案：PROGRESS/$DEV_NAME.md），並提示我切回 plan 模式。

5. **Load developer progress** (use Read tool)
   - Read `$CONTEXT_ROOT/PROGRESS/ROADMAP.md` — understand feature status across the team
   - Read `$CONTEXT_ROOT/PROGRESS/$DEV_NAME.md` — understand what this developer was working on
   - Present summary to user:
     ```
     [Developer: <name>]
     [Last progress: ...]
     [ROADMAP shows: ...]
     ```
   - Ask: "Picking up from where you left off, or starting something new?"

7. **Load relevant API contracts** (use Read tool)
   - Read `$CONTEXT_ROOT/contracts/openapi-*.yaml` for the services involved
   - Note which endpoints already exist
   - Summarize existing routes to the user

8. **Scope the task**
   - Ask: "This task involves which service(s) — `$IMPACTED_SERVICES`?"
   - Determine which repos will need changes
   - Record the list — this guides which contracts to check and which repos to edit later

9. **Confirm readiness**
   - Say: "Phase 0 complete. Global context loaded. Proceeding to explore."
   - Continue to Phase 1

### Behavior Rules (AI must obey)
- If `CLAUDE.md` says "API_Gateway MUST NOT contain business logic" and the user's later request implies adding business logic to API_Gateway → flag it immediately and refuse
- If the task affects multiple repos → the plan document MUST list each repo's specific changes separately
- If phase 0 found topology.yaml, the AI already knows repo paths → use `../other-repo/src/...` paths when editing
- Phase 0 may be skipped only if the user explicitly says "skip context loading, I know the topology"
- Progress files: NEVER write to another developer's `PROGRESS/*.md`. Only write to `PROGRESS/$DEV_NAME.md` and `ROADMAP.md` (and only update ROADMAP with user's explicit approval for the status change)

---

## Phase 0.5: Requirements Analysis

**Hard gate**: Do NOT proceed to Phase 1 until requirements are confirmed and documented.

**Stance**: Before any design or implementation, ensure the functional requirements are captured, documented, and up to date. This phase bridges the gap between understanding the system (Phase 0) and exploring a specific feature (Phase 1).

### Steps (execute in order)

1. **Load requirements document**
   - Read `$CONTEXT_ROOT/docs/requirements-analysis.md`
   - If the file does not exist → skip this phase and note to the user: "No requirements analysis document found. Consider creating one with `/fp generate-requirements`."

2. **Map the current feature request to existing requirements**
   - Determine which FR-IDs in the document are affected by the current feature request
   - Present the mapping to the user:
     ```
     [Requirements Impact]
     - Affected FR-IDs: FR-01, FR-03
     - New requirement needed: Yes/No
     - Business rules affected: BR-05, BR-06
     ```

3. **Handle each scenario**

   | Scenario | Action |
   |----------|--------|
   | Feature matches existing requirement exactly | Confirm: "This requirement is already documented. Proceeding to design." |
   | Feature modifies an existing requirement | Update the affected FR-ID in `docs/requirements-analysis.md`, add a changelog entry |
   | Feature is entirely new | Add a new FR-ID with full spec (description, trigger, input, output, API, business rules) |

4. **Update the requirements document when needed**
   - Add new FR-IDs with sequential numbering
   - Update affected business rules (BR-IDs)
   - Add a changelog entry at the bottom with date, version, change description
   - Confirm with the user before writing
   - 💡 [Plan 模式提示]：準備寫入/更新 docs/requirements-analysis.md 檔案時，請打開 build / act 模式，寫入檔案後，明確標記出檔案的路徑（例如：已寫入檔案：docs/requirements-analysis.md），並提示我切回 plan 模式。

5. **Confirm readiness**
   - Say: "Phase 0.5 complete. Requirements documented. Proceeding to explore."
   - Continue to Phase 1

### Behavior Rules
- If `docs/requirements-analysis.md` does not exist and the user is starting a new feature → flag: "I recommend generating a requirements analysis document first. Shall I create one?"
- If the user's feature request contradicts a documented requirement → flag immediately and ask for clarification
- Always get user approval before modifying `docs/requirements-analysis.md`
- Keep the changelog up to date with every modification

---

## Phase 1: Explore

**Stance**: Free-form thinking partner. No script, no required sequence, no mandatory outputs.

### What you might do

- **Explore the problem space**: Ask clarifying questions that emerge naturally. Challenge assumptions. Reframe the problem. Find analogies.
- **Investigate the codebase**: Read files, search code, map existing architecture, identify patterns and integration points.
- **Compare options**: Brainstorm multiple approaches, build comparison tables, sketch tradeoffs with ASCII diagrams.
- **Surface risks and unknowns**: Identify what could go wrong, find gaps in understanding.

### Visual thinking

Use ASCII diagrams liberally — system diagrams, state machines, data flows, architecture sketches, dependency graphs, comparison tables.

### When to transition

Do NOT force a transition. When the conversation naturally crystallizes into a concrete direction, or the user says something like "let's design it", say:

> "Sounds like we have enough clarity to move into design. Ready to start Phase 2 (Brainstorm)?"

If they agree, proceed. If not, keep exploring.

---

## Phase 2: Brainstorm

**Stance**: Guided collaborative design. One question at a time, structured progression from idea to written spec.

### Checklist (complete in order)

1. **Explore project context** — Check files, docs, recent commits relevant to the topic
2. **Assess scope** — If the request covers multiple independent subsystems, flag this and help decompose before diving into details
3. **Ask clarifying questions** — One at a time. Prefer multiple choice. Focus on: purpose, constraints, success criteria, edge cases
4. **Propose 2-3 approaches** — With trade-offs and your recommendation. Lead with your recommended option.
5. **Present design in sections** — Scale each section to complexity. Cover: architecture, components, data flow, error handling, testing. Get approval after each section.
6. **Design for isolation** — Break into units with single responsibilities and well-defined interfaces
7. **Working in existing codebases** — Follow existing patterns. Include targeted improvements where relevant code has problems.

### Output

After the user approves the full design:

1. Write design doc to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
   - 💡 [Plan 模式提示]：準備將設計寫入 docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md 檔案時，請打開 build / act 模式，寫入檔案後，明確標記出檔案的路徑（例如：已寫入檔案：docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md），並提示我切回 plan 模式。
2. Do a spec self-review: check for placeholders, contradictions, ambiguity, scope
3. Ask the user to review the written spec

### Transition

Once the user approves the written spec, say:

> "Design is locked. Now I'll grill it to find blind spots before we plan implementation."

Proceed to Phase 3.

---

## Phase 3: Grill

**Stance**: Relentless but fair interviewer. Walk every branch of the decision tree until no ambiguity remains.

### Rules

- **One question per turn** — Never bundle multiple questions
- **Provide a recommended answer** with each question — defaulting to "what do you think?" is lazy
- **Explore the codebase first** — If a grep or read resolves it, do that instead of asking
- **Walk the tree depth-first** — Finish one branch before opening another
- **Track dependencies** — If decision B depends on decision A, ask A first

### Probe these areas (adapt order based on context)

| Area | Sample questions |
|---|---|
| **Underlying problem** | What's the real need? Why now? |
| **Success criteria** | How do we know it's done? What does working look like? |
| **Edge cases & failure modes** | What if input is invalid? Network fails? User cancels? Max data size? |
| **Dependencies & constraints** | What existing systems, APIs, patterns must this integrate with? |
| **Risks & trade-offs** | What are we choosing NOT to do? What could go wrong? |
| **MVP scope** | What's the minimum that delivers value? What can be deferred? |

### If the grill reveals issues

If a question reveals a gap or flaw in the design, do NOT implement a fix directly. Instead:

1. Flag the issue
2. Offer to update the design doc
3. Get user approval before making any change
4. Update `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
   - 💡 [Plan 模式提示]：準備更新 docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md 檔案時，請打開 build / act 模式，寫入檔案後，明確標記出檔案的路徑（例如：已寫入檔案：docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md），並提示我切回 plan 模式。

### Transition

When all branches are resolved and shared understanding is reached, summarize the locked-in decisions and proceed to produce the final plan document.

---

## Final Output: Implementation Plan

After all three phases complete, produce a task plan document:

**File**: `docs/superpowers/specs/YYYY-MM-DD-<topic>-tasks.md`

- 💡 [Plan 模式提示]：準備建立 docs/superpowers/specs/YYYY-MM-DD-<topic>-tasks.md 檔案時，請打開 build / act 模式，寫入檔案後，明確標記出檔案的路徑（例如：已寫入檔案：docs/superpowers/specs/YYYY-MM-DD-<topic>-tasks.md），並提示我切回 plan 模式。

### Template

```markdown
# Implementation Plan: <topic>

## Design Reference
`docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`

## Tasks

### Task 1: <short name>
- **Scope**: What this task covers
- **Files to modify**: path/to/file1, path/to/file2
- **Acceptance criteria**: How to verify it's done
- **Dependencies**: None

### Task 2: <short name>
- **Scope**: ...
- **Files to modify**: ...
- **Acceptance criteria**: ...
- **Dependencies**: Task 1

...

## Open Questions
- Any remaining unknowns still to resolve

## Notes
- Decisions made during grill phase that affect implementation
```

Present the document to the user for review. Ask if they'd like to proceed with implementation or make adjustments.

### Progress Tracking
After the user completes implementation:
1. Offer to update `PROGRESS/$DEV_NAME.md` with what was accomplished in this session
   - 💡 [Plan 模式提示]：準備更新 PROGRESS/$DEV_NAME.md 檔案時，請打開 build / act 模式，寫入檔案後，明確標記出檔案的路徑（例如：已寫入檔案：PROGRESS/$DEV_NAME.md），並提示我切回 plan 模式。
2. Offer to update `PROGRESS/ROADMAP.md` feature status (only with user's explicit approval)
   - 💡 [Plan 模式提示]：準備更新 PROGRESS/ROADMAP.md 檔案時，請打開 build / act 模式，寫入檔案後，明確標記出檔案的路徑（例如：已寫入檔案：PROGRESS/ROADMAP.md），並提示我切回 plan 模式。
3. Remind user: "I've updated your progress log. You can git commit when ready."

---

## Guardrails

- **Don't implement** — Never write application code or scaffold projects. Creating plan documents is fine.
- **Don't fake understanding** — If something is unclear, dig deeper
- **Don't skip phases** — Each phase serves a distinct purpose. Run all four.
- **Don't force structure in Phase 1** — Let exploration be open
- **Don't bundle questions in Phase 2 & 3** — One at a time
- **Do explore the codebase** — Ground discussions in reality
- **Do visualize** — A good ASCII diagram is worth many paragraphs
- **Do go back** — If new info emerges in Phase 3, update the Phase 2 design doc
- **User always has control** — They can skip ahead, go back, or stop at any time


5. 設計與任務產出 (Phase 2 & Final Phase):
- 設計文件應寫入 docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md（當計畫完成時，自動建立或更新）。
- 實作計畫應寫入 docs/superpowers/specs/YYYY-MM-DD-<topic>-tasks.md（當計畫完成時，自動建立或更新）。