"use strict"

const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const { test } = require("node:test")
const EmojiData = require("../EmojiData.js")

const allEmojis = EmojiData.parseEmojis(fs.readFileSync(path.join(__dirname, "..", "emojis.json"), "utf8"))
const byEmoji = Object.fromEntries(allEmojis.map(item => [item.e, item]))
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "manifest.json"), "utf8"))

test("generated dataset has the pinned Unicode emoji order and bilingual annotations", () => {
  assert.equal(allEmojis.length, 1914)
  assert.ok(allEmojis.every(item => item.k && item.n && item.f && item.fn))
  assert.ok(allEmojis.every(item => item.ek))
})

test("manifest continues to replace the stock emoji picker", () => {
  assert.equal(manifest.omarchy.clonedFrom, "omarchy.emojis")
})

test("searches English CLDR names and keywords", () => {
  assert.equal(EmojiData.filterEmojis(allEmojis, "face exhaling", 1)[0].e, "😮‍💨")
  assert.equal(EmojiData.filterEmojis(allEmojis, "sigh", 1)[0].e, "😮‍💨")
})

test("searches Persian CLDR names and keywords", () => {
  assert.equal(EmojiData.filterEmojis(allEmojis, "ناله", 1)[0].e, "😮‍💨")
  assert.equal(EmojiData.filterEmojis(allEmojis, "صورتک در حال بازدم", 1)[0].e, "😮‍💨")
})

test("supplements English CLDR with lower-ranked emojilib keywords", () => {
  assert.equal(byEmoji["😒"].ek.includes("straight face"), true)
  assert.equal(EmojiData.filterEmojis(allEmojis, "dubious", 1)[0].e, "😒")
  assert.equal(EmojiData.filterEmojis(allEmojis, "cringe", 1)[0].e, "😬")
})

test("indexes common Persian colloquial searches", () => {
  assert.equal(EmojiData.filterEmojis(allEmojis, "قهرم", 1)[0].e, "😒")
  assert.deepEqual(
    EmojiData.filterEmojis(allEmojis, "ترکیدم از خنده", 2).map(item => item.e).sort(),
    ["😂", "🤣"].sort()
  )
  assert.equal(EmojiData.filterEmojis(allEmojis, "عاشقتم", 1)[0].e, "🫶")
  for (const [query, emoji] of [
    ["خجالت کشیدم", "🫣"],
    ["آبروم رفت", "🫣"],
    ["دلم برات تنگ شده", "🥺"],
    ["دمت گرم", "🙏"],
    ["بیخیال", "🤷"]
  ]) {
    assert.equal(EmojiData.filterEmojis(allEmojis, query, 1)[0].e, emoji)
  }
})

test("normalizes Arabic letter variants, diacritics, and Persian half-spaces", () => {
  assert.equal(EmojiData.normalizeText("كِتاب ي"), "کتاب ی")
  assert.equal(EmojiData.normalizeText("خانه\u200cی"), "خانه ی")
  const fixture = EmojiData.parseEmojis(JSON.stringify([
    { e: "🏠", c: "Objects", f: "خانه ی کوچک" }
  ]))
  assert.equal(EmojiData.filterEmojis(fixture, "خانه‌ي", 1)[0].e, "🏠")
})

test("curated aliases outrank names and CLDR keywords", () => {
  const fixture = EmojiData.parseEmojis(JSON.stringify([
    { e: "📣", n: "moan sound", k: "voice" },
    { e: "😮‍💨", n: "face exhaling", k: "sigh", ae: "moan" },
    { e: "🗣️", n: "speaking head", k: "moan" },
    { e: "👀", ek: "moan" }
  ]))
  assert.deepEqual(EmojiData.filterEmojis(fixture, "moan", 4).map(item => item.e), ["😮‍💨", "📣", "🗣️", "👀"])
  const rankFixture = EmojiData.parseEmojis(JSON.stringify([
    { e: "💡", ek: "rankword" },
    { e: "📎", k: "rankword" },
    { e: "🏷️", ae: "rankword" }
  ]))
  assert.deepEqual(EmojiData.filterEmojis(rankFixture, "rankword", 3).map(item => item.e), ["🏷️", "📎", "💡"])
  const realResults = EmojiData.filterEmojis(allEmojis, "moan", 10)
  assert.equal(realResults[0].e, "😮‍💨")
  assert.equal(realResults.some(item => item.e === "👨"), false)
})

test("sideeye aliases return the expected emojis without transposition false positives", () => {
  const expected = ["😏", "😒", "👀"]
  assert.deepEqual(EmojiData.filterEmojis(allEmojis, "sideeye", 3).map(item => item.e), expected)
  for (const query of ["side eye", "side-eye"]) {
    assert.deepEqual(EmojiData.filterEmojis(allEmojis, query, 3).map(item => item.e).sort(), expected.slice().sort())
  }

  const flags = EmojiData.parseEmojis(JSON.stringify([
    { e: "🇦🇽", n: "flag: Åland Islands", k: "flag Åland Islands" }
  ]))
  assert.deepEqual(EmojiData.filterEmojis(flags, "sideeye", 10), [])
})

test("matches typos and requires every word in a multi-word query", () => {
  const fixture = EmojiData.parseEmojis(JSON.stringify([
    { e: "😀", n: "grinning face", k: "smile happy" },
    { e: "❤️", n: "red heart", k: "love" },
    { e: "🔴", n: "red circle", k: "round" }
  ]))
  assert.equal(EmojiData.filterEmojis(fixture, "grining", 1)[0].e, "😀")
  assert.deepEqual(EmojiData.filterEmojis(fixture, "red heart", 10).map(item => item.e), ["❤️"])
})

test("keeps category order and category filtering", () => {
  const names = EmojiData.categories(allEmojis)
  assert.equal(names.length, 9)
  assert.deepEqual(names.slice(0, 2), ["Smileys & Emotion", "People & Body"])
  assert.ok(EmojiData.filterEmojis(allEmojis, "", 20, "Flags").every(item => item.c === "Flags"))
})

test("preserves recent and skin-tone helpers", () => {
  const recents = EmojiData.pushRecent(["😀", "😃"], "😀", 2)
  assert.deepEqual(recents, ["😀", "😃"])
  const thumb = byEmoji["👍"]
  assert.equal(EmojiData.supportsTone(thumb), true)
  assert.equal(EmojiData.applySkinTone("👍", 2, thumb.v), "👍🏼")
  assert.equal(EmojiData.stripTones("👍🏽"), "👍")
})

