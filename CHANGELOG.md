# Changelog

## Unreleased fork changes

This section describes the fork's changes beyond the original Better Emojis
source. The manifest retains the upstream version `0.3.0`; no separate fork
release version is declared here.

### Added

- Ranked English and Persian search using Unicode and CLDR names and keywords,
  supplemental emojilib terms, and curated colloquial expressions.
- 367 curated aliases across 51 emojis, including 😮‍💨 and 😩 for `moan`.
- Local search preferences that learn from repeated deliberate selections and
  reorder only equally relevant matches for the same normalized query.
- Settings controls to disable learning, reset one search, or reset all learning.
- A 600 ms emoji-name tooltip for mouse and keyboard selection.
- An optional Show category titles setting, off by default.
- Search, display, clipboard, and preference behavior tests.
- User guides, settings reference, search explanation, and development docs.

### Changed

- Category tabs show icons by default.
- Normal insertion leaves the selected emoji on the regular clipboard.
- Gender and skin-tone display share helpers with the test suite.
- Dataset generation pins Unicode Emoji 17.0, CLDR 48.2, and emojilib 4.0.3,
  with English and Persian annotations and preserved alias phrases.
- The installation URL points to this fork, with upstream attribution retained.

### Fixed

- Repeated aliases no longer accumulate phrase-ranking bonuses.
- Short-word substring matches no longer produce unrelated results such as
  Samoan flags for `moan`.
- Typo matching runs only when direct matches are absent, avoiding unrelated
  `morning` matches for `moaning`.
