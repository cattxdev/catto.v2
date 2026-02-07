/**
 * Spanish Language Moderation Patterns
 * Patterns for detecting inappropriate content in Spanish
 */

/**
 * Spanish profanity patterns
 * These patterns detect common Spanish profanity with obfuscation attempts
 */
export const PROFANITY_PATTERNS_ES: string[] = [
  // Mierda variations
  '\\b(m+[\\W_]*[i1!]+[\\W_]*e+[\\W_]*r+[\\W_]*d+[\\W_]*a+)\\b',

  // Puta/Puto variations
  '\\b(p+[\\W_]*u+[\\W_]*t+[\\W_]*[ao]+)\\b',
  '\\b(p+[\\W_]*u+[\\W_]*t+[\\W_]*[i1!]+[\\W_]*t+[\\W_]*[ao]+)\\b',

  // Carajo variations
  '\\b(c+[\\W_]*a+[\\W_]*r+[\\W_]*a+[\\W_]*j+[\\W_]*[o0]+)\\b',

  // Coño variations
  '\\b(c+[\\W_]*o+[\\W_]*ñ+[\\W_]*[o0]+)\\b',
  '\\b(c+[\\W_]*[o0]+[\\W_]*n+[\\W_]*[o0]+)\\b',

  // Joder variations
  '\\b(j+[\\W_]*[o0]+[\\W_]*d+[\\W_]*e+[\\W_]*r+)\\b',

  // Cabrón variations
  '\\b(c+[\\W_]*a+[\\W_]*b+[\\W_]*r+[\\W_]*[oó]+[\\W_]*n+)\\b',
  '\\b(c+[\\W_]*a+[\\W_]*b+[\\W_]*r+[\\W_]*[o0]+[\\W_]*n+)\\b',

  // Pendejo variations
  '\\b(p+[\\W_]*e+[\\W_]*n+[\\W_]*d+[\\W_]*e+[\\W_]*j+[\\W_]*[o0]+)\\b',

  // Hijo de puta variations
  '\\b(h+[\\W_]*[i1!]+[\\W_]*j+[\\W_]*[o0]+[\\W_]*d+[\\W_]*e+[\\W_]*p+[\\W_]*u+[\\W_]*t+[\\W_]*a+)\\b',
  '\\b(h+[\\W_]*d+[\\W_]*p+)\\b',

  // Chingar variations
  '\\b(c+[\\W_]*h+[\\W_]*[i1!]+[\\W_]*n+[\\W_]*g+[\\W_]*[ao]+)\\b',

  // Verga variations
  '\\b(v+[\\W_]*e+[\\W_]*r+[\\W_]*g+[\\W_]*a+)\\b',

  // Culero variations
  '\\b(c+[\\W_]*u+[\\W_]*l+[\\W_]*e+[\\W_]*r+[\\W_]*[o0]+)\\b',

  // Mamón variations
  '\\b(m+[\\W_]*a+[\\W_]*m+[\\W_]*[oó]+[\\W_]*n+)\\b',
  '\\b(m+[\\W_]*a+[\\W_]*m+[\\W_]*[o0]+[\\W_]*n+)\\b',

  // Marica variations
  '\\b(m+[\\W_]*a+[\\W_]*r+[\\W_]*[i1!]+[\\W_]*c+[\\W_]*[ao]+)\\b',
];

/**
 * Spanish hate speech patterns
 * These detect hate speech, slurs, and discriminatory language
 */
export const HATE_SPEECH_PATTERNS_ES: string[] = [
  // Racial slurs
  '\\b(n+[\\W_]*e+[\\W_]*g+[\\W_]*r+[\\W_]*[o0a]+)\\b',

  // Hate-related terms
  '\\b([o0]+[\\W_]*d+[\\W_]*[i1!]+[\\W_]*[o0]+)\\b',

  // Homophobic slurs
  '\\b(m+[\\W_]*a+[\\W_]*r+[\\W_]*[i1!]+[\\W_]*c+[\\W_]*[ao]+[\\W_]*n+)\\b',
  '\\b(m+[\\W_]*a+[\\W_]*r+[\\W_]*[i1!]+[\\W_]*c+[\\W_]*[o0]+)\\b',
  '\\b(p+[\\W_]*u+[\\W_]*t+[\\W_]*[o0]+)\\b',

  // Xenophobic terms
  '\\b(s+[\\W_]*u+[\\W_]*d+[\\W_]*a+[\\W_]*c+[\\W_]*a+)\\b',

  // Ableist slurs
  '\\b(r+[\\W_]*e+[\\W_]*t+[\\W_]*r+[\\W_]*a+[\\W_]*s+[\\W_]*a+[\\W_]*d+[\\W_]*[o0]+)\\b',
  '\\b(m+[\\W_]*[o0]+[\\W_]*n+[\\W_]*g+[\\W_]*[o0]+[\\W_]*l+[\\W_]*[i1!]+[\\W_]*c+[\\W_]*[o0]+)\\b',

  // Misogynistic terms
  '\\b(z+[\\W_]*[o0]+[\\W_]*r+[\\W_]*r+[\\W_]*a+)\\b',
  '\\b(p+[\\W_]*e+[\\W_]*r+[\\W_]*r+[\\W_]*a+)\\b',
];

/**
 * Spanish spam patterns
 * These detect spam, advertising, and suspicious content
 */
export const SPAM_PATTERNS_ES: string[] = [
  // Discord invite links (universal)
  '(discord\\.gg/|discordapp\\.com/invite/)',

  // Common spam phrases
  '(nitro\\s+gratis)',
  '(reclama\\s+tu)',
  '(haz\\s+clic)',
  '(visita\\s+mi)',
  '(mira\\s+mi)',

  // Giveaway spam
  '(sorteo\\s+gratis)',
  '(gana\\s+gratis)',
  '(regalo\\s+gratis)',

  // Suspicious repetition (universal)
  '\\b(\\w+)\\s+\\1\\s+\\1',

  // Advertising
  '(compra\\s+ahora)',
  '(oferta\\s+limitada)',
  '(tiempo\\s+limitado)',
  '(no\\s+te\\s+pierdas)',

  // Crypto/scam keywords
  '(sorteo\\s+crypto)',
  '(envia\\s+btc)',
  '(duplica\\s+tu)',
];
