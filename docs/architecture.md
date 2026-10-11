# Architecture

Design Studio is one TypeScript project, with React/Vite for the browser and a Node CLI. No backend database or AI service. Shared modules keep the schema and exported output consistent without separate service layers.

- `src/shared/design.ts`: versioned configuration, trust-boundary validation, deterministic color derivation, contrast, suggestions, CSS and agent skill generation. No filesystem or Node dependencies; used by both browser and CLI.
- `src/shared/randomize.ts`: local color scheme generation with per-theme locks and font candidate filtering; the toolbar loads only selected Fontsource variants before committing a pairing.
- `src/shared/zip.ts`: dependency-free stored ZIP export for selected skill files and assets.
- `src/web`: editor composition and history in App, persistent semantic toolbar, filtered randomization with locks, heading/body controls and optional typography scale, isolated actual-project/representative previews, contrast/recommendation/export panel, versioned Save and explicit Apply dialogs. Editor chrome uses its own tokens, so experimental colors never compromise its controls. Preview token CSS changes in place without reloading the page.
- `src/cli/project.ts`: bounded, read-only local package/CSS inspection. PostCSS parses custom properties; opaque numeric colors, per-theme channel formats and supported root/body selectors initialize unambiguous roles. Supporting aliases and selected scoped-variable/hardcoded migrations are explicit configuration data; ambiguous names require a manual mapping. Managed migration blocks are checked against the previous saved configuration before replacement. Other observations stay explicitly separate from inferred defaults.
- `src/cli/apply-project.ts`: React/Vite selected-font/assets/notices planner and HTML/CSS connection; no dependency installation.
- `src/cli/transactions.ts`: multi-file staging, before/after SHA-256 journals, project locks, conflict-checked rollback and explicit interrupted-apply recovery.
- `src/cli/adapter.ts`: explicit CSS-variable integration. Planning returns one before/after change; dry-run prints it. Only the explicit apply path writes, with a stale-content check and atomic rename. A selected typography scale adds six managed heading-size rules, replaced on subsequent apply and removed when scale is cleared. Custom edits in that block are refused. Unsupported cascade structures fail before writing.
- `src/cli/server.ts`: loopback-only editor/API server and origin-checked preview bridge. Supported React/Vite projects run their installed Vite and configuration in a separate local server with in-memory HTML injection and a temporary cache directory. The bridge reconnects after navigation, retains style precedence after HMR, checks visible computed consumers and loads selected fonts in the frame; unsupported preview never silently becomes sample content. Same-origin JSON save/review/apply endpoints reuse the existing adapter; short-lived review IDs and stale-file checks guard apply. Font assets are public read-only content-hash URLs.
- `src/shared/font-catalog.ts`: bundled Fontsource family metadata and validated static/variable font choices.
- `src/cli/font-cache.ts`: on-demand exact-package variant downloads, restricted font-face CSS, SHA-256 asset integrity, cached licenses and attribution; no catalog-wide asset download.
- `src/cli/workspace.ts`: named version envelopes, append-only exclusive saves, safe reopening.
- `src/web/draft.ts`: bounded, validated browser-local drafts keyed by the inspected project path. App offers explicit restore/discard before replacing a previous draft; restored edits use the existing configuration/history and require a new Apply review. Storage errors do not block manual editing or named saves.
- `src/cli/index.ts`: strict command/option parsing and local workflow.
- `examples`: React CSS-variable consumer plus example exported config/skill.
- `tests`: meaningful schema, theme, contrast, ZIP, inspection/privacy, versioned saves, font variants, prompt determinism and filesystem/CLI preservation checks.

`npm run build` checks types, emits the editor to `dist`, and emits the CLI/shared code to `dist-cli`. Built CLI dev serves `dist`; development CLI dev serves source via Vite. Dependencies are resolved from this checkout, even when the CLI runs in a different project directory.

A future adapter must implement a reviewable plan and explicit write step; do not add broad replacements across component source. A future URL analyzer must enforce public-address DNS/redirect validation, response/time bounds, and honest extracted/inferred labeling before being exposed. It is deliberately absent in v1.

CLI startup probes a bounded range of loopback port pairs when --port is omitted; explicit ports remain strict. Vite strictPort still guards a bind race. No existing process is stopped.
