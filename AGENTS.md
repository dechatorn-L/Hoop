# Repository guidance

Hoop Shot Counter uses vanilla JavaScript ES modules, Vite, local ONNX workers,
optional custom Roboflow models, and Web Audio. Follow the existing code structure and style.

## Skills

- **caveman: always active** for all replies unless the user explicitly disables
  it. Answer in the user's language, briefly and clearly. Persisted documents,
  code, and Notion content retain complete, normal prose.
- **ponytail: always use when writing or changing code**, including fixes and
  refactoring. Default to `full`: make the smallest complete change, reuse existing
  code, and preserve validation, error handling, security, and accessibility.

### Select and load

1. Identify the requested output and current phase. Choose one primary workflow
   below; add supporting skills only for a distinct need. Honor explicit skill
   requests and retain applicable skills and authorization across turns.
2. Read `.agents/skills/<name>/SKILL.md` before first use, then only the references
   required by that branch. Verify instructions, referenced files, scripts, and
   runtime dependencies before claiming a capability is available.
3. Respect `disable-model-invocation: true` and `allow_implicit_invocation: false`:
   use those skills when the user requests the skill or its workflow. A routing
   recommendation alone does not authorize execution or publication.
4. When a skill says "call the Skill tool", use the session's skill loader; if
   none exists, read its SKILL.md and follow it. Resolve bundled paths relative
   to that skill's directory. Report missing capabilities and continue supported
   work; installation or borrowing another project's adaptation is not automatic.

### Task routes

| Task / requested output | Primary workflow and necessary support |
| --- | --- |
| Choose a workflow when the route is unclear | `ask-matt`; recommend a route first, execute within existing authorization. |
| Large effort with unresolved decisions across sessions | `wayfinder`; read the live map, then claim one unblocked, unassigned child. Route by its actual type label. |
| Stress-test an idea or resolve a human decision | `grilling` with `domain-modeling` for decision tickets and confirmed terms/ADRs. `grill-with-docs` explicitly combines both. Wait for the user's answers before resolving decisions. |
| Turn agreed discussion into a build specification | `to-spec`; synthesize existing decisions and confirm the test seam before publication. |
| Break an agreed spec into implementation work | `to-tickets`; confirm the proposed vertical slices before publication and preserve native blockers. |
| Implement a defined spec or ticket | `implement`; for tracker work, claim one unblocked child and skip aggregate parents. Use `tdd` at agreed seams and `code-review` before handoff. A direct small fix needs no new planning map or ticket. |
| Test-first behavior or integration tests | `tdd`; reuse already agreed seams, confirm a new seam before writing tests. |
| Bug, failure, or performance regression | `debug-mantra` silently by default; recite only on request. Add `diagnosing-bugs` for a harder feedback loop, minimization, or regression work. Share one repro and experiment ledger. |
| Review intent, a plan, or end-to-end correctness | `scrutinize`; trace the real path and consider a simpler solution. |
| Review a branch, PR, or code diff against standards and spec | `code-review`; pin the Git base and review scope before its two parallel reviews. For work in progress, include staged, unstaged, and new files. Avoid a second full review with the same purpose. |
| Design, build, critique, audit, or polish an interface | `impeccable` leads; use Operate mode for the practice app and load only the relevant playbook. |
| Study a visual reference or explore distinctive visual structure | `hallmark` supports the design lead, or leads when explicitly requested. Preserve the agreed design system. Audit is read-only; study precedes adopting a design. |
| Targeted typography, palette, touch, responsive, accessibility, or stack question | `ui-ux-pro-max` supports the design lead with a focused search; verify result relevance before applying it. |
| Design module interfaces, deepen modules, or choose a test seam | `codebase-design` as a reference; load its deeper workflows only when needed. |
| Change terminology, a glossary, or an ADR | `domain-modeling`; record confirmed decisions using its formats. |
| Research external facts or documented capabilities | `research`; delegate as instructed and save findings with primary-source citations. Facts do not decide user preferences. |
| Explore a design question with a runnable artifact | `prototype`; choose logic or UI explicitly and keep the artifact clearly separate from production readiness. |
| Document a significant fixed bug / RCA | `post-mortem` when requested, after the repro, cause, fix, and validation are known. |
| Write a PR body | `pr`; describe the final change and actual validation evidence. |
| Prepare context for another agent/session | `handoff`; save in the OS temporary directory, link existing artifacts, and name suggested skills. |
| Write or edit AGENTS.md, CLAUDE.md, or skills | `writing-for-agents`; for skill authoring also read its SKILL-MECHANICS.md. |
| Find a missing capability | `find-skills` for discovery; verify candidates before recommending them. Installation requires a request for installation. |
| Configure or repair tracker/domain prerequisites | `setup-matt-pocock-skills` when requested; inspect existing setup before changing it. |

### Repository adapters and completion

- For Notion work, read `docs/agents/issue-tracker.md` before API access. It owns
  Hoop's tracker schema, triage vocabulary, and native relationships; dated task
  snapshots require live verification.
- Some imported skills mention Cafe Family. Apply Hoop's context and these
  repository rules. For `ask-matt`, this section replaces the absent
  `docs/skills.md`; use the tracker doc instead of its absent
  `docs/agents/triage-labels.md`. Its optional `task-observer` is not installed.
- Explicit user instructions and repository rules override conflicting skill
  defaults. A skill never expands authorization to unrelated tracker writes,
  setup, commits, pushes, or publication. Preserve existing user approvals.
- Load only relevant skills and run scripts only for the requested task. Use
  subagents when the user or selected workflow explicitly calls for them; report
  a manual fallback if the required agent tools are unavailable.
- Before reporting completion, check the diff against the task and agreed
  decisions, including new files. State which skills and checks actually ran,
  their results, and any gaps. File inspection, automated tests, browser playback,
  and physical-device checks are distinct evidence.

## Notion access

- Write Notion planning titles, page bodies, and planning comments in English.
  Keep existing schema/property names and status options unchanged.
- Load `NOTION_API_KEY` and `NOTION_API_VERSION` from this repo's `.env`
  (Node: `node --env-file=.env`). Use the existing key; ask only if it is missing
  or access fails. `.env.example` contains placeholders, never credentials.
- Prefer the API for authorized reads and updates; use the browser for UI-only
  settings. Send requests to `https://api.notion.com/v1` with
  `Authorization: Bearer <NOTION_API_KEY>` and `Notion-Version: <NOTION_API_VERSION>`.
- Never print or commit the key, send it to another host, or expose it through
  `VITE_*`. Database IDs, fields, and workflows live in `docs/agents/issue-tracker.md`.
- Before updates, read current schemas and query existing pages to avoid
  duplicates. Preserve unrelated projects and user edits; read back to verify.

## Commands

- Use npm and the lockfile; Node.js `^20.19.0 || >=22.12.0` is required by Vite.
- `npm ci` installs dependencies; `npm run dev` starts HTTPS on port 5173.
- Run `npm run build` after application changes; also run
  `node tests/repro-test.mjs` for scoring or sound-selection logic changes.
- Check affected camera, UI, inference, and audio behavior in the browser as
  needed. Report checks actually run; documentation-only edits need no build.

## Essentials

- Keep inference separate from rendering; preserve worker cleanup/fallback,
  source-image box coordinates, scoring cooldown, and saved settings compatibility.
- Preserve user changes. Avoid editing generated files or model binaries unless
  requested. Never commit `.env` values or put private credentials in `VITE_*`.
- Verify referenced files exist; documentation may point to missing files.
