---
description: Review and improve this repo's agent harness (AGENTS.md, lessons, overlays)
agent: agent
---

# Harness review

Goal: keep `AGENTS.md` short, true, and useful for Claude Code. Produce one reviewable diff. Do not commit.

1. Read `AGENTS.md` and `CLAUDE.md`.
2. Read `git log --oneline` since the **Last harness review** date in `AGENTS.md` (or the last 50 commits). Note changes to code, config, commands, or layout.
3. Verify the claims in `AGENTS.md` against the code: commands, entrypoints and auth, directory layout, domain rules, and any health-check checklist items. Fix wrong claims. Remove claims you cannot verify. Never document features that do not exist.
4. Curate **Lessons**:
   - Promote durable lessons into their proper section, then delete them from Lessons.
   - Merge duplicates. Delete lessons whose code or cause no longer exists.
   - Keep at most 10, each in the format `- **Topic:** imperative rule. Why: cause. (YYYY-MM)`.
5. Keep overlays thin:
   - `CLAUDE.md` holds no facts duplicated from `AGENTS.md`.
6. Cut bloat, keep traps:
   - Remove text that the code already makes obvious, or that no agent needs to act.
   - Replace copied values (version pins, config numbers, step lists) with a pointer to the source file.
   - Never cut a non-obvious invariant or trap (security, data integrity, failure handling, test setup pitfalls). Compress it to one line instead.
   - Flag `AGENTS.md` if it exceeds about 200 lines.
7. Set **Last harness review** to today.

Report briefly: claims fixed, lessons promoted, merged, or pruned, size before and after, and open questions for the human.
