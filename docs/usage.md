# Use and manage the picker

## Install the plugin

1. Start your Omarchy desktop with its Quickshell shell running.
2. Add and enable the fork:

   ```bash
   omarchy plugin add https://github.com/sadraalikhah/omarchy-better-emojis.git --enable
   ```

3. Press `Super + Ctrl + E`.
4. Type `moan`. The picker shows 😮‍💨 and 😩.
5. Use the arrow keys to highlight an emoji, then press `Enter` to insert it.
   Use `Ctrl + Enter` to copy it instead.

The manifest redirects the built-in `omarchy.emojis` overlay to this plugin.
Your existing emoji shortcut continues to work.

## Switch an existing installation to this fork

The original plugin uses `wessel.better-emojis`. This release uses
`io.github.sadraalikhah.better-emojis`, with a separate source folder and state
directory. Both replace the built-in emoji picker, so disable the original
when switching.

1. Save a copy of the original source and state directories:
   `~/.config/omarchy/plugins/wessel.better-emojis/` and
   `~/.local/state/omarchy/plugins/wessel.better-emojis/`.
2. To carry over your layout, recents, and learned preferences, copy the state
   before installing the new ID:

   ```bash
   old_state="$HOME/.local/state/omarchy/plugins/wessel.better-emojis"
   new_state="$HOME/.local/state/omarchy/plugins/io.github.sadraalikhah.better-emojis"
   mkdir -p "$new_state"
   for state_file in settings.json learning.json; do
     if [ -f "$old_state/$state_file" ]; then
       cp -n "$old_state/$state_file" "$new_state/$state_file"
     fi
   done
   ```

   Existing files under the new ID are preserved.
3. Disable the original plugin and install this release:

   ```bash
   omarchy plugin disable wessel.better-emojis
   omarchy plugin add https://github.com/sadraalikhah/omarchy-better-emojis.git --enable
   ```

4. Press `Super + Ctrl + E` and check your settings and recent selections.

The original plugin directory remains intact. To return to it, disable
`io.github.sadraalikhah.better-emojis` and enable `wessel.better-emojis`.

## Browse and select emojis

- Type English or Persian words to search across categories.
- Press `Tab` or `Shift + Tab` to move between category tabs.
- Use arrows and `Page Up` or `Page Down` to move the emoji cursor.
- Pause on an emoji for 600 ms to see its English name.
- Click an emoji or press `Enter` to insert it.
- Press `Ctrl + Enter` to copy it without inserting it.

If an app does not accept the insertion helper's paste shortcut, use
`Ctrl + Enter` and paste with that app's normal shortcut.

Press `Esc` to clear a nonempty search. Press it again to dismiss the picker.
In Settings, `Esc` dismisses the picker immediately.

## Change the layout and variants

1. Click the gear, or press `Ctrl + S` or `Ctrl + ,`.
2. Choose an emoji size, width, or height preset.
3. Choose a default skin tone, or enable all tones in the grid.
4. Enable all genders to browse variants separately. With genders combined,
   use `Ctrl + G` to cycle the displayed gender.
5. Enable **Show category titles** to display names beside the category icons.
6. Click the emoji icon, or use the Settings shortcut again, to return.

Use `Tab`, `Shift + Tab`, Up, and Down to move between Settings groups.
Use Left and Right to choose preset options. Use `Enter` or Space to activate
a toggle or button. Disabled reset controls are skipped.

## Manage search preferences

1. Search for a word such as `moan`.
2. Deliberately choose your preferred result with a mouse click, or move the
   emoji cursor before pressing `Enter` or `Ctrl + Enter`.
3. Repeat the choice three times for that search.
4. Open the same search again. Your choice can move ahead of equally relevant
   results. Stronger matches retain their position.

To stop both recording and personalized ranking, turn off **Learn from
selections** in Settings. Saved preferences remain available if you enable
learning again.

To forget one query, search for it, open Settings, and select **Reset this
search**. To clear every query, select **Reset all learned preferences**.
A disabled reset button means there is no stored evidence to clear.

See [Search and learning](search.md) for the ranking rules and evidence limits.

## Update the plugin

For a Git checkout whose `origin` points to this fork:

```bash
omarchy plugin update io.github.sadraalikhah.better-emojis
```

The update command uses a fast-forward merge. If local edits prevent the
update, preserve and review those edits before trying again. Settings and
learning live outside the source checkout.

## Remove the plugin

```bash
omarchy plugin remove io.github.sadraalikhah.better-emojis
```

Removing the enabled replacement returns emoji handling to the built-in
picker. Removing the plugin is separate from resetting saved preferences;
use the Settings reset controls when you want to clear learning.

## Troubleshoot the picker

### The emoji shortcut opens another picker

Inspect the enabled plugins:

```bash
omarchy plugin list --json
```

Check that `io.github.sadraalikhah.better-emojis` is enabled and review other replacements
for `omarchy.emojis`. Then rescan:

```bash
omarchy-shell shell rescanPlugins
```

### A source edit does not appear

Validate the installed plugin and rescan it:

```bash
omarchy plugin validate "$HOME/.config/omarchy/plugins/io.github.sadraalikhah.better-emojis"
omarchy-shell shell rescanPlugins
```

For runtime diagnostics, find the active shell instance with `qs list --all`,
then run `qs log -i <instance-id> --tail 100 --no-color` with that instance ID.

### Learning does not reorder a result

Check that learning is enabled and that you made three deliberate choices
for the same normalized query. Only exact relevance ties can change order.
Older evidence also loses weight. Accepting the automatic first result or
hovering alone does not train the picker.

### Emoji glyphs or category icons are missing

Check that Noto Color Emoji and your Omarchy Nerd Font are available. The
picker uses Noto Color Emoji for emoji glyphs and the menu font for icons.
