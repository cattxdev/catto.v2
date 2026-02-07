/**
 * English Language Moderation Patterns
 * Patterns for detecting inappropriate content in English
 */

/**
 * English profanity patterns
 * These patterns detect common profanity with obfuscation attempts
 */
export const PROFANITY_PATTERNS_EN: string[] = [
  // F-word variations
  '\\b(f+[\\W_]*u+[\\W_]*c+[\\W_]*k+)\\b',
  '\\b(f+[\\W_]*[u\\*]+[\\W_]*[c\\*]+[\\W_]*[k\\*]+)\\b',

  // S-word variations
  '\\b(s+[\\W_]*h+[\\W_]*i+[\\W_]*t+)\\b',
  '\\b(s+[\\W_]*h+[\\W_]*[i1!]+[\\W_]*[t\\*]+)\\b',

  // B-word variations
  '\\b(b+[\\W_]*i+[\\W_]*t+[\\W_]*c+[\\W_]*h+)\\b',
  '\\b(b+[\\W_]*[i1!]+[\\W_]*[t\\*]+[\\W_]*[c\\*]+[\\W_]*[h\\*]+)\\b',

  // A-word variations
  '\\b(a+[\\W_]*s+[\\W_]*s+)\\b',
  '\\b(a+[\\W_]*s+[\\W_]*s+[\\W_]*h+[\\W_]*o+[\\W_]*l+[\\W_]*e+)\\b',

  // D-word variations
  '\\b(d+[\\W_]*a+[\\W_]*m+[\\W_]*n+)\\b',
  '\\b(d+[\\W_]*a+[\\W_]*m+[\\W_]*m+[\\W_]*i+[\\W_]*t+)\\b',

  // Hell variations
  '\\b(h+[\\W_]*e+[\\W_]*l+[\\W_]*l+)\\b',

  // C-word variations
  '\\b(c+[\\W_]*u+[\\W_]*n+[\\W_]*t+)\\b',
  '\\b(c+[\\W_]*[o0]+[\\W_]*c+[\\W_]*k+)\\b',

  // P-word variations
  '\\b(p+[\\W_]*[i1!]+[\\W_]*s+[\\W_]*s+)\\b',
  '\\b(p+[\\W_]*u+[\\W_]*s+[\\W_]*s+[\\W_]*y+)\\b',

  // D-word variations
  '\\b(d+[\\W_]*i+[\\W_]*c+[\\W_]*k+)\\b',
];

/**
 * English hate speech patterns
 * These detect hate speech, slurs, and discriminatory language
 */
export const HATE_SPEECH_PATTERNS_EN: string[] = [
  // Racial slurs (obfuscated)
  '\\b(n+[\\W_]*[i1!]+[\\W_]*[g9]+[\\W_]*[g9]+[\\W_]*[ea@]+[\\W_]*r*)\\b',
  '\\b(n+[\\W_]*[i1!]+[\\W_]*[g9]+[\\W_]*[g9]+[\\W_]*[a@4]+)\\b',

  // Hate-related terms
  '\\b(h+[\\W_]*[a@4]+[\\W_]*t+[\\W_]*e+)\\b',
  '\\b(k+[\\W_]*i+[\\W_]*k+[\\W_]*e+)\\b',
  '\\b(n+[\\W_]*a+[\\W_]*z+[\\W_]*i+)\\b',

  // Homophobic slurs
  '\\b(f+[\\W_]*a+[\\W_]*g+[\\W_]*[g9]*[\\W_]*[o0]*[\\W_]*[t\\*]*)\\b',
  '\\b(d+[\\W_]*y+[\\W_]*k+[\\W_]*e+)\\b',

  // Ableist slurs
  '\\b(r+[\\W_]*e+[\\W_]*t+[\\W_]*a+[\\W_]*r+[\\W_]*d+)\\b',
  '\\b(r+[\\W_]*e+[\\W_]*t+[\\W_]*a+[\\W_]*r+[\\W_]*d+[\\W_]*e+[\\W_]*d+)\\b',

  // Transphobic slurs
  '\\b(t+[\\W_]*r+[\\W_]*a+[\\W_]*n+[\\W_]*n+[\\W_]*[yi]+)\\b',

  // Misogynistic terms
  '\\b(w+[\\W_]*h+[\\W_]*o+[\\W_]*r+[\\W_]*e+)\\b',
  '\\b(s+[\\W_]*l+[\\W_]*u+[\\W_]*t+)\\b',
];

/**
 * English spam patterns
 * These detect spam, advertising, and suspicious content
 */
export const SPAM_PATTERNS_EN: string[] = [
  // Discord invite links
  '(discord\\.gg/|discordapp\\.com/invite/)',

  // Common spam phrases
  '(free\\s+nitro)',
  '(claim\\s+your)',
  '(click\\s+here)',
  '(visit\\s+my)',
  '(check\\s+out\\s+my)',

  // Giveaway spam
  '(free\\s+giveaway)',
  '(win\\s+free)',

  // Suspicious repetition
  '\\b(\\w+)\\s+\\1\\s+\\1',

  // Advertising
  '(buy\\s+now)',
  '(limited\\s+time)',
  '(act\\s+now)',
  '(dont\\s+miss)',

  // Crypto/scam keywords
  '(crypto\\s+giveaway)',
  '(send\\s+btc)',
  '(double\\s+your)',
];
