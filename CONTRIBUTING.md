# Contributing

Use Node.js 22.12+ and run `npm install`, `npm test`, and `npm run build`. Start `npm run dev` to check the interface. Validate changes in both themes and at desktop/mobile widths, using keyboard input as well as pointer controls.

Keep configuration as the source of truth. Changes to schema, token derivation, exports, or mappings must also reach the CLI, preview, example configuration/skill, and documentation. Regenerate examples with the shared functions after changing defaults. A schema-breaking change needs an explicit version/migration; do not silently reinterpret saved configurations.

New adapters need tests proving dry-run does not write, apply preserves unrelated rules/comments/local edits, unsupported patterns fail safely, and retries cannot overwrite changes since planning. Never execute inspected code or read environment/secrets for analysis. Do not introduce source uploads, telemetry, network font requirements, or API-key requirements into the core workflow.

For bug reports, include Node/OS versions, the command or editor flow, and a minimal sanitized CSS/config fixture. Avoid uploading a whole private project or secret files. Submit focused changes with relevant validation. Run npm pack and install the resulting tarball in an isolated tools directory before release. Verify a separate React/Vite project after stopping Design Studio, including fonts and safe rollback. Do not publish to npm or deploy without explicit authorization.

For presets, start with [the template](examples/preset-template.json) and follow [the registry contribution/update workflow](docs/presets.md). Run `npm run registry:validate` in addition to the normal checks. License changes require review of the actual pinned files and an update to README’s Design Sources and Attribution table, THIRD_PARTY_NOTICES.md, licenses/, and machine-readable provenance.
