/**
 * Portuguese Language Moderation Patterns
 * Patterns for detecting inappropriate content in Portuguese
 */

/**
 * Portuguese profanity patterns
 * These patterns detect common Portuguese profanity with obfuscation attempts
 */
export const PROFANITY_PATTERNS_PT: string[] = [
  // Merda variations
  '\\b(m+[\\W_]*e+[\\W_]*r+[\\W_]*d+[\\W_]*a+)\\b',

  // Puta/Puto variations
  '\\b(p+[\\W_]*u+[\\W_]*t+[\\W_]*[ao]+)\\b',
  '\\b(p+[\\W_]*u+[\\W_]*t+[\\W_]*[i1!]+[\\W_]*n+[\\W_]*h+[\\W_]*[ao]+)\\b',

  // Caralho variations
  '\\b(c+[\\W_]*a+[\\W_]*r+[\\W_]*a+[\\W_]*l+[\\W_]*h+[\\W_]*[o0]+)\\b',

  // Foder variations
  '\\b(f+[\\W_]*[o0]+[\\W_]*d+[\\W_]*e+[\\W_]*r+)\\b',
  '\\b(f+[\\W_]*[o0]+[\\W_]*d+[\\W_]*[i1!]+[\\W_]*d+[\\W_]*[o0]+)\\b',

  // Cu variations
  '\\b(c+[\\W_]*u+)\\b',

  // Cú variations
  '\\b(c+[\\W_]*ú+)\\b',

  // Cacete variations
  '\\b(c+[\\W_]*a+[\\W_]*c+[\\W_]*e+[\\W_]*t+[\\W_]*e+)\\b',

  // Porra variations
  '\\b(p+[\\W_]*[o0]+[\\W_]*r+[\\W_]*r+[\\W_]*a+)\\b',

  // Filho da puta variations
  '\\b(f+[\\W_]*[i1!]+[\\W_]*l+[\\W_]*h+[\\W_]*[o0]+[\\W_]*d+[\\W_]*a+[\\W_]*p+[\\W_]*u+[\\W_]*t+[\\W_]*a+)\\b',
  '\\b(f+[\\W_]*d+[\\W_]*p+)\\b',

  // Vai se foder
  '\\b(v+[\\W_]*a+[\\W_]*[i1!]+[\\W_]*s+[\\W_]*e+[\\W_]*f+[\\W_]*[o0]+[\\W_]*d+[\\W_]*e+[\\W_]*r+)\\b',

  // Bosta variations
  '\\b(b+[\\W_]*[o0]+[\\W_]*s+[\\W_]*t+[\\W_]*a+)\\b',

  // Buceta variations
  '\\b(b+[\\W_]*u+[\\W_]*c+[\\W_]*e+[\\W_]*t+[\\W_]*a+)\\b',

  // Viado variations
  '\\b(v+[\\W_]*[i1!]+[\\W_]*a+[\\W_]*d+[\\W_]*[o0]+)\\b',

  // Arrombado variations
  '\\b(a+[\\W_]*r+[\\W_]*r+[\\W_]*[o0]+[\\W_]*m+[\\W_]*b+[\\W_]*a+[\\W_]*d+[\\W_]*[o0]+)\\b',
];

/**
 * Portuguese hate speech patterns
 * These detect hate speech, slurs, and discriminatory language
 */
export const HATE_SPEECH_PATTERNS_PT: string[] = [
  // Racial slurs
  '\\b(n+[\\W_]*e+[\\W_]*g+[\\W_]*[uo]+)\\b',
  '\\b(n+[\\W_]*e+[\\W_]*g+[\\W_]*r+[\\W_]*[oa]+)\\b',
  '\\b(m+[\\W_]*a+[\\W_]*c+[\\W_]*a+[\\W_]*c+[\\W_]*[o0]+)\\b',

  // Hate-related terms
  '\\b([o0]+[\\W_]*d+[\\W_]*[i1!]+[\\W_]*[o0]+)\\b',

  // Homophobic slurs
  '\\b(v+[\\W_]*[i1!]+[\\W_]*a+[\\W_]*d+[\\W_]*[o0]+)\\b',
  '\\b(b+[\\W_]*[i1!]+[\\W_]*c+[\\W_]*h+[\\W_]*a+)\\b',
  '\\b(s+[\\W_]*a+[\\W_]*p+[\\W_]*a+[\\W_]*t+[\\W_]*ã+[\\W_]*[o0]+)\\b',
  '\\b(s+[\\W_]*a+[\\W_]*p+[\\W_]*a+[\\W_]*t+[\\W_]*a+[\\W_]*[o0]+)\\b',

  // Xenophobic terms
  '\\b(g+[\\W_]*a+[\\W_]*l+[\\W_]*e+[\\W_]*g+[\\W_]*[o0]+)\\b',

  // Ableist slurs
  '\\b(r+[\\W_]*e+[\\W_]*t+[\\W_]*a+[\\W_]*r+[\\W_]*d+[\\W_]*a+[\\W_]*d+[\\W_]*[o0]+)\\b',
  '\\b(m+[\\W_]*[o0]+[\\W_]*n+[\\W_]*g+[\\W_]*[o0]+[\\W_]*l+[\\W_]*[o0]+[\\W_]*[i1!]+[\\W_]*d+[\\W_]*e+)\\b',
  '\\b(d+[\\W_]*e+[\\W_]*f+[\\W_]*[i1!]+[\\W_]*c+[\\W_]*[i1!]+[\\W_]*e+[\\W_]*n+[\\W_]*t+[\\W_]*e+)\\b',

  // Misogynistic terms
  '\\b(v+[\\W_]*a+[\\W_]*d+[\\W_]*[i1!]+[\\W_]*a+)\\b',
  '\\b(r+[\\W_]*a+[\\W_]*m+[\\W_]*e+[\\W_]*[i1!]+[\\W_]*r+[\\W_]*a+)\\b',
  '\\b(p+[\\W_]*[i1!]+[\\W_]*r+[\\W_]*a+[\\W_]*n+[\\W_]*h+[\\W_]*a+)\\b',
];

/**
 * Portuguese spam patterns
 * These detect spam, advertising, and suspicious content
 */
export const SPAM_PATTERNS_PT: string[] = [
  // Discord invite links (universal)
  '(discord\\.gg/|discordapp\\.com/invite/)',

  // Common spam phrases
  '(nitro\\s+grátis)',
  '(nitro\\s+gratis)',
  '(reivindique\\s+seu)',
  '(clique\\s+aqui)',
  '(visite\\s+meu)',
  '(veja\\s+meu)',

  // Giveaway spam
  '(sorteio\\s+grátis)',
  '(sorteio\\s+gratis)',
  '(ganhe\\s+grátis)',
  '(ganhe\\s+gratis)',

  // Suspicious repetition (universal)
  '\\b(\\w+)\\s+\\1\\s+\\1',

  // Advertising
  '(compre\\s+agora)',
  '(oferta\\s+limitada)',
  '(tempo\\s+limitado)',
  '(não\\s+perca)',
  '(nao\\s+perca)',

  // Crypto/scam keywords
  '(sorteio\\s+crypto)',
  '(envie\\s+btc)',
  '(duplique\\s+seu)',
];
