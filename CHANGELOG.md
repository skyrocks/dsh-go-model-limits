# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.2] - 2026-11-09

### Changed

- Show `$60` in blue and `$20` in orange, so the common Go prices read as red / orange / magenta /
  blue / green instead of sharing warm tones.

## [0.1.1] - 2026-11-09

### Changed

- Colour every distinct monthly-limit value separately instead of four shared ranges, so `$30`
  and `$60` no longer render in the same colour. `Unlimited` keeps a dedicated gradient.

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
