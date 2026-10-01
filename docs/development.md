# Develop and maintain the plugin

## Set up a working copy

```bash
git clone https://github.com/sadraalikhah/omarchy-better-emojis.git
cd omarchy-better-emojis
git remote add upstream https://github.com/Wessel-Boers/omarchy-better-emojis.git
```

Use Node.js to run tests and Python 3 to regenerate data. The generator uses
Python's standard library. Desktop verification requires the Omarchy runtime
listed in [Settings and shortcuts](reference.md#runtime-requirements).

## Run the checks

```bash
node tests/emoji-data.test.js
node tests/search-preferences.test.js
omarchy plugin validate .
git diff --check
```

The current suites contain 32 tests. They cover bilingual search, aliases,
ranking, typo fallback, gender and tone display, clipboard helper ordering,
preference limits, decay, reloads, and resets.

## Verify changes on the desktop

1. Save a copy of the installed plugin and its state before replacing files.
2. Copy the working source to `~/.config/omarchy/plugins/io.github.sadraalikhah.better-emojis/`.
   Include QML, JavaScript modules, data, scripts, and the manifest.
3. Run `omarchy plugin validate` against that directory.
4. Run `omarchy-shell shell rescanPlugins`.
5. Open the picker and exercise the changed behavior with the mouse and
   keyboard. Inspect the displayed result and runtime logs.

The installed user plugin hot-reloads when its files change. Edit the user
copy rather than `/usr/share/omarchy/`. Keep the installed directory free of
symlinks, because Omarchy's plugin validator rejects them.

For search preferences, verify this sequence with isolated test state:

1. Search `moan` and check the initial order, 😮‍💨 then 😩.
2. Accept the automatic first result and check that it creates no evidence.
3. Hover over an emoji and check that it creates no evidence.
4. Deliberately select 😩 three times, using keyboard navigation or clicks.
5. Reopen `moan` and check that 😩 comes first.
6. Search `moaning` and check that its original order is unchanged.
7. Disable learning and check that `moan` returns to its original order.
8. Reload the component and check that the toggle and saved evidence persist.
9. Enable learning, reset the query, and check the original order again.
10. Exercise reset-all, Settings keyboard navigation, and the name tooltip.

Use a temporary `$HOME` for fixture state when running an isolated QML test.
Keep clipboard and insertion helpers isolated too, so test selections do not
paste into the currently focused app. A temporary state directory must contain
both settings and learning when testing reload behavior.

## Change curated aliases

1. Edit `tools/aliases.json`. Each base emoji maps to `en` and `fa` arrays.
   Keep phrases as separate strings:

   ```json
   {
   	"😩": {
   		"en": ["moan", "moaning", "overwhelmed"],
   		"fa": ["ناله", "داغونم"]
   	}
   }
   ```

2. Add a test for the intended query and expected emoji.
3. Regenerate the dataset:

   ```bash
   python3 tools/generate_emoji_data.py
   ```

4. Run both test suites and inspect the data diff.
5. Commit the alias file, generated dataset, and matching tests together.

Add only terms that describe the emoji's intended use. The generator rejects
alias keys absent from its Unicode input. Keep personalization in
`SearchPreferences.js`; selections must not rewrite the curated database.

## Regenerate the dataset

The generator pins Unicode Emoji 17.0, CLDR `release-48-2`, and emojilib 4.0.3.
It downloads source data when it is not cached, then writes `emojis.json` in
Unicode order.

```bash
python3 tools/generate_emoji_data.py
```

The default cache is `omarchy-better-emojis-emoji-data` under Python's system
temporary directory. To use a specific cache directory:

```bash
EMOJI_DATA_CACHE=/tmp/better-emojis-source-cache python3 tools/generate_emoji_data.py
```

Cached source filenames include their version. Initial generation requires
network access; cached sources support later runs without downloading them.
Review changes to version pins, licenses, generated variants, and tests together.

## Check dataset counts

Run from the repository root:

```bash
python3 - <<'PY'
import json
from pathlib import Path
emojis = json.loads(Path('emojis.json').read_text())
aliases = json.loads(Path('tools/aliases.json').read_text())
print('Base entries:', len(emojis))
print('Emojis with curated aliases:', len(aliases))
print('Curated aliases:', sum(len(terms) for locales in aliases.values() for terms in locales.values()))
PY
```

At this documentation revision, the output is 1,914 base entries, 51 emojis
with curated aliases, and 367 aliases.

## Source layout

| Path | Responsibility |
| --- | --- |
| `manifest.json` | Plugin identity, overlay entry point, and built-in emoji routing. |
| `BetterEmojis.qml` | Overlay, input handling, Settings, display model, and state persistence. |
| `EmojiData.js` | Normalization, relevance scoring, categories, recents, gender grouping, and tones. |
| `SearchPreferences.js` | Validated learning state, bounded evidence, decay, query scores, and resets. |
| `emojis.json` | Generated bilingual emoji data. |
| `tools/aliases.json` | Curated English and Persian expressions. |
| `tools/generate_emoji_data.py` | Pinned source fetches and dataset generation. |
| `tools/insert-and-copy.sh` | Insertion helper invocation followed by persistent clipboard copy. |
| `tests/emoji-data.test.js` | Data, search, display, and clipboard behavior tests. |
| `tests/search-preferences.test.js` | Learning, ranking guarantees, decay, storage, and reset tests. |
| `docs/` | User guides, reference, search explanation, and development documentation. |

## Preserve ranking guarantees

When changing search or learning, keep these properties covered by tests:

- With empty or disabled preferences, search retains its baseline order.
- Preferences preserve the matching candidate set and category constraints.
- A lower base score cannot overtake a higher score, regardless of weight.
- Preferences apply only to the exact normalized query.
- Skin-tone expansion and gender display retain the matched entry's identity.
- Resetting a query restores its baseline order without clearing other queries.

## Commit and submit changes

Keep each commit focused on one behavior or a supporting change. Include tests
with the behavior they verify and update documentation when controls or
storage rules change.

For this fork, `origin` points to `sadraalikhah/omarchy-better-emojis`.
The original project is `upstream`. A push to the fork does not submit a pull
request to the original project.
