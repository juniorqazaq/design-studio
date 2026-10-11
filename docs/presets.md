# Preset registry and contributions

Normal build and use are offline. `src/registry/data/snapshots.json` contains selected reviewed rows/scales/theme definitions/tokens, not full repositories. `src/registry/build.ts` combines them into 24 original compositions. The explicit adapters in `src/registry/adapters.ts` never evaluate upstream JavaScript: Radix literal HEX scales map steps 12/1/9/4 to text/background/primary/secondary; UI UX columns map five roles; daisyUI literal OKLCH values convert to clamped sRGB; Open Props literal rem values convert at 16px. The complementary mode for single-theme sources is generated locally and disclosed in provenance. Preset typography and layout are curated compositions, not copied upstream pairs.

## Add an original composition

1. Copy `examples/preset-template.json`; give both preset and `config.preset` a new matching ID/name. Keep schema version 1. Include readable description, nonempty style/category tags, both themes, guidance, accurate dominant-color and typography filters, and original composition metadata.
2. Edit five semantic colors in each mode; supporting values may be derived or explicitly overridden. Use only validated font keys/weights and config ranges. Language badges require both selected fonts to be verified bundled families, not a platform fallback.
3. Keep the relevant full pinned records from `sources.json` in both `provenance` and `config.provenance`. Do not invent or edit license metadata. If you remove a source's material, remove its record; retain selected font notices.
4. Recalculate `accessibility.light`/`dark` with shared `contrastChecks(config, theme)`. Creative failures are accepted, but accurate results must remain visible. `componentGuidance` must equal `config.preset.guidance`.
5. Validate the candidate: `npm run registry:validate -- ./my-preset.json`. Add a recipe in `build.ts`, then run `npm run registry:build`, `npm run registry:validate`, `npm test`, and `npm run build`. Review in both themes with English/Russian/Kazakh samples and keyboard/mobile controls.

The validator checks unique IDs, schema, colors, themes, font references/coverage hash freshness, provenance/license records, accurate contrast results, and every required exported file. It does not claim a complete rendered accessibility audit.

## Review and update sources explicitly

Automatic synchronization is absent. `python3 scripts/fetch-sources.py /private/tmp/reviewed-design-sources` downloads only the exact files/packages in the checked-in pinned catalog. It requires network access and is separate from build/runtime. It extracts only allowlisted regular font members, verifies the package SHA-512, and never executes source code or installs upstream skills. Review source content and actual license/NOTICE files before changing pins. New sources must be evaluated and added explicitly; URL text is not evidence of permission or license compatibility.

`python3 scripts/prepare-snapshots.py /private/tmp/reviewed-design-sources` performs offline curation into snapshots, source records, complete license texts, and local assets. Review the resulting diff and attribution table. For changed font assets, use Python with `fontTools` and `brotli` to run `python3 scripts/verify-fonts.py`: this inspects actual cmap tables for every character of the full EN/RU/KK alphabets, independently at 400 and 700. Normal validation checks asset SHA-256 against that report; subset names alone never justify language claims. Rebuild and validate after every update. Do not substitute latest releases silently.

## Agent use and scope

`registry-router-SKILL.md` searches at most five summaries initially and loads only the selected full config. The selected skill bundle carries relevant guidance, source notices/licenses, and font files. Nothing executes copied data as instructions. Rank scores are deterministic heuristics, not an AI assessment. Core operation requires no AI key. AI matching, remote URL analysis, new framework apply adapters, and automated updates are future work, not implemented features.

The tested apply adapter consumes literal top-level CSS variables. Tailwind v4 and Sass exports are opt-in code formats, not automatic project migrations. Actual-app font preview requires importing the font CSS into that cooperating app; the bridge injects tokens only. Preserve license notices whenever redistributing source material or bundled fonts.
