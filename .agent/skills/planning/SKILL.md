---
name: planning
description: Generates comprehensive implementation plans assuming the engineer has zero codebase context. Use when you have a spec or requirements for a multi-step task, before touching code and after brainstorming.
---

# Writing Plans

## When to use this skill
- After a spec or design document has been finalized and approved
- When you need to create a multi-step tasks implementation plan before writing any code

## Workflow
1. **Check Scope:** Ensure the spec covers a single subsystem. If it's multiple, separate the plans.
2. **Map File Structure:** Map out which files will be created or modified and their responsibilities. Ensure clear boundaries.
3. **Write Tasks Plan:** Write bite-sized instructions (2-5 mins tasks).
4. **Save Plan:** Write to `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`
5. **Dispatch Reviewer:** Dispatch plan-document-reviewer subagent to check the plan's validity.
6. **Execution Handoff:** Ask the user if the plan is ready to execute.

## Instructions

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

### Plan Document Header
Every plan MUST start with exactly this header:
```markdown
# [Feature Name] Implementation Plan
> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [One sentence describing what this builds]
**Architecture:** [2-3 sentences about approach]
**Tech Stack:** [Key technologies/libraries]
---
```

### Task Structure 
Use bite-size chunks for each task:
1. Write the failing test
2. Run test to verify it fails
3. Write minimal implementation
4. Run test to verify it passes
5. Commit

Example:
```markdown
### Task N: [Component Name]
**Files:**
- Create: `exact/path/to/file.py`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run test to verify it fails** (Include exact command and output expected)
- [ ] **Step 3: Write minimal implementation**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Commit**
```

### Execution Handoff
After saving the plan:
"Plan complete and saved to `docs/superpowers/plans/<filename>.md`. Ready to execute?"

## Resources
- (None needed by default)
