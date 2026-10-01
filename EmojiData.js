// Data helpers for wessel.better-emojis: bilingual search, categories,
// recents, gender display, and skin-tone handling.

var TONE_MODIFIERS = ["\uD83C\uDFFB", "\uD83C\uDFFC", "\uD83C\uDFFD", "\uD83C\uDFFE", "\uD83C\uDFFF"]
var FIELD_BOOST = { alias: 300, name: 200, keyword: 0, supplemental: -100 }

function parseEmojis(raw) {
  try {
    var data = JSON.parse(String(raw || ""))
    if (!Array.isArray(data)) return []
    for (var i = 0; i < data.length; i++) {
      var it = data[i]
      if (it) {
        it._searchFields = searchFields(it)
        it._variantsStr = it.v ? JSON.stringify(it.v) : "[]"
      }
    }
    return data
  } catch (e) {
    return []
  }
}

function normalizedQuery(query) {
  return normalizeText(query)
}

function normalizeText(value) {
  var text = String(value || "").toLowerCase()
  try {
    if (typeof text.normalize === "function") text = text.normalize("NFKC")
  } catch (e) {}
  return text
    .replace(/[\u0610-\u061a\u0640\u064b-\u065f\u0670\u06d6-\u06ed]/g, "")
    .replace(/[\u064a\u0649]/g, "\u06cc")
    .replace(/\u0643/g, "\u06a9")
    .replace(/[\u0027\u2019]/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\u0660-\u0669\u06f0-\u06f9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function searchFields(item) {
  var fields = []
  var values = [
    [item.ae, "alias"], [item.af, "alias"],
    [item.n, "name"], [item.fn, "name"],
    [item.k, "keyword"], [item.f, "keyword"], [item.ek, "supplemental"]
  ]
  for (var i = 0; i < values.length; i++) {
    var value = normalizeText(values[i][0])
    if (!value) continue
    fields.push({ text: value, words: value.split(" "), kind: values[i][1] })
  }
  return fields
}

function oneEditAway(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false
  if (a.length === b.length) {
    var firstMismatch = -1
    var secondMismatch = -1
    for (var i = 0; i < a.length; i++) {
      if (a.charAt(i) === b.charAt(i)) continue
      if (firstMismatch < 0) firstMismatch = i
      else if (secondMismatch < 0) secondMismatch = i
      else return false
    }
    if (secondMismatch < 0) return firstMismatch >= 0
    return secondMismatch === firstMismatch + 1
      && a.charAt(firstMismatch) === b.charAt(secondMismatch)
      && a.charAt(secondMismatch) === b.charAt(firstMismatch)
  }

  var shorter = a.length < b.length ? a : b
  var longer = a.length < b.length ? b : a
  var shortIndex = 0
  var longIndex = 0
  var skipped = false
  while (shortIndex < shorter.length && longIndex < longer.length) {
    if (shorter.charAt(shortIndex) === longer.charAt(longIndex)) {
      shortIndex++
      longIndex++
    } else if (skipped) {
      return false
    } else {
      skipped = true
      longIndex++
    }
  }
  return true
}

function wordQuality(query, word) {
  if (word === query) return 1000
  if (word.indexOf(query) === 0) return 750
  if (word.indexOf(query) >= 0) return 500
  // Short fuzzy matches are noisy (for example, "moan" matching "man").
  if (query.length >= 5 && query.length <= 24 && word.length >= 5 && oneEditAway(query, word)) return 200
  return -1
}

function scoreItem(item, words, query) {
  var fields = item._searchFields || searchFields(item)
  var score = 0
  var fieldBoost

  for (var w = 0; w < words.length; w++) {
    var best = -1
    for (var f = 0; f < fields.length; f++) {
      var field = fields[f]
      fieldBoost = FIELD_BOOST[field.kind] || 0
      for (var i = 0; i < field.words.length; i++) {
        var quality = wordQuality(words[w], field.words[i])
        if (quality >= 0 && quality + fieldBoost > best) best = quality + fieldBoost
      }
    }
    if (best < 0) return -1
    score += best
  }

  for (var j = 0; j < fields.length; j++) {
    var phrase = fields[j]
    if (phrase.text === query) {
      score += phrase.kind === "alias" ? 900
        : phrase.kind === "name" ? 600
        : phrase.kind === "supplemental" ? 100 : 300
    } else if (phrase.text.indexOf(query) >= 0) {
      score += phrase.kind === "alias" ? 400
        : phrase.kind === "name" ? 200
        : phrase.kind === "supplemental" ? 25 : 50
    }
  }
  return score
}

// filterEmojis(emojis, query, limit)          -> all categories
// filterEmojis(emojis, query, limit, category)-> one category ("recent" handled by caller)
function filterEmojis(emojis, query, limit, category) {
  var values = Array.isArray(emojis) ? emojis : []
  var needle = normalizedQuery(query)
  var words = needle ? needle.split(" ") : []
  var max = limit === undefined || limit === null ? 2000 : Number(limit)
  if (isNaN(max)) max = 2000
  max = Math.max(0, Math.floor(max))
  if (max === 0) return []

  var out = []
  for (var i = 0; i < values.length; i++) {
    var item = values[i]
    if (!item || !item.e) continue
    if (category && item.c !== category) continue
    if (!words.length) {
      out.push({ item: item, score: 0, index: i })
      continue
    }
    var score = scoreItem(item, words, needle)
    if (score >= 0) out.push({ item: item, score: score, index: i })
  }
  if (words.length) out.sort(function(a, b) { return b.score - a.score || a.index - b.index })
  if (out.length > max) out.length = max
  var result = []
  for (var j = 0; j < out.length; j++) result.push(out[j].item)
  return result
}

// Ordered category list derived from the dataset.
function categories(emojis) {
  var values = Array.isArray(emojis) ? emojis : []
  var seen = {}
  var out = []
  for (var i = 0; i < values.length; i++) {
    var c = values[i] && values[i].c
    if (c && !seen[c]) {
      seen[c] = true
      out.push(c)
    }
  }
  return out
}

function toneModifier(tone) {
  var index = Number(tone)
  if (isNaN(index) || index < 1 || index > TONE_MODIFIERS.length) return ""
  return TONE_MODIFIERS[index - 1]
}

// Prefer the exact Unicode variant, falling back to appending a modifier for
// callers without generated variant data.
function applySkinTone(emoji, tone, variants) {
  var base = String(emoji || "")
  var modifier = toneModifier(tone)
  if (!modifier) return base
  var values = variants
  if (typeof values === "string") {
    try {
      values = JSON.parse(values)
    } catch (e) {
      values = []
    }
  }
  var index = Number(tone) - 1
  if (Array.isArray(values) && values[index]) return String(values[index])
  if (base.charCodeAt(base.length - 1) === 0xFE0F) base = base.slice(0, -1)
  return base + modifier
}

function supportsTone(item) {
  return !!(item && item.t)
}

// Remove every skin-tone modifier so toned recents can be looked up again.
function stripTones(emoji) {
  return String(emoji || "").replace(/\uD83C[\uDFFB-\uDFFF]/g, "")
}

// Recents are stored as plain emoji strings (tone already applied).
function pushRecent(recents, emoji, cap) {
  var list = Array.isArray(recents) ? recents.slice() : []
  var max = Number(cap) > 0 ? Number(cap) : 30
  var existing = list.indexOf(emoji)
  if (existing >= 0) list.splice(existing, 1)
  list.unshift(emoji)
  if (list.length > max) list.length = max
  return list
}

if (typeof module !== "undefined") {
  module.exports = {
    parseEmojis: parseEmojis,
    normalizedQuery: normalizedQuery,
    normalizeText: normalizeText,
    filterEmojis: filterEmojis,
    categories: categories,
    toneModifier: toneModifier,
    applySkinTone: applySkinTone,
    supportsTone: supportsTone,
    stripTones: stripTones,
    pushRecent: pushRecent
  }
}
