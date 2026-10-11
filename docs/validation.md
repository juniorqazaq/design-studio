# Release validation

Latest local verification: 2026-10-11, macOS arm64, Node 22.12.0 and Chrome. These are observed results, not a claim that every project or platform is supported. Earlier release checks are retained below with their original scope.

## Browser draft recovery

- `npm test`: all 50 tests passed. Three new tests check full configuration/theme recovery, project separation, malformed/oversized/unsupported drafts, validation before replacement and blocked/quota-limited storage.
- `npm run build`: TypeScript, production editor and compiled CLI passed. The current editor bundle is about 939 kB before gzip (156 kB gzip); the existing Vite size warning remains.
- The packed ordinary-variable browser fixture now reloads and restores the edited design, checks the actual Light/Dark colors and bundled fonts, clears the draft by undoing to the original, verifies redo and discard, then restores again. Save and Reopen run through the real dialog; prompt preview and downloaded skill contain the exact same configuration; the Apply dialog reviews and applies that selection. A blocked-storage browser still previews and saves named versions successfully.
- `npm run test:browser`: all four packed fixtures passed again after the concurrent interface changes were included in a fresh build. The isolated moved installation, paths with spaces, independent development/production startup, color-only font preservation and complete rollback passed. These checks used bundled fonts and no publishing credentials.
- A separate manual check against the bundled example verified the recovery banner and restored Primary/Accent values at normal desktop width and at 390 px. Preview/restore did not apply changes to the example's source. Draft errors do not silently claim successful recovery.

Drafts are browser-origin-local and scoped to the inspected project path, not a replacement for named saves. Clearing browser data, changing browser/hostname/port, private browsing, storage restrictions or another tab replacing the draft can lose recovery data. Font binaries are not embedded in drafts; the existing bundled/cached font behavior still applies. Current Windows/Linux browser rendering and remote Actions were not run. No npm publication, GitHub push, deployment or Apply to the user's website was performed.

## Current selector, color diagnostics and Apply regressions

- `npm test`: all 47 tests passed. Added checks for upgrading old marked/unmarked migration blocks, rejecting custom edits, and removing only exact duplicate generated typography rules. The original duplicate-typography regression failed before the fix (two body rules instead of one).
- `npm run build`: TypeScript, production editor and compiled CLI passed. The editor JavaScript remains about 928 kB before gzip (153 kB gzip), with Vite's existing size warning.
- `npm run registry:validate`: 24 presets passed. Bundled font glyph coverage was not reverified because those assets were unchanged.
- `npm run test:browser`: the packed CLI passed on macOS/Node 22.12.0 using installed Chrome. The tarball filename was discovered from npm output; the isolated installation was moved to another path, and the separate website path contained spaces. No global installation, credentials or external font downloads were needed.
- Four real website fixtures passed: ordinary variables, no tokens with explicit migrations, scoped variables, and root-anchored selectors containing `:is()`/`:not()` comma lists and a selected `::after` color. Checks include computed Light/Dark colors, bundled heading/body font loading, unchanged source during preview, Save/Reopen/Prompt/Skill configuration consistency, reviewed Apply, independent development and production startup, color-only font preservation and byte-for-byte rollback.
- Border shorthand diagnostics now inspect individual computed side colors and deduplicate element/property matches. The complex-selector fixture checks its actual border color and diagnostic result. A separate editor check against the bundled React/Vite example showed the changed blue action and red accent border, with Primary 6/6 and Accent 1/1 matching consumers. Pseudo-element diagnostics remain a manual check; their actual colors are covered by the browser regression.
- Dependency notices were regenerated from actual installed license files, including the installed macOS `fsevents` package. The notices generator now preserves the accurate supplied-logo/package statement and records the bundled PostCSS list helper. No new dependency was added.

The earlier run above preceded concurrent interface edits, which were preserved; the draft checks now also exercise the updated interface. Current Windows/Linux browser rendering and current remote Actions were not run. No npm publication, GitHub push, deployment, or Apply to the user's website was performed. The historical occupied-port and old-logo packaging observations below have been superseded: default startup now searches free port pairs, explicit pairs reject either occupied port, and the supplied PNG/logo crop are included in the production editor and tarball.

## Earlier release checks

The following earlier checks used macOS arm64 and Node 24.11.1 unless otherwise noted.

## Global installation and launch update

The current package is `design-studio-workspace@0.1.0`, still private and unpublished; its executable remains `design-studio`. On 2026-10-11, `npm view design-studio-workspace name version --json` returned E404 from the npm registry. That establishes no current public package at that name, not a reservation or guaranteed publishing eligibility.

Built `/tmp/design-studio-workspace-0.1.0.tgz` using `npm pack --pack-destination /tmp`. Installed it with `npm install --global --prefix "$launch_root/global tools" /tmp/design-studio-workspace-0.1.0.tgz`, where the temporary validation root was a macOS temporary directory named `design studio launch 2BNvgV`. Explicitly installed the separate copied React/Vite example's dependencies with `npm install`. Set PATH to `$launch_root/global tools/bin:$PATH`, changed into `$launch_root/my website`, and ran the executable by name. Both the global installation prefix and website path contained spaces.

Verified:

- Bare `design-studio` resolved the current website and served the installed bundle at 4310, with actual-project preview at 4311. macOS opened a new Chrome tab automatically; browser inspection showed the editor and the real Fieldwork website iframe.
- `design-studio --no-open --port 4410` used 4410/4411. A browser-command recorder received no invocation. HTML, compiled JS and bundled WOFF2 assets loaded from the global package; source files and manifests were unchanged by launch.
- `design-studio dev --project "$launch_root/my website" --no-open --port 4410` worked from outside the website. Implicit `dev` with `--project` also worked. Browser dispatch received the editor URL; a simulated nonzero browser-command exit printed the manual-open URL.
- Occupied editor port: exit code 1 and instructions to choose two free consecutive ports. Occupied preview port: editor stayed available, reported the unavailable preview and the same remedy.
- Separate missing React, React DOM and Vite cases reported the missing package and an explicit website installation command. No website dependencies were installed automatically. A missing dependency imported by the website's Vite config also produced installation guidance.
- Installed `--help`, `-h`, `help`, `inspect`, `presets`, `preset`, `registry-validate`, `history`, `export-skill`, Apply/dry-run and rollback/dry-run all worked. `recover` without an ID retained its required-ID error; actual recovery remains covered by filesystem integration tests.
- Apply preserved the website manifest. After stopping Design Studio, `npm run dev -- --port 4435` started the independent website and served the applied token stylesheet. Rollback restored original website files byte-for-byte and removed the managed token layer.

`npm test` passed all 34 tests; `npm run typecheck` and the pack build passed. Three focused CLI/path tests also passed after adding an encoded Windows file-URL case. Windows path resolution is tested with `path.win32` and `fileURLToPath(..., {windows:true})`; native Windows/Linux browser launch and global-install smoke tests still need their respective operating systems. No npm publication, deployment, push or external messaging was performed.

## Automated checks

- `npm test`: 30 tests passed. Includes configuration/provenance round trips, variant validation, cached offline fonts and corruption detection, CLI executable symlinks, inspection exclusions, CSS preservation, stale reviews, multi-file failure restoration, interrupted transaction recovery and rollback conflicts.
- `npm run build`: TypeScript checks, production editor build and compiled CLI passed. Vite reports a large JavaScript chunk (about 913 kB before gzip); this remains a limitation.
- After fixing persistent typography specificity, 14 apply/workspace tests were rerun, including migration of older generated typography rules; all passed.
- `npm run registry:validate`: 24 presets passed schema, provenance/license, referenced asset and glyph-verification hash checks.
- `scripts/verify-fonts.py` ran with fonttools/brotli: actual bundled Noto Sans/Serif 400/700 normal assets cover the English, Russian and Kazakh alphabets. This does not verify the entire Fontsource catalog.

## Packed CLI and actual browser checks

Built with `npm pack --cache /tmp/design-studio-npm-cache --pack-destination /tmp/design-studio-release`. The explicit cache avoids the validation sandbox's unwritable default npm cache; no ownership changes were made. Inspected the tarball file list: editor, compiled CLI, starter fonts, license texts, documentation and screenshot are included; environment files, source backups, caches, dependencies and the unverified user-supplied raster logo are excluded.

Installed the tarball into `/tmp/design studio installed` and launched its `node_modules/.bin/design-studio` executable against `/tmp/design studio website`, a separate installed React/Vite example. Both paths contain spaces. The editor and application bound to loopback ports 4420 and 4421. Browser checks used Playwright with the installed Chrome executable; the browser plugin was unavailable.

Verified in the actual website iframe:

1. Import a preset-derived custom configuration; Save Design, reload and reopen preserve the exact configuration and font variant.
2. Heading Inter 500 italic with variable axis, body Noto Sans 400 normal, base size 18, line height 1.8 and scale 1.25 remain selected.
3. Simulated font request failure reports loading/failed states, uses an actual fallback in the iframe and retains the selected configuration. Retry loads the exact cached variant. Cached and download-required variants have distinct status; catalog choices still state **Language coverage not verified**.
4. Light primary `#123456` and Dark primary `#ABCDEF` update independently.
5. Generate Prompt contains the same selected configuration. Export Agent Skill includes that configuration, every referenced font URL, source/font licenses and a valid ZIP.
6. CLI dry-run and UI Review make no website changes. UI Apply includes HTML, CSS, selected font assets, configuration and notices; preserves the dependency manifest and an unrelated user file.
7. Real desktop (1440 × 1000) and mobile (390 × 844) screenshots show usable controls; the toolbar remains visible when scrolled, the editor has no horizontal overflow and no page exceptions were recorded.

## Independent website and rollback

Stopped Design Studio and started the website with its own `npm run dev -- --port 4435`. Verified actual loaded font faces (Inter Variable 100–900 italic and Noto Sans 400), computed heading weight/style/size, both theme values, and working button interactions. No request depended on the stopped editor ports.

This caught an initial persistent scale failure: the website's later `h1` rule overrode the selected size. Managed typography now uses the selected scope's specificity; the corrected packed CLI was reinstalled and the independent website then rendered the expected **54.93px** heading.

Packed rollback dry-run left files unchanged. A temporary edit after Apply produced a conflict and was preserved. After explicitly removing that test edit, rollback restored the original CSS, HTML and manifest byte-for-byte, removed created assets and preserved unrelated work. The restored example also built successfully with its own Vite.

## Opaque Background layers — 2026-10-11

Reproduced Background changing the mapped body color while literal white page wrappers and sections covered it. The preview now reports sampled large opaque backgrounds and opens the existing mapping dialog filtered by `background`; users select the exact declarations to migrate. This does not rewrite source or recolor unrelated surfaces automatically.

The focused packed-CLI browser scenario uses a separate React/Vite project and relocated installation, both with spaces in their paths. It checks the warning and explicit mapping, Light/Dark computed wrapper and section colors, an unchanged small white brand surface, Undo/Redo, Original/Edited, saved configuration/prompt/skill consistency, reviewed Apply, independent development/production startup, color-only font preservation and rollback. Build/type checks and 21 targeted project/workspace tests passed on macOS with Node 22.12.0.

The broader optional browser run stopped in the separate preset-showcase interaction test: editor chrome intercepted the Sign in click. That full run is not recorded as passing. No current Windows/Linux browser run, GitHub push or website Apply was performed. Background diagnostics sample nine viewport positions; gradients, images, pseudo-elements and off-screen layers require manual inspection.

## Remaining validation limits

Windows/Linux smoke tests, a live npm registry release and GitHub publication are separate from these local results. Additional framework/styling adapters are unsupported. Only bundled font coverage is exposed as verified; names or Fontsource subset labels do not establish coverage. Abrupt multi-file interruption needs explicit recovery, and concurrent user edits may require manual conflict resolution. The tarball is locally installable; the public npm name `design-studio` is occupied by an unrelated package; the prepared package name is `design-studio-workspace`.
