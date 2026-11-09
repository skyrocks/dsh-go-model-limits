# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-11-09

### Added

- First release: show the official OpenCode GO **Monthly limit** on each `opencode-go`
  model row in the DeepSeek Harness model picker.
- Hover tooltip with the Go / Go Plus / Go Teams limits and the current source/date.
- Colour-coded tags: `<$30` amber, `$30–$99` blue, `≥$100` green, unlimited violet.
- Runtime refresh: the host fetches `https://opencode.ai/docs/console/go.md`, maps names to the
  live `opencode-go` model directory and caches the result for 6 hours. A failed fetch keeps the
  last successful data.
- `scripts/sync-limits.mjs` builds the bundled fallback snapshot from the docs and
  `https://opencode.ai/inference/go/v1/models`.
- Official account and other providers keep their original name and badge; only the
  composer list rows of `opencode-go` get a tag.
- Zero npm dependencies and no API key; the only network call is the host fetching the public docs.
- Tests: docs parsing, name→id mapping, component rendering, host result codec, runtime override,
  manifest and bundle checks.
- README (zh/en) with illustrations, CI workflow and publishing checklist.
