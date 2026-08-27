const tokenize = require('./tokenizer');

function analyzeAtsScore(extractedData = {}, jobDescription = '') {
  const rawText = extractedData.rawText || '';
  const presentSections = Array.isArray(extractedData.presentSections) 
    ? extractedData.presentSections 
    : [];
  const contact = extractedData.contact || {};

  const resumeTokens = new Set(tokenize(rawText));
  const jdTokens = Array.from(new Set(tokenize(jobDescription)));

  if (jdTokens.length === 0) {
    return {
      score: 0,
      matchedKeywords: [],
      missingKeywords: [],
      status: 'No Job Description Provided'
    };
  }

  // 1. Keyword match score (60% weight)
  const matchedKeywords = jdTokens.filter(token => resumeTokens.has(token));
  const missingKeywords = jdTokens.filter(token => !resumeTokens.has(token));
  const keywordRatio = matchedKeywords.length / jdTokens.length;
  const keywordScore = keywordRatio * 60;

  // 2. Structural checklist score (30% weight) - Safely handles missing sections
  const structureScore = Math.min(30, (presentSections.length / 5) * 30);

  // 3. Contact completeness score (10% weight) - Safely handles missing contacts
  let contactScore = 0;
  if (contact.email) contactScore += 5;
  if (contact.phone) contactScore += 5;

  const totalScore = Math.round(keywordScore + structureScore + contactScore);

  let status = 'Needs Improvement';
  if (totalScore >= 80) status = 'Excellent Match';
  else if (totalScore >= 60) status = 'Good Match';

  return {
    score: Math.min(100, totalScore),
    status,
    matchedKeywords,
    missingKeywords,
    breakdown: {
      keywordScore: Math.round(keywordScore),
      structureScore: Math.round(structureScore),
      contactScore: contactScore
    }
  };
}

module.exports = analyzeAtsScore;