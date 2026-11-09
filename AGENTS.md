# Project instructions

## Context and planning

- Read `docs/architecture.md` before changing product behavior or technical direction. It owns accepted scope, decisions and phase gates; do not duplicate them here.
- Phase PRDs live in the Git-ignored `.planning/prds/` directory. Read the relevant PRD and confirm its approval before implementation. If it is missing, request it rather than reconstructing an approved spec from memory.
- Work on one small, independently verifiable story/task at a time. Update its local status after verification.
- Before producing Ralph JSON, identify its existing format contract and output path. Neither is defined yet.
- Promote durable decisions from local planning into `docs/architecture.md`. Keep operational how-to separate and onboarding in `README.md` once runnable tooling exists.

## Implementation

- Follow surrounding structure and use the smallest complete change. Introduce dependencies/modules only when the current task needs them.
- Inspect affected callers, contracts and migrations before editing. Preserve unrelated or hand-edited work.
- Run the project's actual checks and report their results (`pnpm check`, or the narrower typecheck/test/build scripts). API tests need the Compose test database; do not invent passing results or skip required checks silently.
- Treat interrupted operations as potentially partial: inspect the working tree before retrying.
- Do not commit, amend, push or create PRs unless requested. Keep `.planning/`, secrets and generated caches out of commits.
- Keep responses and documentation in English. Report material artifact/cache footprint introduced by the work.
