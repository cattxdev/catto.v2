/**
 * German Language Moderation Patterns
 * Patterns for detecting inappropriate content in German
 */

/**
 * German profanity patterns
 * These patterns detect common German profanity with obfuscation attempts
 */
export const PROFANITY_PATTERNS_DE: string[] = [
  // Scheiße variations
  '\\b(s+[\\W_]*c+[\\W_]*h+[\\W_]*[e3]+[\\W_]*[i1!]+[\\W_]*[sß]+[\\W_]*e+)\\b',
  '\\b(s+[\\W_]*c+[\\W_]*h+[\\W_]*e+[\\W_]*[i1!]+[\\W_]*s+[\\W_]*s+[\\W_]*e+)\\b',

  // Arsch variations
  '\\b(a+[\\W_]*r+[\\W_]*s+[\\W_]*c+[\\W_]*h+)\\b',
  '\\b(a+[\\W_]*r+[\\W_]*s+[\\W_]*c+[\\W_]*h+[\\W_]*l+[\\W_]*[o0]+[\\W_]*c+[\\W_]*h+)\\b',

  // Fick variations
  '\\b(f+[\\W_]*[i1!]+[\\W_]*c+[\\W_]*k+)\\b',
  '\\b(f+[\\W_]*[i1!]+[\\W_]*c+[\\W_]*k+[\\W_]*e+[\\W_]*n+)\\b',

  // Schlampe variations
  '\\b(s+[\\W_]*c+[\\W_]*h+[\\W_]*l+[\\W_]*a+[\\W_]*m+[\\W_]*p+[\\W_]*e+)\\b',

  // Hurensohn variations
  '\\b(h+[\\W_]*u+[\\W_]*r+[\\W_]*e+[\\W_]*n+[\\W_]*s+[\\W_]*[o0]+[\\W_]*h+[\\W_]*n+)\\b',

  // Fotze variations
  '\\b(f+[\\W_]*[o0]+[\\W_]*t+[\\W_]*z+[\\W_]*e+)\\b',

  // Miststück variations
  '\\b(m+[\\W_]*[i1!]+[\\W_]*s+[\\W_]*t+[\\W_]*s+[\\W_]*t+[\\W_]*ü+[\\W_]*c+[\\W_]*k+)\\b',
  '\\b(m+[\\W_]*[i1!]+[\\W_]*s+[\\W_]*t+[\\W_]*s+[\\W_]*t+[\\W_]*u+[\\W_]*e+[\\W_]*c+[\\W_]*k+)\\b',

  // Wichser variations
  '\\b(w+[\\W_]*[i1!]+[\\W_]*c+[\\W_]*h+[\\W_]*s+[\\W_]*e+[\\W_]*r+)\\b',

  // Dummkopf variations
  '\\b(d+[\\W_]*u+[\\W_]*m+[\\W_]*m+[\\W_]*k+[\\W_]*[o0]+[\\W_]*p+[\\W_]*f+)\\b',

  // Schwanz variations
  '\\b(s+[\\W_]*c+[\\W_]*h+[\\W_]*w+[\\W_]*a+[\\W_]*n+[\\W_]*z+)\\b',

  // Mistkerl variations
  '\\b(m+[\\W_]*[i1!]+[\\W_]*s+[\\W_]*t+[\\W_]*k+[\\W_]*e+[\\W_]*r+[\\W_]*l+)\\b',

  // Penner variations
  '\\b(p+[\\W_]*e+[\\W_]*n+[\\W_]*n+[\\W_]*e+[\\W_]*r+)\\b',

  // Hure variations
  '\\b(h+[\\W_]*u+[\\W_]*r+[\\W_]*e+)\\b',
];

/**
 * German hate speech patterns
 * These detect hate speech, slurs, and discriminatory language
 */
export const HATE_SPEECH_PATTERNS_DE: string[] = [
  // Nazi-related terms
  '\\b(n+[\\W_]*a+[\\W_]*z+[\\W_]*[i1!]+)\\b',
  '\\b(h+[\\W_]*[i1!]+[\\W_]*t+[\\W_]*l+[\\W_]*e+[\\W_]*r+)\\b',
  '\\b(j+[\\W_]*u+[\\W_]*d+[\\W_]*e+)\\b',

  // Hate-related terms
  '\\b(h+[\\W_]*a+[\\W_]*s+[\\W_]*s+)\\b',

  // Racial slurs
  '\\b(k+[\\W_]*a+[\\W_]*n+[\\W_]*a+[\\W_]*k+[\\W_]*e+)\\b',

  // Homophobic slurs
  '\\b(s+[\\W_]*c+[\\W_]*h+[\\W_]*w+[\\W_]*u+[\\W_]*c+[\\W_]*h+[\\W_]*t+[\\W_]*e+[\\W_]*l+)\\b',
  '\\b(t+[\\W_]*u+[\\W_]*n+[\\W_]*t+[\\W_]*e+)\\b',

  // Xenophobic terms
  '\\b(a+[\\W_]*u+[\\W_]*s+[\\W_]*l+[\\W_]*ä+[\\W_]*n+[\\W_]*d+[\\W_]*e+[\\W_]*r+)\\b',
  '\\b(a+[\\W_]*u+[\\W_]*s+[\\W_]*l+[\\W_]*a+[\\W_]*e+[\\W_]*n+[\\W_]*d+[\\W_]*e+[\\W_]*r+)\\b',
  '\\b(z+[\\W_]*[i1!]+[\\W_]*g+[\\W_]*e+[\\W_]*u+[\\W_]*n+[\\W_]*e+[\\W_]*r+)\\b',

  // Ableist slurs
  '\\b(b+[\\W_]*e+[\\W_]*h+[\\W_]*[i1!]+[\\W_]*n+[\\W_]*d+[\\W_]*e+[\\W_]*r+[\\W_]*t+)\\b',
  '\\b(k+[\\W_]*r+[\\W_]*ü+[\\W_]*p+[\\W_]*p+[\\W_]*e+[\\W_]*l+)\\b',
  '\\b(k+[\\W_]*r+[\\W_]*u+[\\W_]*e+[\\W_]*p+[\\W_]*p+[\\W_]*e+[\\W_]*l+)\\b',

  // Misogynistic terms
  '\\b(s+[\\W_]*c+[\\W_]*h+[\\W_]*l+[\\W_]*a+[\\W_]*m+[\\W_]*p+[\\W_]*e+)\\b',
  '\\b(n+[\\W_]*u+[\\W_]*t+[\\W_]*t+[\\W_]*e+)\\b',
];

/**
 * German spam patterns
 * These detect spam, advertising, and suspicious content
 */
export const SPAM_PATTERNS_DE: string[] = [
  // Discord invite links (universal)
  '(discord\\.gg/|discordapp\\.com/invite/)',

  // Common spam phrases
  '(gratis\\s+nitro)',
  '(fordere\\s+dein)',
  '(klick\\s+hier)',
  '(besuche\\s+mein)',
  '(schau\\s+dir\\s+mein)',

  // Giveaway spam
  '(gratis\\s+gewinnspiel)',
  '(gewinne\\s+kostenlos)',
  '(geschenk\\s+gratis)',

  // Suspicious repetition (universal)
  '\\b(\\w+)\\s+\\1\\s+\\1',

  // Advertising
  '(kaufe\\s+jetzt)',
  '(begrenztes\\s+angebot)',
  '(begrenzte\\s+zeit)',
  '(verpasse\\s+nicht)',

  // Crypto/scam keywords
  '(crypto\\s+gewinnspiel)',
  '(sende\\s+btc)',
  '(verdopple\\s+dein)',
];
