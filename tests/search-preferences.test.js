"use strict"
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const { test } = require("node:test")
const EmojiData = require("../EmojiData.js")
const all = EmojiData.parseEmojis(fs.readFileSync(path.join(__dirname, "..", "emojis.json"), "utf8"))

test("learned preferences reorder equally relevant moan matches", () => {
  assert.deepEqual(EmojiData.filterEmojis(all, "moan", 10, "", { "😩": 3 }).map(item => item.e), ["😩", "😮‍💨"])
})

test("preferences preserve stronger matches and cannot add unrelated emojis", () => {
  const fixture = EmojiData.parseEmojis(JSON.stringify([
    { e: "😮‍💨", ae: ["moan"] },
    { e: "😩", k: "moan" },
    { e: "🍕", n: "pizza" }
  ]))
  assert.deepEqual(EmojiData.filterEmojis(fixture, "moan", 10, "", { "😩": 1000000, "🍕": 1000000 }).map(item => item.e), ["😮‍💨", "😩"])
})

test("empty preferences retain all existing search and browsing order", () => {
  for (const query of ["", "moan", "ناله", "grining", "got it", "red heart", "sideeye"]) {
    assert.deepEqual(EmojiData.filterEmojis(all, query, 1000, "", {}), EmojiData.filterEmojis(all, query, 1000))
  }
  assert.deepEqual(EmojiData.filterEmojis(all, "", 1000, "Flags", { "🇼🇸": 20 }), EmojiData.filterEmojis(all, "", 1000, "Flags"))
})

const Preferences = require("../SearchPreferences.js")
const now = Date.UTC(2026, 9, 1)
const query = EmojiData.normalizedQuery
const learn = (state, text, emoji, times = 3, at = now) => {
  for (let i = 0; i < times; i++) state = Preferences.record(state, query(text), emoji, at)
  return state
}
const results = (state, text, at = now) => EmojiData.filterEmojis(all, text, 1000, "", Preferences.scores(state, query(text), at)).map(item => item.e)

test("learning requires three choices and only affects the normalized exact query", () => {
  let state = learn(Preferences.empty(), " MOAN ", "😩", 2)
  assert.deepEqual(results(state, "moan"), ["😮‍💨", "😩"])
  state = learn(state, "moan", "😩", 1)
  assert.deepEqual(results(state, "Moan"), ["😩", "😮‍💨"])
  assert.deepEqual(results(state, "moaning"), ["😮‍💨", "😩"])
  assert.deepEqual(results(state, "ناله"), ["😮‍💨", "😩"])
  state = learn(state, "نَالِه", "😩")
  assert.deepEqual(results(state, "ناله"), ["😩", "😮‍💨"])
})

test("learning preserves membership, categories, fuzzy fallback, and every stronger match", () => {
  let state = Preferences.empty()
  for (const text of ["moan", "grining", "got it", "sideeye", "red heart", "face exhaling"]) {
    for (const emoji of ["😩", "😀", "👍", "👀", "💀"]) state = learn(state, text, emoji)
    const baseline = EmojiData.filterEmojis(all, text, 2000)
    const personalized = EmojiData.filterEmojis(all, text, 2000, "", Preferences.scores(state, query(text), now))
    assert.deepEqual(personalized.map(item => item.e).sort(), baseline.map(item => item.e).sort())
    // Any pair that could switch with a one-sided preference is an exact score tie.
    for (let i = 0; i < baseline.length; i++) {
      for (let j = i + 1; j < baseline.length; j++) {
        const pair = [baseline[i], baseline[j]]
        const reversed = EmojiData.filterEmojis(pair, text, 2, "", { [pair[1].e]: 20 })
        if (reversed[0].e === pair[0].e) {
          assert.ok(personalized.indexOf(pair[0]) < personalized.indexOf(pair[1]))
        }
      }
    }
  }
  assert.deepEqual(EmojiData.filterEmojis(all, "moan", 20, "Flags", Preferences.scores(state, "moan", now)), [])
})

test("older evidence decays and recent deliberate choices can replace it", () => {
  let state = learn(Preferences.empty(), "moan", "😩", 20)
  state = learn(state, "moan", "😮‍💨", 3, now + 120 * 86400000)
  assert.deepEqual(results(state, "moan", now + 120 * 86400000), ["😮‍💨", "😩"])
  assert.deepEqual(Preferences.scores(state, "moan", now + 365 * 86400000), {})
})

test("learning is immutable, capped, and rejects empty or oversized queries", () => {
  const empty = Preferences.empty()
  let state = learn(empty, "moan", "😩", 100)
  assert.deepEqual(empty, Preferences.empty())
  assert.equal(state.queries[0].choices[0].count, 20)
  assert.equal(state.queries[0].choices[0].weight, 20)
  assert.equal(Preferences.record(state, "", "😩", now), state)
  assert.equal(Preferences.record(state, "a".repeat(121), "😩", now), state)
  for (let i = 0; i < 140; i++) state = learn(state, `query ${i}`, "😩", 1)
  assert.equal(state.queries.length, 128)
  for (let i = 0; i < 12; i++) state = learn(state, "moan", all[i].e, 1)
  assert.equal(state.queries[0].choices.length, 8)
})

test("preferences survive reload and resets restore the original ordering", () => {
  let state = learn(Preferences.empty(), "moan", "😩")
  state = learn(state, "ناله", "😩")
  state = Preferences.load(JSON.stringify(state), query, now)
  assert.deepEqual(results(state, "moan"), ["😩", "😮‍💨"])
  state = Preferences.reset(state, "moan")
  assert.deepEqual(results(state, "moan"), ["😮‍💨", "😩"])
  assert.deepEqual(results(state, "ناله"), ["😩", "😮‍💨"])
  assert.deepEqual(Preferences.reset(state), Preferences.empty())
})

test("malformed preferences are ignored at the file boundary", () => {
  for (const raw of ["bad json", "null", "[]", '{"version":2,"queries":[]}', '{"version":1,"queries":null}']) {
    assert.deepEqual(Preferences.load(raw, query, now), Preferences.empty())
  }
  const choices = [
    { emoji: "😩", count: 3, weight: 3, updatedAt: now },
    { emoji: "🍕", count: 100, weight: 100, updatedAt: now },
    { emoji: "😫", count: 3, weight: "3", updatedAt: now },
    { emoji: "👀", count: 3, weight: 3, updatedAt: now + 1 },
    { emoji: "💀", count: 3.5, weight: 3, updatedAt: now },
    { emoji: "😩", count: 20, weight: 20, updatedAt: now }
  ]
  const state = Preferences.load(JSON.stringify({ version: 1, queries: [{ query: " MOAN ", choices }] }), query, now)
  assert.deepEqual(state.queries[0].choices, [choices[0]])
})

test("display variants retain the matched emoji as their learning identity", () => {
  const source = all.find(item => item.e === "👍")
  const rows = EmojiData.displayItems([source], {}, false, 0, true)
  assert.equal(rows.length, 6)
  assert.ok(rows.every(row => row.searchEmoji === "👍"))
  const group = all.find(item => item.e === "🤷")
  const map = Object.fromEntries(all.map(item => [item.e, item]))
  const grouped = EmojiData.displayItems([group], map, true, 1, false)
  assert.equal(grouped[0].searchEmoji, "🤷")
  assert.notEqual(grouped[0].item.e, "🤷")
})
