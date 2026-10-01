# Search and learning

## Why learning only breaks ties

A preferred emoji can be useful for one expression without being relevant to
another. Learning therefore stores evidence for each normalized query and
uses it only after ordinary relevance scoring.

For `moan`, 😮‍💨 and 😩 are equally relevant alias matches. Three deliberate
selections of 😩 can put it first on the next search. Those selections do not
change `moaning`, `ناله`, or `face exhaling`, because each is a separate query.

The ranking order is:

1. Base relevance score, highest first.
2. Learned weight, highest first, only when base scores are equal.
3. Original dataset order when both values are equal.

Preferences never add matching candidates or alter their base scores. A
lower-scoring result cannot overtake a stronger match. A result limit can
change which tied candidates fit in the visible subset; it does not make an
unrelated emoji eligible.

## Query normalization

The same normalization applies to queries and searchable fields:

- Lowercase text and apply Unicode NFKC normalization where available.
- Normalize Arabic ي and ى to Persian ی, and Arabic ك to Persian ک.
- Remove Arabic diacritics and tatweel.
- Remove apostrophes.
- Convert separators, punctuation, and half-spaces into spaces.
- Collapse whitespace and trim the result.

English letters, digits, and the supported Arabic-script ranges remain.
Capitalization and equivalent spacing therefore share a preference. Distinct
phrases keep distinct preferences.

## Base relevance scoring

`EmojiData.js` indexes English and Persian names, keywords, curated aliases,
and supplemental English keywords. Alias arrays preserve each phrase as a
separate field. Legacy string aliases remain supported.

Every query word must match at least one indexed word. For each query word,
the scorer takes its best word score plus the field adjustment. It then adds
one phrase bonus, using the highest applicable bonus across fields.

| Word match | Score | Condition |
| --- | --- | --- |
| Exact word | 1,000 | Indexed word equals the query word. |
| Prefix | 750 | Indexed word starts with the query word. |
| Substring | 500 | Query word has at least five characters. |
| One-edit typo | 200 | Query word has 5 through 24 characters, indexed word has at least five, and fuzzy matching is enabled. |

Typo matching supports a single insertion, deletion, substitution, or adjacent
transposition. It runs only when the entire direct search has no matches.
Short words avoid substring matching, so `moan` does not match `Samoan`.

| Field | Word adjustment | Exact phrase bonus | Contained phrase bonus |
| --- | --- | --- | --- |
| Curated alias | +300 | 900 | 400 |
| English or Persian name | +200 | 600 | 200 |
| CLDR keywords | 0 | 300 | 50 |
| Supplemental emojilib keywords | −100 | 100 | 25 |

Repeated aliases cannot add repeated phrase bonuses. Adding more synonyms
does not accumulate relevance points for the same match.

The generated data and scoring do not change when a user selects an emoji.

## Deliberate selection evidence

The picker records a choice when all these conditions hold:

- Learning is enabled and the preference file has finished loading.
- The search has a nonempty normalized query of at most 120 code units.
- The user clicks an emoji, or presses Enter after changing the emoji cursor
  through keyboard navigation. `Ctrl + Enter` follows the same learning rule.

Hovering only changes the highlight. Enter after hovering does not count as
keyboard navigation. Accepting the automatic first result also does not count.
Changing the search or rebuilding the grid resets the selection origin.

Recording does not reorder the active grid. The next search rebuild computes
preferences again. Empty-query browsing and Recent retain their normal order.

## Decay and bounded storage

For each query and emoji, the preference file stores a count, a weight, and
the last update time. On a deliberate choice, the previous weight decays and
then gains one unit:

```text
current weight = stored weight × 0.5^(elapsed time / 30 days)
new weight = min(20, current weight + 1)
new count = min(20, stored count + 1)
```

A preference applies only after at least three deliberate choices and while
its effective weight is at least one. Old evidence gradually loses influence,
so recent choices can change the order among ties. Decay happens when the
picker reads or records evidence; no background timer is required.

Storage retains up to 128 queries and eight emoji choices per query. Recording
a choice moves its query and emoji to the front, and the oldest stored entries
are removed when the limits are exceeded.

## Disable and reset behavior

Turning learning off stops both recording and personalized ranking. The saved
file remains intact, so enabling learning again restores eligible preferences.

Resetting one search removes only its normalized-query record. Resetting all
preferences empties the learning state. Neither action changes aliases,
settings, or Recent.

The controls are described in [Manage search preferences](usage.md#manage-search-preferences).
The file locations and limits are listed in [Settings and shortcuts](reference.md).
