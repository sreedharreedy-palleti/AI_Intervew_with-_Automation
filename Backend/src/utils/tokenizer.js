const STOP_WORDS = require('../constants/stopWords');

function tokenize(text) {
  if (!text) return [];

  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
}

module.exports = tokenize;