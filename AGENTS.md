# Design Studio repository

Use Node.js 22.12+ and npm. The package executable is `design-studio`; the internal npm name is already used by an unrelated public package, so do not advertise a public npx installation.

## Commands

- `npm ci`: install checkout dependencies.
- `npm test`: Node/tsx unit and filesystem integration tests.
- `npm run typecheck`: TypeScript checks.
- `npm run build`: check types, build React/Vite editor to dist, compile CLI/shared modules to dist-cli.
- `npm run cli -- dev --project "/path/to/site"`: local workspace; editor loopback port 4310, application preview 4311.
- `npm run registry:validate`: preset/provenance/assets validation.
- `node scripts/dependency-notices.mjs`: inspect installed dependency licenses and regenerate software notices.
- `npm pack`: build and create local tarball; do not publish to npm without authorization.

## Architecture and invariants

React editor is in src/web; configuration, semantic tokens, fonts and exports in src/shared; pinned presets/resources in src/registry. CLI inspection/server/font cache are in src/cli. adapter.ts plans supported CSS changes; apply-project.ts connects React/Vite font resources and stylesheet; transactions.ts owns backup, staging, conflict-checked rollback and recovery. Share the same validated configuration across preview, saves, prompts, exports and Apply.

Preserve unrelated source, declarations, assets and user work. Project inspection is read-only and excludes secrets; actual Vite preview executes trusted local configuration. Apply must show every changed file, never install website dependencies silently, reject stale reviews, and retain recoverable history. Do not overwrite rollback conflicts. Only selected font variants may be fetched/copied; preserve their own licenses and report unverified language coverage honestly.

Use meaningful targeted tests and actual browser checks when changing rendered behavior. Test the packed executable against a separate project, including paths with spaces, independent post-Apply startup and rollback. See docs/architecture.md and CONTRIBUTING.md. Deployment, npm publication, GitHub push and external messaging require user authorization. Do not delegate unless requested or required by applicable instructions.
