/**
 * Italian Language Moderation Patterns
 * Patterns for detecting inappropriate content in Italian
 */

/**
 * Italian profanity patterns
 * These patterns detect common Italian profanity with obfuscation attempts
 */
export const PROFANITY_PATTERNS_IT: string[] = [
  // Merda variations
  '\\b(m+[\\W_]*e+[\\W_]*r+[\\W_]*d+[\\W_]*a+)\\b',

  // Cazzo variations
  '\\b(c+[\\W_]*a+[\\W_]*z+[\\W_]*z+[\\W_]*[o0]+)\\b',

  // Fica/Figa variations
  '\\b(f+[\\W_]*[i1!]+[\\W_]*[cg]+[\\W_]*[ao]+)\\b',

  // Puttana/Puttano variations
  '\\b(p+[\\W_]*u+[\\W_]*t+[\\W_]*t+[\\W_]*a+[\\W_]*n+[\\W_]*[ao]+)\\b',

  // Stronzo variations
  '\\b(s+[\\W_]*t+[\\W_]*r+[\\W_]*[o0]+[\\W_]*n+[\\W_]*z+[\\W_]*[o0]+)\\b',

  // Coglione variations
  '\\b(c+[\\W_]*[o0]+[\\W_]*g+[\\W_]*l+[\\W_]*[i1!]+[\\W_]*[o0]+[\\W_]*n+[\\W_]*e+)\\b',

  // Vaffanculo variations
  '\\b(v+[\\W_]*a+[\\W_]*f+[\\W_]*f+[\\W_]*a+[\\W_]*n+[\\W_]*c+[\\W_]*u+[\\W_]*l+[\\W_]*[o0]+)\\b',
  '\\b(v+[\\W_]*a+[\\W_]*f+[\\W_]*f+)\\b',

  // Culo variations
  '\\b(c+[\\W_]*u+[\\W_]*l+[\\W_]*[o0]+)\\b',

  // Minchia variations
  '\\b(m+[\\W_]*[i1!]+[\\W_]*n+[\\W_]*c+[\\W_]*h+[\\W_]*[i1!]+[\\W_]*a+)\\b',

  // Porca variations
  '\\b(p+[\\W_]*[o0]+[\\W_]*r+[\\W_]*c+[\\W_]*a+)\\b',

  // Cretino variations
  '\\b(c+[\\W_]*r+[\\W_]*e+[\\W_]*t+[\\W_]*[i1!]+[\\W_]*n+[\\W_]*[o0]+)\\b',

  // Bastardo variations
  '\\b(b+[\\W_]*a+[\\W_]*s+[\\W_]*t+[\\W_]*a+[\\W_]*r+[\\W_]*d+[\\W_]*[o0]+)\\b',

  // Idiota variations
  '\\b([i1!]+[\\W_]*d+[\\W_]*[i1!]+[\\W_]*[o0]+[\\W_]*t+[\\W_]*a+)\\b',

  // Porco dio
  '\\b(p+[\\W_]*[o0]+[\\W_]*r+[\\W_]*c+[\\W_]*[o0]+[\\W_]*d+[\\W_]*[i1!]+[\\W_]*[o0]+)\\b',
];

/**
 * Italian hate speech patterns
 * These detect hate speech, slurs, and discriminatory language
 */
export const HATE_SPEECH_PATTERNS_IT: string[] = [
  // Racial slurs
  '\\b(n+[\\W_]*e+[\\W_]*g+[\\W_]*r+[\\W_]*[o0]+)\\b',
  '\\b(t+[\\W_]*e+[\\W_]*r+[\\W_]*r+[\\W_]*[o0]+[\\W_]*n+[\\W_]*e+)\\b',

  // Hate-related terms
  '\\b([o0]+[\\W_]*d+[\\W_]*[i1!]+[\\W_]*[o0]+)\\b',

  // Homophobic slurs
  '\\b(f+[\\W_]*r+[\\W_]*[o0]+[\\W_]*c+[\\W_]*[i1!]+[\\W_]*[o0]+)\\b',
  '\\b(f+[\\W_]*[i1!]+[\\W_]*n+[\\W_]*[o0]+[\\W_]*c+[\\W_]*c+[\\W_]*h+[\\W_]*[i1!]+[\\W_]*[o0]+)\\b',
  '\\b(r+[\\W_]*[i1!]+[\\W_]*c+[\\W_]*c+[\\W_]*h+[\\W_]*[i1!]+[\\W_]*[o0]+[\\W_]*n+[\\W_]*e+)\\b',

  // Xenophobic terms
  '\\b(e+[\\W_]*x+[\\W_]*t+[\\W_]*r+[\\W_]*a+[\\W_]*c+[\\W_]*[o0]+[\\W_]*m+[\\W_]*u+[\\W_]*n+[\\W_]*[i1!]+[\\W_]*t+[\\W_]*a+[\\W_]*r+[\\W_]*[i1!]+[\\W_]*[o0]+)\\b',

  // Ableist slurs
  '\\b(r+[\\W_]*[i1!]+[\\W_]*t+[\\W_]*a+[\\W_]*r+[\\W_]*d+[\\W_]*a+[\\W_]*t+[\\W_]*[o0]+)\\b',
  '\\b(m+[\\W_]*[o0]+[\\W_]*n+[\\W_]*g+[\\W_]*[o0]+[\\W_]*l+[\\W_]*[o0]+[\\W_]*[i1!]+[\\W_]*d+[\\W_]*e+)\\b',
  '\\b(h+[\\W_]*a+[\\W_]*n+[\\W_]*d+[\\W_]*[i1!]+[\\W_]*c+[\\W_]*a+[\\W_]*p+[\\W_]*p+[\\W_]*a+[\\W_]*t+[\\W_]*[o0]+)\\b',

  // Misogynistic terms
  '\\b(t+[\\W_]*r+[\\W_]*[o0]+[\\W_]*[i1!]+[\\W_]*a+)\\b',
  '\\b(z+[\\W_]*[o0]+[\\W_]*c+[\\W_]*c+[\\W_]*[o0]+[\\W_]*l+[\\W_]*a+)\\b',
];

/**
 * Italian spam patterns
 * These detect spam, advertising, and suspicious content
 */
export const SPAM_PATTERNS_IT: string[] = [
  // Discord invite links (universal)
  '(discord\\.gg/|discordapp\\.com/invite/)',

  // Common spam phrases
  '(nitro\\s+gratis)',
  '(rivendica\\s+il\\s+tuo)',
  '(clicca\\s+qui)',
  '(visita\\s+il\\s+mio)',
  '(guarda\\s+il\\s+mio)',

  // Giveaway spam
  '(omaggio\\s+gratuito)',
  '(vinci\\s+gratis)',
  '(regalo\\s+gratis)',

  // Suspicious repetition (universal)
  '\\b(\\w+)\\s+\\1\\s+\\1',

  // Advertising
  '(compra\\s+ora)',
  '(offerta\\s+limitata)',
  '(tempo\\s+limitato)',
  '(non\\s+perdere)',

  // Crypto/scam keywords
  '(omaggio\\s+crypto)',
  '(invia\\s+btc)',
  '(raddoppia\\s+il\\s+tuo)',
];
