// Local query-specific evidence. Callers normalize queries with EmojiData.
// Counts establish repeated intent; decaying weight orders equal matches.
var MAX_QUERIES = 128
var MAX_CHOICES = 8
var MAX_COUNT = 20
var MAX_QUERY_LENGTH = 120
var HALF_LIFE = 30 * 24 * 60 * 60 * 1000

function empty() {
  return { version: 1, queries: [] }
}

function strength(choice, now) {
  return choice.weight * Math.pow(0.5, Math.max(0, now - choice.updatedAt) / HALF_LIFE)
}

function load(raw, normalizeQuery, now) {
  var result = empty()
  try {
    var parsed = JSON.parse(String(raw || "{}"))
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.queries)) return result
    var seen = []
    for (var i = 0; i < parsed.queries.length; i++) {
      var entry = parsed.queries[i]
      if (!entry || typeof entry.query !== "string" || !Array.isArray(entry.choices)) continue
      var query = normalizeQuery(entry.query)
      if (!query || query.length > MAX_QUERY_LENGTH || seen.indexOf(query) >= 0) continue
      var choices = []
      var emojis = []
      for (var j = 0; j < entry.choices.length; j++) {
        var choice = entry.choices[j]
        if (!choice || typeof choice.emoji !== "string" || !choice.emoji || choice.emoji.length > 32
          || emojis.indexOf(choice.emoji) >= 0
          || !Number.isInteger(choice.count) || choice.count < 1 || choice.count > MAX_COUNT
          || typeof choice.weight !== "number" || !isFinite(choice.weight) || choice.weight <= 0 || choice.weight > MAX_COUNT
          || typeof choice.updatedAt !== "number" || !isFinite(choice.updatedAt) || choice.updatedAt <= 0 || choice.updatedAt > now) continue
        choices.push({ emoji: choice.emoji, count: choice.count, weight: choice.weight, updatedAt: choice.updatedAt })
        emojis.push(choice.emoji)
      }
      choices.sort(function(a, b) { return b.updatedAt - a.updatedAt })
      if (!choices.length) continue
      result.queries.push({ query: query, choices: choices.slice(0, MAX_CHOICES) })
      seen.push(query)
    }
    result.queries.sort(function(a, b) { return b.choices[0].updatedAt - a.choices[0].updatedAt })
    result.queries = result.queries.slice(0, MAX_QUERIES)
  } catch (e) {}
  return result
}

function record(state, query, emoji, now) {
  if (!query || query.length > MAX_QUERY_LENGTH) return state
  var queries = state.queries.slice()
  var index = queries.findIndex(function(entry) { return entry.query === query })
  var choices = index < 0 ? [] : queries[index].choices.slice()
  var previous = choices.find(function(choice) { return choice.emoji === emoji })
  choices = choices.filter(function(choice) { return choice.emoji !== emoji })
  choices.unshift({
    emoji: emoji,
    count: Math.min(MAX_COUNT, previous ? previous.count + 1 : 1),
    weight: Math.min(MAX_COUNT, (previous ? strength(previous, now) : 0) + 1),
    updatedAt: now
  })
  if (index >= 0) queries.splice(index, 1)
  queries.unshift({ query: query, choices: choices.slice(0, MAX_CHOICES) })
  return { version: 1, queries: queries.slice(0, MAX_QUERIES) }
}

function scores(state, query, now) {
  var result = {}
  var entry = state.queries.find(function(item) { return item.query === query })
  if (!entry) return result
  for (var i = 0; i < entry.choices.length; i++) {
    var choice = entry.choices[i]
    var weight = strength(choice, now)
    if (choice.count >= 3 && weight >= 1) result[choice.emoji] = weight
  }
  return result
}

function reset(state, query) {
  if (query === undefined) return empty()
  return { version: 1, queries: state.queries.filter(function(entry) { return entry.query !== query }) }
}

if (typeof module !== "undefined") {
  module.exports = { empty: empty, load: load, record: record, scores: scores, reset: reset }
}
