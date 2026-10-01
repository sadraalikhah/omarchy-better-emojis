# Settings and shortcuts

## Runtime requirements

| Requirement | Purpose |
| --- | --- |
| Omarchy with its Quickshell shell | Plugin loading, overlay routing, theme tokens, and shared `qs.Commons` and `qs.Ui` components. |
| A Wayland desktop | Overlay window and clipboard integration. |
| `wl-copy` | Copy-only mode and clipboard retention after insertion. |
| Omarchy's `omarchy-menu-emoji-insert` helper and `wtype` | Insertion into the focused app through Shift + Insert. |
| Noto Color Emoji | Emoji rendering. |
| An Omarchy Nerd Font | Category and navigation icons. |

Normal selection uses the Omarchy insertion helper, then writes the emoji to
the regular clipboard. Copy-only mode invokes `wl-copy` directly. The picker
has no runtime network lookup.

Git is needed for installation and updates. Node.js runs the development
tests. Python 3 runs the dataset generator.

## Keyboard shortcuts

| Key | Emoji view | Settings view |
| --- | --- | --- |
| `Super + Ctrl + E` | Opens the replacement through the standard Omarchy binding. | Opens the replacement through the standard Omarchy binding. |
| Printable text and Backspace | Edits the search. | Does not edit the search. |
| `Tab` / `Shift + Tab` | Next or previous category. | Next or previous enabled Settings group. |
| `Ctrl + 1` through `Ctrl + 9` | Selects category tab 1 through 9. | Selects the category used on return to the grid. |
| Left / Right | Moves the emoji cursor horizontally. | Selects a preset within the current group. |
| Up / Down | Moves the emoji cursor by a row. | Previous or next enabled Settings group. |
| `Page Up` / `Page Down` | Moves by a visible page of rows. | No action. |
| `Enter` | Inserts the highlighted emoji. | Activates the current option, toggle, or button. |
| `Ctrl + Enter` | Copies the highlighted emoji. | Activates the current Settings control. |
| Space | Adds a space to the search. | Activates the current Settings control. |
| `Ctrl + S` or `Ctrl + ,` | Opens Settings. | Returns to emojis. |
| `Ctrl + T` | Cycles the default skin tone. | Cycles the default skin tone. |
| `Ctrl + G` | Cycles male, female, and person display when genders are combined. | Same action. |
| `Esc` | Clears a nonempty search; otherwise dismisses the picker. | Dismisses the picker. |

The `Super + Ctrl + E` binding belongs to Omarchy. The plugin claims the
built-in `omarchy.emojis` implementation through its manifest.

## Settings defaults

| Setting key | Default | Values or behavior |
| --- | --- | --- |
| `cellSize` | `46` | Normal `46`, Large `58`, Extra Large `72`. |
| `cardWidth` | `480` | Normal `480`, Wide `620`, Extra Wide `780`. |
| `cardHeight` | `560` | Normal `560`, Tall `720`, Extra Tall `900`. |
| `skinTone` | `0` | `0` is the base emoji; `1` through `5` select light through dark tones. |
| `showAllTones` | `false` | Displays the base and five supported tone variants together. |
| `showAllGenders` | `false` | Displays gender variants separately when enabled. |
| `mergeGenders` | `true` | Internal counterpart to `showAllGenders`. |
| `genderMode` | `0` | `0` male, `1` female, `2` person, with fallback to available variants. |
| `showRecents` | `true` | Shows the Recent category. |
| `showCategoryTitles` | `false` | Adds labels beside category icons. |
| `learnSelections` | `true` | Records deliberate selections and applies query-specific tie-breaks. |
| `lastCategory` | `"all"` | Remembers the most recently selected category. |
| `recents` | `[]` | Up to 30 selected emoji strings, with applied tones preserved. |

Sizing values pass through Omarchy's style scaling. The picker width snaps
to whole emoji columns, and its dimensions are constrained by the screen.
The table lists stored preset values, rather than guaranteed physical pixels.

## Categories and display

Tabs appear in this order: All, Recent when enabled, Smileys & Emotion,
People & Body, Animals & Nature, Food & Drink, Activities, Travel & Places,
Objects, Symbols, and Flags.

Searching spans categories. The grid receives up to 1,000 matching base
entries per rebuild, then applies gender grouping and tone expansion.
The dataset contains 1,914 base entries; category browsing and search use
that same dataset.

Tooltips display the English name after a 600 ms pause. They hide when the
selection changes, the grid moves, the selected cell leaves the viewport,
Settings opens, or the picker closes.

## Stored state

The default plugin ID is `wessel.better-emojis`. The state directory is:

```text
~/.local/state/omarchy/plugins/wessel.better-emojis/
```

| File | Contents |
| --- | --- |
| `settings.json` | Layout settings, variant settings, recent selections, last category, and the learning toggle. |
| `learning.json` | Versioned, query-specific selection evidence. |

The QML component derives this path from `$HOME` and the manifest's plugin ID.
It keeps state outside the installed source checkout. Both files use atomic
writes. Learning records normalized queries, emoji identifiers, counts,
weights, and timestamps. It does not keep a full selection-event log.

Malformed learning files or unsupported learning versions load as empty
preferences. Invalid individual records are ignored. Saved settings load
through the plugin's defaults and option validation.

## Learning limits

| Limit | Value |
| --- | --- |
| Stored normalized queries | 128 |
| Emoji preferences per query | 8 |
| Query length accepted for learning | 120 JavaScript string code units |
| Selection count and accumulated weight | Capped at 20 per emoji and query |
| Repeated choices required | 3 |
| Weight half-life | 30 days |
| Minimum effective weight | 1 |

Recent queries and choices remain when storage reaches its limits.
Learning uses the matched base entry as its identifier, so expanded skin
tones and displayed gender variants retain their source match identity.
