# Project instructions

## Context and planning

- Read `docs/architecture.md` before changing product behavior or technical direction. It owns accepted scope, decisions and phase gates; do not duplicate them here.
- Phase PRDs live in the Git-ignored `.planning/prds/` directory. Read the relevant PRD and confirm its approval before phase implementation. If it is missing, request it rather than reconstructing an approved spec from memory. Small fixes do not need a new PRD/story.
- Load `prd-writing` when writing or reviewing a PRD.
- Work on one small, independently verifiable story/task at a time. Update its local status after verification.
- Before producing Ralph JSON, identify its format contract and output path as required by `docs/architecture.md`.
- Promote durable decisions from local planning into `docs/architecture.md`. Keep operational how-to separate and onboarding in `README.md`.

## Implementation

- Load `ponytail` before coding (`full` level unless the user says otherwise), after PRD/story approval where required. It owns scope inspection and change-size rules; do not duplicate them here.
- Load `nestjs-patterns` when touching NestJS modules, guards, pipes, exception filters or transport layers; it owns those conventions.
- Use `ponytail-review` for change reviews and `ponytail-audit` for whole-repo audits; use `conventional-commits` when preparing commits or commit messages.
- Follow project architecture and tooling over generic skill examples; skill examples do not authorize extra modules, transports or dependencies.
- Preserve unrelated or hand-edited work.
- Run the project's actual checks and report their results (`pnpm check`, or the narrower typecheck/test/build scripts). API tests need the Compose test database; do not invent passing results or skip required checks silently.
- Treat interrupted operations as potentially partial: inspect the working tree before retrying.
- Do not commit, amend, push or create PRs unless requested. Keep `.planning/`, secrets and generated caches out of commits.
- Keep responses and documentation in English. Report material artifact/cache footprint introduced by the work.
