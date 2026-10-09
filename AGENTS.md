# Repository guidance

Hoop Shot Counter uses vanilla JavaScript ES modules, Vite, Roboflow, ONNX workers,
and Web Audio. Follow the existing code structure and style.

## Skills

- Read a selected skill's `.agents/skills/<name>/SKILL.md` before first use.
- **caveman: always active** for all replies unless the user explicitly disables
  it. Answer in the user's language, briefly and clearly, keeping essential facts.
- **ponytail: always use when writing or changing code**, including fixes and
  refactoring. Default to `full`: make the smallest complete change, reuse existing
  code, and preserve validation, error handling, security, and accessibility.
- Use other skills only when they materially help the current task:
  `debug-mantra` for debugging; `scrutinize`/`code-review` for reviews;
  `frontend-design`/`ui-ux-pro-max` for UI work; `tdd` for requested test-first work;
  `brainstorming` when requirements or design need clarification.
- Do not load every skill, force unnecessary workflows, or install missing skills
  automatically. Run bundled scripts only when needed for the requested task.
- Explicit user instructions and these repository rules take precedence over
  conflicting skill defaults. Keep this file short; leave details in the skills.
- For Notion tasks and `wayfinder`, read `docs/agents/issue-tracker.md` first.

## Notion access

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
