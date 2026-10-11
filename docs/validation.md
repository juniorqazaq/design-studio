# Release validation

Validated locally on 2026-10-11 with macOS arm64, Node 24.11.1, npm and Chrome. This records actual checks, not a claim that every project or platform is supported.

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

## Remaining validation limits

Windows/Linux smoke tests, a live npm registry release and GitHub publication are separate from these local results. Additional framework/styling adapters are unsupported. Only bundled font coverage is exposed as verified; names or Fontsource subset labels do not establish coverage. Abrupt multi-file interruption needs explicit recovery, and concurrent user edits may require manual conflict resolution. The tarball is locally installable; the public npm name `design-studio` is occupied by an unrelated package; the prepared package name is `design-studio-workspace`.
