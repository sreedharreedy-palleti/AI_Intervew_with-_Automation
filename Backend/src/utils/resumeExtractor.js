const COMMON_SKILLS = require('../constants/skillsList');

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

const SECTION_RULES = [
  { name: 'Summary / Objective', regex: /summary|objective|about me|profile/i },
  { name: 'Work Experience', regex: /experience|work history|employment/i },
  { name: 'Education', regex: /education|academics|qualifications/i },
  { name: 'Skills', regex: /skills|technical skills|technologies/i },
  { name: 'Projects', regex: /projects|personal projects/i },
  { name: 'Certifications', regex: /certifications|certificates|licenses/i }
];

// Safely escape special regex characters like +, #, ., *
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractResumeDetails(rawText) {
  const normalizedText = rawText.toLowerCase();

  // 1. Extract contact info
  const emails = rawText.match(EMAIL_REGEX) || [];
  const phones = rawText.match(PHONE_REGEX) || [];

  // 2. Safely extract skills (handling c++, c#, .net, etc.)
  const detectedSkills = COMMON_SKILLS.filter(skill => {
    const escapedSkill = escapeRegex(skill.toLowerCase());
    // Use non-word boundaries or lookaround so symbols like ++ and # match correctly
    const regex = new RegExp(`(^|[^a-z0-9+#])${escapedSkill}(?=$|[^a-z0-9+#])`, 'i');
    return regex.test(normalizedText);
  });

  // 3. Extract structural sections
  const presentSections = SECTION_RULES
    .filter(rule => rule.regex.test(rawText))
    .map(rule => rule.name);

  return {
    contact: {
      email: emails[0] || null,
      phone: phones[0] || null
    },
    detectedSkills,
    presentSections,
    rawText
  };
}

module.exports = extractResumeDetails;