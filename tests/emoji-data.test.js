"use strict"

const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
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

test("the generated database indexes every curated alias without flattening phrases", () => {
  const aliases = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "tools", "aliases.json"), "utf8"))
  for (const [emoji, locales] of Object.entries(aliases)) {
    assert.ok(byEmoji[emoji], `Missing emoji: ${emoji}`)
    for (const [locale, terms] of Object.entries(locales)) {
      const expected = [...new Set(terms.map(term => term.toLowerCase().trim().replace(/\s+/g, " ")))]
      assert.deepEqual(byEmoji[emoji][locale === "en" ? "ae" : "af"], expected, `${emoji} ${locale}`)
    }
  }
})

test("manifest continues to replace the stock emoji picker", () => {
  assert.equal(manifest.omarchy.clonedFrom, "omarchy.emojis")
})

test("searches English CLDR names and keywords", () => {
  assert.equal(EmojiData.filterEmojis(allEmojis, "face exhaling", 1)[0].e, "😮‍💨")
  assert.equal(EmojiData.filterEmojis(allEmojis, "sigh", 1)[0].e, "😮‍💨")
})

test("searches Persian CLDR names and keywords", () => {
  assert.deepEqual(EmojiData.filterEmojis(allEmojis, "ناله", 2).map(item => item.e), ["😮‍💨", "😩"])
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
  assert.deepEqual(realResults.slice(0, 2).map(item => item.e), ["😮‍💨", "😩"])
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

test("indexes individual alias phrases and ranks exact phrases above scattered words", () => {
  const fixture = EmojiData.parseEmojis(JSON.stringify([
    { e: "👍", ae: ["got", "it"] },
    { e: "🫡", ae: ["got it", "understood"] }
  ]))
  assert.deepEqual(EmojiData.filterEmojis(fixture, "got it", 2).map(item => item.e), ["🫡", "👍"])
  assert.equal(EmojiData.filterEmojis(fixture, "understood", 1)[0].e, "🫡")
  const legacy = EmojiData.parseEmojis(JSON.stringify([{ e: "🫡", ae: "got it understood" }]))
  assert.equal(EmojiData.filterEmojis(legacy, "understood", 1)[0].e, "🫡")
})

test("extra or duplicated aliases do not inflate relevance", () => {
  const fixture = EmojiData.parseEmojis(JSON.stringify([
    { e: "👍", ae: ["got it"] },
    { e: "🫡", ae: ["got it", "got-it", "got it", "got it thanks", "unrelated phrase"] }
  ]))
  assert.deepEqual(EmojiData.filterEmojis(fixture, "got it", 2).map(item => item.e), ["👍", "🫡"])
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

test("preserves combined and separate gender display modes", () => {
  const group = "test-group"
  const person = { e: "🧑", gg: group, gp: "🧑", gf: "👩", gm: "👨" }
  const female = { e: "👩", gg: group, gp: "🧑", gf: "👩", gm: "👨" }
  const male = { e: "👨", gg: group, gp: "🧑", gf: "👩", gm: "👨" }
  const map = { "🧑": person, "👩": female, "👨": male }
  assert.equal(EmojiData.genderMember(person, map, 0).e, "👨")
  assert.equal(EmojiData.genderMember(person, map, 1).e, "👩")
  assert.equal(EmojiData.genderMember(person, map, 2).e, "🧑")
  assert.deepEqual(EmojiData.displayItems([person, female, male], map, true, 2, false).map(row => row.item.e), ["🧑"])
  assert.deepEqual(EmojiData.displayItems([person, female, male], map, false, 0, false).map(row => row.item.e), ["🧑", "👩", "👨"])
})

test("expands a tone-enabled emoji to its base and five variants", () => {
  const toneable = { e: "👍", n: "thumbs up", k: "thumb thumbs up", c: "People & Body", t: true, v: ["👍🏻", "👍🏼", "👍🏽", "👍🏾", "👍🏿"] }
  const rows = EmojiData.displayItems([toneable], {}, false, 0, true)
  assert.deepEqual(rows.map(row => row.item.e), ["👍", ...toneable.v])
  assert.ok(rows.every(row => row.preToned))
})

test("pastes first, then leaves the selected emoji on the regular clipboard", t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "better-emojis-test-"))
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }))
  const omarchy = path.join(temp, "Omarchy path with spaces")
  const bin = path.join(temp, "bin")
  const trace = path.join(temp, "trace")
  const clipboard = path.join(temp, "clipboard")
  const helper = path.join(omarchy, "bin", "omarchy-menu-emoji-insert")
  const script = path.join(__dirname, "..", "tools", "insert-and-copy.sh")
  fs.mkdirSync(path.dirname(helper), { recursive: true })
  fs.mkdirSync(bin)
  fs.writeFileSync(helper, '#!/usr/bin/env bash\nprintf "paste:%s\\n" "$1" >> "$TRACE"\n')
  fs.writeFileSync(path.join(bin, "wl-copy"), '#!/usr/bin/env bash\nprintf "clipboard:%s\\n" "$*" >> "$TRACE"\ncat > "$CLIPBOARD"\n')
  fs.chmodSync(helper, 0o755)
  fs.chmodSync(path.join(bin, "wl-copy"), 0o755)

  const emoji = "🧑‍💻"
  const result = spawnSync("bash", [script, omarchy, emoji], {
    encoding: "utf8",
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, TRACE: trace, CLIPBOARD: clipboard }
  })
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(fs.readFileSync(trace, "utf8").trim().split("\n"), [
    `paste:${emoji}`,
    "clipboard:--type text/plain"
  ])
  assert.equal(fs.readFileSync(clipboard, "utf8"), emoji)
})

test("short queries do not match inside unrelated words", () => {
  const fixture = EmojiData.parseEmojis(JSON.stringify([
    { e: "🇼🇸", n: "Samoan flag" },
    { e: "😮‍💨", ae: ["moan"] },
    { e: "😩", ae: ["moaning"] }
  ]))
  assert.deepEqual(EmojiData.filterEmojis(fixture, "moan", 10).map(item => item.e), ["😮‍💨", "😩"])
})

test("typo matches are a fallback when direct matches are absent", () => {
  const fixture = EmojiData.parseEmojis(JSON.stringify([
    { e: "☕", n: "morning coffee" },
    { e: "😩", ae: ["moaning"] }
  ]))
  assert.deepEqual(EmojiData.filterEmojis(fixture, "moaning", 10).map(item => item.e), ["😩"])
  assert.deepEqual(EmojiData.filterEmojis(fixture, "moanign", 10).map(item => item.e), ["😩"])
})

test("moan includes weary and exhaling faces without unrelated short-word matches", () => {
  for (const query of ["moan", "moaning"]) {
    assert.deepEqual(EmojiData.filterEmojis(allEmojis, query, 10).map(item => item.e), ["😮‍💨", "😩"])
  }
})

test("everyday reactions and emotional phrases find relevant selections", () => {
  for (const [query, expected] of [
    ["groaning", ["😩", "😫", "😮‍💨"]],
    ["overwhelmed", ["😩", "🤯"]],
    ["awkward", ["😬", "🫣"]],
    ["dying of laughter", ["😂", "🤣", "💀"]],
    ["miss you", ["🥺", "😔"]],
    ["got it", ["🫡", "👍"]],
    ["chef kiss", ["🤌"]],
    ["ناله", ["😮‍💨", "😩"]],
    ["داغونم", ["😩", "😫"]],
    ["مغزم ترکید", ["🤯"]]
  ]) {
    const matches = EmojiData.filterEmojis(allEmojis, query, 5).map(item => item.e)
    for (const emoji of expected) assert.ok(matches.includes(emoji), `${query} should include ${emoji}; got ${matches}`)
  }
})
