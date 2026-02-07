/**
 * French Language Moderation Patterns
 * Patterns for detecting inappropriate content in French
 */

/**
 * French profanity patterns
 * These patterns detect common French profanity with obfuscation attempts
 */
export const PROFANITY_PATTERNS_FR: string[] = [
  // Merde variations
  '\\b(m+[\\W_]*e+[\\W_]*r+[\\W_]*d+[\\W_]*e+)\\b',

  // Putain/Pute variations
  '\\b(p+[\\W_]*u+[\\W_]*t+[\\W_]*a+[\\W_]*[i1!]+[\\W_]*n+)\\b',
  '\\b(p+[\\W_]*u+[\\W_]*t+[\\W_]*e+)\\b',

  // Con variations
  '\\b(c+[\\W_]*[o0]+[\\W_]*n+)\\b',
  '\\b(c+[\\W_]*[o0]+[\\W_]*n+[\\W_]*n+[\\W_]*a+[\\W_]*[r\\*]+[\\W_]*d+)\\b',

  // Salaud variations
  '\\b(s+[\\W_]*a+[\\W_]*l+[\\W_]*a+[\\W_]*u+[\\W_]*d+)\\b',
  '\\b(s+[\\W_]*a+[\\W_]*l+[\\W_]*[o0]+[\\W_]*p+[\\W_]*e+)\\b',

  // Bordel variations
  '\\b(b+[\\W_]*[o0]+[\\W_]*r+[\\W_]*d+[\\W_]*e+[\\W_]*l+)\\b',

  // Chier variations
  '\\b(c+[\\W_]*h+[\\W_]*[i1!]+[\\W_]*e+[\\W_]*r+)\\b',
  '\\b(c+[\\W_]*h+[\\W_]*[i1!]+[\\W_]*a+[\\W_]*n+[\\W_]*t+)\\b',

  // Foutre variations
  '\\b(f+[\\W_]*[o0]+[\\W_]*u+[\\W_]*t+[\\W_]*r+[\\W_]*e+)\\b',

  // Enculé variations
  '\\b(e+[\\W_]*n+[\\W_]*c+[\\W_]*u+[\\W_]*l+[\\W_]*[eé]+)\\b',
  '\\b(e+[\\W_]*n+[\\W_]*c+[\\W_]*u+[\\W_]*l+[\\W_]*e+)\\b',

  // Connard variations
  '\\b(c+[\\W_]*[o0]+[\\W_]*n+[\\W_]*n+[\\W_]*a+[\\W_]*r+[\\W_]*d+)\\b',

  // Fils de pute
  '\\b(f+[\\W_]*[i1!]+[\\W_]*l+[\\W_]*s+[\\W_]*d+[\\W_]*e+[\\W_]*p+[\\W_]*u+[\\W_]*t+[\\W_]*e+)\\b',
  '\\b(f+[\\W_]*d+[\\W_]*p+)\\b',

  // Bite variations
  '\\b(b+[\\W_]*[i1!]+[\\W_]*t+[\\W_]*e+)\\b',

  // Couille variations
  '\\b(c+[\\W_]*[o0]+[\\W_]*u+[\\W_]*[i1!]+[\\W_]*l+[\\W_]*l+[\\W_]*e+)\\b',

  // Pute variations
  '\\b(s+[\\W_]*a+[\\W_]*l+[\\W_]*[o0]+[\\W_]*p+[\\W_]*e+)\\b',
];

/**
 * French hate speech patterns
 * These detect hate speech, slurs, and discriminatory language
 */
export const HATE_SPEECH_PATTERNS_FR: string[] = [
  // Racial slurs
  '\\b(n+[\\W_]*[eè]+[\\W_]*g+[\\W_]*r+[\\W_]*[o0]+)\\b',
  '\\b(bougnoule)\\b',

  // Hate-related terms
  '\\b(h+[\\W_]*a+[\\W_]*[i1!]+[\\W_]*n+[\\W_]*e+)\\b',

  // Homophobic slurs
  '\\b(p+[\\W_]*[eé]+[\\W_]*d+[\\W_]*[eé]+)\\b',
  '\\b(p+[\\W_]*e+[\\W_]*d+[\\W_]*e+)\\b',
  '\\b(t+[\\W_]*a+[\\W_]*p+[\\W_]*e+[\\W_]*t+[\\W_]*t+[\\W_]*e+)\\b',

  // Xenophobic/Islamophobic terms
  '\\b(b+[\\W_]*[i1!]+[\\W_]*c+[\\W_]*[o0]+[\\W_]*t+)\\b',
  '\\b(r+[\\W_]*[a@]+[\\W_]*t+[\\W_]*[o0]+[\\W_]*n+)\\b',

  // Ableist slurs
  '\\b(r+[\\W_]*e+[\\W_]*t+[\\W_]*a+[\\W_]*r+[\\W_]*d+[\\W_]*[eé]+)\\b',
  '\\b(r+[\\W_]*e+[\\W_]*t+[\\W_]*a+[\\W_]*r+[\\W_]*d+[\\W_]*e+)\\b',
  '\\b(t+[\\W_]*r+[\\W_]*[i1!]+[\\W_]*s+[\\W_]*[o0]+)\\b',

  // Antisemitic slurs
  '\\b(y+[\\W_]*[o0]+[\\W_]*u+[\\W_]*p+[\\W_]*[i1!]+[\\W_]*n+)\\b',

  // Misogynistic terms
  '\\b(s+[\\W_]*a+[\\W_]*l+[\\W_]*[o0]+[\\W_]*p+[\\W_]*e+)\\b',
  '\\b(c+[\\W_]*h+[\\W_]*[i1!]+[\\W_]*e+[\\W_]*n+[\\W_]*n+[\\W_]*e+)\\b',
];

/**
 * French spam patterns
 * These detect spam, advertising, and suspicious content
 */
export const SPAM_PATTERNS_FR: string[] = [
  // Discord invite links (universal)
  '(discord\\.gg/|discordapp\\.com/invite/)',

  // Common spam phrases
  '(nitro\\s+gratuit)',
  '(réclamez\\s+votre)',
  '(cliquez\\s+ici)',
  '(visitez\\s+mon)',
  '(regardez\\s+mon)',

  // Giveaway spam
  '(cadeau\\s+gratuit)',
  '(gagnez\\s+gratuit)',
  '(concours\\s+gratuit)',

  // Suspicious repetition (universal)
  '\\b(\\w+)\\s+\\1\\s+\\1',

  // Advertising
  '(achetez\\s+maintenant)',
  '(offre\\s+limitée)',
  '(temps\\s+limité)',
  '(ne\\s+manquez\\s+pas)',

  // Crypto/scam keywords
  '(cadeau\\s+crypto)',
  '(envoyez\\s+btc)',
  '(doublez\\s+votre)',
];
