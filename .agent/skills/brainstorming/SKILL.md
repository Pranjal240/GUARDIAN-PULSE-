---
name: brainstorming
description: Explores user intent, requirements and design before implementation. Use this before any creative work like creating features, building components, adding functionality, or modifying behavior.
---

# Brainstorming Ideas Into Designs

## When to use this skill
- Before any creative work (creating features, building components, adding functionality, or modifying behavior)
- When starting a new project or sub-project
- When turning ideas into fully formed designs and specs

## Workflow
You MUST create a task for each of these items and complete them in order:
1. **Explore project context** — check files, docs, recent commits
2. **Offer visual companion** — ask if they want to use a web browser for visual mockups
3. **Ask clarifying questions** — one at a time, understand purpose/constraints/success criteria
4. **Propose 2-3 approaches** — with trade-offs and your recommendation
5. **Present design** — in sections scaled to their complexity, get user approval after each section
6. **Write design doc** — save to `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` and commit
7. **Spec review loop** — dispatch spec-document-reviewer subagent; fix issues until approved
8. **User reviews written spec** — ask user to review the spec file before proceeding
9. **Transition to implementation** — invoke writing-plans skill

## Instructions

<HARD-GATE>
Do NOT invoke any implementation skill, write any code, scaffold any project, or take any implementation action until you have presented a design and the user has approved it. This applies to EVERY project regardless of perceived simplicity.
</HARD-GATE>

### Anti-Pattern: "This Is Too Simple To Need A Design"
Every project goes through this process. A todo list, a single-function utility, a config change — all of them. "Simple" projects are where unexamined assumptions cause the most wasted work. The design can be short (a few sentences for truly simple projects), but you MUST present it and get approval.

### Understanding the idea
- Assess scope: if the request describes multiple independent subsystems, flag this immediately and decompose.
- Ask questions **one at a time** to refine the idea. Focus on purpose, constraints, success criteria.
- Prefer multiple choice questions when possible.

### Expected Outputs
- A written design document stored in `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
- Subagent review must be completed.
- The ONLY skill you invoke after brainstorming is writing-plans. Do NOT invoke frontend-design, mcp-builder, or any other implementation skill.

## Resources
- (None needed by default, but scripts can be placed here)
