<!--
HOW TO OPEN A PR THAT UPDATES JIRA (this comment is hidden once the PR is created)

Jira moves the issue whose key appears in the branch name / PR title:
  branch pushed   -> In Progress
  PR opened       -> In Review
  PR merged into main -> Done
  all sub-tasks Done  -> story Done; all stories Done -> epic Done

1. Use the SUB-TASK key from Jira (SCRUM-<number>, e.g. the one shown on the sub-task),
   not the "US-xx" label in the story title. Examples below use <number> on purpose:
   a real key in this template would link every PR to that issue.
2. Branch from an up-to-date main:
     git checkout main && git pull
     git checkout -b feature/SCRUM-<number>-movegen-general-advisor
   Prefixes: feature/ (new work), fix/ (bug), chore/ (config, cleanup).
3. Commit in English, Conventional Commits, key at the end:
     feat(rules): generate moves for general and advisor (SCRUM-<number>)
4. PR title starts with the key:
     SCRUM-<number> feat(rules): move generation for general and advisor
5. Merge with "Squash and merge" into main and KEEP the key in the title.

Special cases
- One PR finishing several sub-tasks of the same story: list every key in the title,
    e.g. "SCRUM-<a> SCRUM-<b> SCRUM-<c> feat(server): ..."
- Story without sub-tasks: use the story key.
- Docs / config not tied to a sub-task: put NO key anywhere, so no issue moves.
- Never put the STORY key on a PR that finishes only one sub-task:
  merging it would close the whole story.
- Conflict with main: `git pull origin main` on your branch, fix, push. No force-push.

Check: the Jira sub-task's "Development" panel should list your branch and PR.
-->

## Jira

<!-- Sub-task key(s), e.g. SCRUM-<number>. Merging this PR moves them to Done. -->

SCRUM-

## Changes

-

## How to test

-

## Checklist

- [ ] Branch name and PR title include the **sub-task** key (e.g. `feature/SCRUM-<number>-submit-move`)
- [ ] `pnpm lint`, `pnpm build`, `pnpm typecheck` and `pnpm test` pass
- [ ] Checked against the parent story's acceptance criteria
- [ ] Updated `packages/shared` if events or error codes changed
