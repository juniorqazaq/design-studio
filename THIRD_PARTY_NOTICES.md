# Third-party notices

Original application code and preset compositions: MIT; see LICENSE. Redistributed source material retains the licenses below. Selected exports include only the sources they use. Fonts are unmodified; CSS paths were adapted.

## UI UX Pro Max

Copyright (c) 2024 Next Level Builder

Source: [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)

Pin: `67803eac81607188194aea9842a723b89326d90d`. Usage: **adapted**.

Paths: `src/ui-ux-pro-max/data/styles.csv`, `src/ui-ux-pro-max/data/colors.csv`.

Modifications: Selected palette/style rows; semantic mapping and condensed guidance. Typography replaced with verified Noto fonts.

Complete license: [licenses/ui-ux-pro-max.txt](licenses/ui-ux-pro-max.txt); upstream `LICENSE`.

## Anthropic Frontend Design

Anthropic; frontend-design authors

Source: [Anthropic Frontend Design](https://github.com/anthropics/skills)

Pin: `dbd4588f9e1033efb41dad4bef2f7947c8993d44`. Usage: **adapted**.

Paths: `skills/frontend-design/SKILL.md`.

Modifications: Selected design-direction guidance rewritten for preset exports; full upstream skill excluded.

Complete license: [licenses/anthropic-frontend-design.txt](licenses/anthropic-frontend-design.txt); upstream `skills/frontend-design/LICENSE.txt`.

## Radix Colors

Copyright (c) 2021-2022 Modulz; Copyright (c) 2022-Present WorkOS

Source: [Radix Colors](https://github.com/radix-ui/colors)

Pin: `dbdb85470547c7d34b9001f48fddb08ded335979`. Usage: **adapted**.

Paths: `src/light.ts`, `src/dark.ts`.

Modifications: Selected twelve-step scales mapped to five roles and supporting tokens.

Complete license: [licenses/radix-colors.txt](licenses/radix-colors.txt); upstream `LICENSE`.

## daisyUI

Copyright (c) 2020 Pouya Saadeghi

Source: [daisyUI](https://github.com/saadeghi/daisyui)

Pin: `8c24218588f34a678f48df435950790b57ef2bf7`. Usage: **adapted**.

Paths: `packages/daisyui/src/themes/corporate.css`, `packages/daisyui/src/themes/retro.css`, `packages/daisyui/src/themes/business.css`, `packages/daisyui/src/themes/nord.css`.

Modifications: Four theme definitions mapped to semantic roles; OKLCH clamped to sRGB; missing themes generated locally.

Complete license: [licenses/daisyui.txt](licenses/daisyui.txt); upstream `packages/daisyui/LICENSE`.

## Open Props

Copyright (c) 2021 Adam Argyle

Source: [Open Props](https://github.com/argyleink/open-props)

Pin: `530682d04327f842f56bb1ec33cf84a3cadb3876`. Usage: **adapted**.

Paths: `src/props.sizes.js`, `src/props.borders.js`.

Modifications: Selected spacing and radius tokens converted from rem to px at 16px.

Complete license: [licenses/open-props.txt](licenses/open-props.txt); upstream `LICENSE`.

## Fontsource Noto Sans

Copyright 2022 The Noto Project Authors (https://github.com/notofonts/latin-greek-cyrillic) NotoSans-Italic[wdth,wght].ttf: Copyright 2022 The Noto Project Authors (https://github.com/notofonts/latin-greek-cyrillic)

Source: [Fontsource Noto Sans](https://github.com/fontsource/fontsource)

Pin: `@fontsource/noto-sans@5.3.0`. Usage: **copied**.

Paths: `LICENSE`, `metadata.json`, `files/noto-sans-latin-400-normal.woff2`, `files/noto-sans-latin-700-normal.woff2`, `files/noto-sans-cyrillic-400-normal.woff2`, `files/noto-sans-cyrillic-700-normal.woff2`, `files/noto-sans-cyrillic-ext-400-normal.woff2`, `files/noto-sans-cyrillic-ext-700-normal.woff2`.

Modifications: Unmodified static 400/700 normal WOFF2 subsets; CSS paths rewritten for local hosting.

Complete license: [licenses/noto-sans.txt](licenses/noto-sans.txt); upstream `package/LICENSE`.

## Fontsource Noto Serif

Copyright 2022 The Noto Project Authors (https://github.com/notofonts/latin-greek-cyrillic) NotoSerif-Italic[wdth,wght].ttf: Copyright 2022 The Noto Project Authors (https://github.com/notofonts/latin-greek-cyrillic)

Source: [Fontsource Noto Serif](https://github.com/fontsource/fontsource)

Pin: `@fontsource/noto-serif@5.3.0`. Usage: **copied**.

Paths: `LICENSE`, `metadata.json`, `files/noto-serif-latin-400-normal.woff2`, `files/noto-serif-latin-700-normal.woff2`, `files/noto-serif-cyrillic-400-normal.woff2`, `files/noto-serif-cyrillic-700-normal.woff2`, `files/noto-serif-cyrillic-ext-400-normal.woff2`, `files/noto-serif-cyrillic-ext-700-normal.woff2`.

Modifications: Unmodified static 400/700 normal WOFF2 subsets; CSS paths rewritten for local hosting.

Complete license: [licenses/noto-serif.txt](licenses/noto-serif.txt); upstream `package/LICENSE`.

## Fontsource family metadata catalog

Metadata-only snapshot from https://api.fontsource.org/v1/fonts, retrieved 2026-10-11: 2,100 family names/IDs, categories, weights, styles, subsets and variable availability. Documentation: https://fontsource.org/docs/api/fonts. Source record: src/registry/data/font-catalog-source.json. No additional font binaries are bundled by this catalog. On-demand selected assets come from exact-version @fontsource or @fontsource-variable npm packages, preserving each package's complete LICENSE and copyright attribution in the local cache and skill exports. Subset metadata is not a glyph-coverage certification.

## Software dependency licenses

Generated from the installed package manifests and actual license files pinned by package-lock.json. React/react-dom/scheduler are bundled in the browser editor; Vite, PostCSS and their production transitives run the CLI/server. Development-only tools are not runtime requirements. Complete texts and any accompanying notices are retained in licenses/dependencies/. Dependencies installed by npm also retain their own notices.

| Software | Purpose/scope | Manifest license | Official repository | Redistribution text |
| --- | --- | --- | --- | --- |
| @esbuild/darwin-arm64 0.28.2 | Runtime dependency | MIT | https://github.com/evanw/esbuild | [Actual license](licenses/dependencies/esbuild-darwin-arm64-0.28.2.txt) (matching-version parent license; binary package has no standalone license text) |
| @rollup/rollup-darwin-arm64 4.64.5 | Runtime dependency | MIT | https://github.com/rollup/rollup | [Actual license](licenses/dependencies/rollup-rollup-darwin-arm64-4.64.5.txt) (matching-version parent license; binary package has no standalone license text) |
| @types/estree 1.0.9 | Runtime dependency | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped | [Actual license](licenses/dependencies/types-estree-1.0.9.txt) |
| @types/node 24.19.2 | Runtime dependency | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped | [Actual license](licenses/dependencies/types-node-24.19.2.txt) |
| @types/react 19.3.0 | Development/build | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped | [Actual license](licenses/dependencies/types-react-19.3.0.txt) |
| @types/react-dom 19.3.0 | Development/build | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped | [Actual license](licenses/dependencies/types-react-dom-19.3.0.txt) |
| csstype 3.2.3 | Development/build | MIT | https://github.com/frenic/csstype | [Actual license](licenses/dependencies/csstype-3.2.3.txt) |
| esbuild 0.28.2 | Runtime dependency | MIT | https://github.com/evanw/esbuild | [Actual license](licenses/dependencies/esbuild-0.28.2.txt) |
| fdir 6.5.0 | Runtime dependency | MIT | https://github.com/thecodrr/fdir | [Actual license](licenses/dependencies/fdir-6.5.0.txt) |
| nanoid 3.3.20 | Runtime dependency | MIT | ai/nanoid | [Actual license](licenses/dependencies/nanoid-3.3.20.txt) |
| picocolors 1.1.1 | Runtime dependency | ISC | alexeyraspopov/picocolors | [Actual license](licenses/dependencies/picocolors-1.1.1.txt) |
| picomatch 4.0.7 | Runtime dependency | MIT | micromatch/picomatch | [Actual license](licenses/dependencies/picomatch-4.0.7.txt) |
| postcss 8.5.29 | Runtime dependency | MIT | postcss/postcss | [Actual license](licenses/dependencies/postcss-8.5.29.txt) |
| react 19.3.0 | Development/build | MIT | https://github.com/react/react | [Actual license](licenses/dependencies/react-19.3.0.txt) |
| react-dom 19.3.0 | Development/build | MIT | https://github.com/react/react | [Actual license](licenses/dependencies/react-dom-19.3.0.txt) |
| rollup 4.64.5 | Runtime dependency | MIT | https://github.com/rollup/rollup | [Actual license](licenses/dependencies/rollup-4.64.5.txt) |
| scheduler 0.28.0 | Development/build | MIT | https://github.com/react/react | [Actual license](licenses/dependencies/scheduler-0.28.0.txt) |
| source-map-js 1.2.2 | Runtime dependency | BSD-3-Clause | 7rulnik/source-map-js | [Actual license](licenses/dependencies/source-map-js-1.2.2.txt) |
| tinyglobby 0.2.17 | Runtime dependency | MIT | https://github.com/SuperchupuDev/tinyglobby | [Actual license](licenses/dependencies/tinyglobby-0.2.17.txt) |
| tsx 4.23.15 | Runtime dependency | MIT | privatenumber/tsx | [Actual license](licenses/dependencies/tsx-4.23.15.txt) |
| typescript 5.9.3 | Development/build | Apache-2.0 | https://github.com/microsoft/TypeScript | [Actual license](licenses/dependencies/typescript-5.9.3.txt) |
| undici-types 7.24.6 | Runtime dependency | MIT | https://github.com/nodejs/undici | [Actual license](licenses/dependencies/undici-types-7.24.6.txt) |
| vite 7.3.7 | Runtime dependency | MIT | https://github.com/vitejs/vite | [Actual license](licenses/dependencies/vite-7.3.7.txt) |

### Platform-conditional packages

These optional packages are not installed on this macOS/arm64 validation host and are not embedded in the tarball. Their lockfile metadata is listed here, not represented as an independently inspected license text. npm selects platform binaries at installation. Their parent esbuild or Rollup package retains its inspected license, and the installed binary package must retain its upstream license. Other platforms require smoke testing.

- node_modules/@esbuild/aix-ppc64: 0.28.2; MIT
- node_modules/@esbuild/android-arm: 0.28.2; MIT
- node_modules/@esbuild/android-arm64: 0.28.2; MIT
- node_modules/@esbuild/android-x64: 0.28.2; MIT
- node_modules/@esbuild/darwin-x64: 0.28.2; MIT
- node_modules/@esbuild/freebsd-arm64: 0.28.2; MIT
- node_modules/@esbuild/freebsd-x64: 0.28.2; MIT
- node_modules/@esbuild/linux-arm: 0.28.2; MIT
- node_modules/@esbuild/linux-arm64: 0.28.2; MIT
- node_modules/@esbuild/linux-ia32: 0.28.2; MIT
- node_modules/@esbuild/linux-loong64: 0.28.2; MIT
- node_modules/@esbuild/linux-mips64el: 0.28.2; MIT
- node_modules/@esbuild/linux-ppc64: 0.28.2; MIT
- node_modules/@esbuild/linux-riscv64: 0.28.2; MIT
- node_modules/@esbuild/linux-s390x: 0.28.2; MIT
- node_modules/@esbuild/linux-x64: 0.28.2; MIT
- node_modules/@esbuild/netbsd-arm64: 0.28.2; MIT
- node_modules/@esbuild/netbsd-x64: 0.28.2; MIT
- node_modules/@esbuild/openbsd-arm64: 0.28.2; MIT
- node_modules/@esbuild/openbsd-x64: 0.28.2; MIT
- node_modules/@esbuild/openharmony-arm64: 0.28.2; MIT
- node_modules/@esbuild/sunos-x64: 0.28.2; MIT
- node_modules/@esbuild/win32-arm64: 0.28.2; MIT
- node_modules/@esbuild/win32-ia32: 0.28.2; MIT
- node_modules/@esbuild/win32-x64: 0.28.2; MIT
- node_modules/@napi-rs/lzma-linux-x64-gnu: 1.5.1; MIT
- node_modules/@rollup/rollup-android-arm-eabi: 4.64.5; MIT
- node_modules/@rollup/rollup-android-arm64: 4.64.5; MIT
- node_modules/@rollup/rollup-darwin-x64: 4.64.5; MIT
- node_modules/@rollup/rollup-freebsd-arm64: 4.64.5; MIT
- node_modules/@rollup/rollup-freebsd-x64: 4.64.5; MIT
- node_modules/@rollup/rollup-linux-arm-gnueabihf: 4.64.5; MIT
- node_modules/@rollup/rollup-linux-arm-musleabihf: 4.64.5; MIT
- node_modules/@rollup/rollup-linux-arm64-gnu: 4.64.5; MIT
- node_modules/@rollup/rollup-linux-arm64-musl: 4.64.5; MIT
- node_modules/@rollup/rollup-linux-loong64-gnu: 4.64.5; MIT
- node_modules/@rollup/rollup-linux-loong64-musl: 4.64.5; MIT
- node_modules/@rollup/rollup-linux-ppc64-gnu: 4.64.5; MIT
- node_modules/@rollup/rollup-linux-ppc64-musl: 4.64.5; MIT
- node_modules/@rollup/rollup-linux-riscv64-gnu: 4.64.5; MIT
- node_modules/@rollup/rollup-linux-riscv64-musl: 4.64.5; MIT
- node_modules/@rollup/rollup-linux-s390x-gnu: 4.64.5; MIT
- node_modules/@rollup/rollup-linux-x64-gnu: 4.64.5; MIT
- node_modules/@rollup/rollup-linux-x64-musl: 4.64.5; MIT
- node_modules/@rollup/rollup-openbsd-x64: 4.64.5; MIT
- node_modules/@rollup/rollup-openharmony-arm64: 4.64.5; MIT
- node_modules/@rollup/rollup-win32-arm64-msvc: 4.64.5; MIT
- node_modules/@rollup/rollup-win32-ia32-msvc: 4.64.5; MIT
- node_modules/@rollup/rollup-win32-x64-gnu: 4.64.5; MIT
- node_modules/@rollup/rollup-win32-x64-msvc: 4.64.5; MIT
- node_modules/fsevents: 2.3.3; MIT

## UX inspiration and branding assets

Realtime Colors (https://www.realtimecolors.com/) inspired persistent semantic color controls, type scale and randomization. Repository inspection found no imported Realtime Colors source or artwork: registry source records, resource fetch scripts and bundled files identify the actual imports above. Its interface and artwork are not redistributed.

The legacy SVG wordmark and inline editor/representative-preview icons are original project code under the existing MIT license. The current user-supplied logo is copied unchanged to public/design-studio-logo.png; public/design-studio-favicon.png is a separate crop of its colored emblem. Both are included in the production editor and npm tarball. The supplied artwork's origin and license have not been documented, and no MIT or other license grant is claimed for either image. The original supplied file remains in ignored .local/. The existing interface screenshot in docs/ predates this logo update and shows the legacy wordmark and bundled licensed fonts.
