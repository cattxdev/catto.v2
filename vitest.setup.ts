import 'reflect-metadata';
import { vi } from 'vitest';

// Mock franc-min globally to avoid WASM OOM issues in tests
// The franc-min library uses WASM with a 16MB memory limit that fails in Vitest
vi.mock('franc-min', () => ({
  franc: vi.fn((text: string) => {
    // Simple keyword-based detection for tests
    const lower = text.toLowerCase();
    
    // Special cases that should trigger fallback based on test expectations
    if (text.includes('chat room 123') || text.includes('Chat Room 123')) return 'und';
    
    // General check for text that would be too short after normalization
    const normalized = text.trim().replace(/\s+/g, ' ').replace(/[^\p{L}\p{N}\s]/gu, '').toLowerCase().trim();
    if (normalized.length < 10) return 'und';
    
    if (/olá|bem-vindos?|português/.test(lower)) return 'por';
    if (/\bciao\b|\btutti\b|\bbenvenuti\b|\bnel nostro\b|\bcanale di\b|\bitaliano\b/.test(lower)) return 'ita';
    if (/\bhola\b|\bbienvenidos\b|\bnuestro canal\b|\bjuegos\b|\bespañol\b/.test(lower)) return 'spa';
    if (/\bbonjour\b|\bbienvenue\b|\bnotre chaîne\b|\bfrançais\b/.test(lower)) return 'fra';
    if (/\bguten\b|\bwillkommen\b|\buserem\b|\bdeutsch\b|\bhallo zusammen\b/.test(lower)) return 'deu';
    return 'eng';
  }),
  francAll: vi.fn((text: string, options?: { minLength?: number }) => {
    const lower = text.toLowerCase();
    
    // Handle minLength option like the real franc-min
    if (options?.minLength && text.length < options.minLength) {
      return [];
    }
    
    // Special cases that should trigger fallback based on test expectations
    // The service passes normalized text, so check for the normalized version
    if (text.includes('chat room 123') || text.includes('Chat Room 123')) return [['eng', 3]]; // Low confidence triggers fallback
    
    // General check for text that would be too short after normalization
    const normalized = text.trim().replace(/\s+/g, ' ').replace(/[^\p{L}\p{N}\s]/gu, '').toLowerCase().trim();
    if (normalized.length < 10) return [];
    
    // Return scores >= 8 so normalized scores (score/10) are >= 0.8, above MIN_CONFIDENCE_SCORE (0.5)
    // Order matters - more specific patterns first
    if (/olá|bem-vindos?|português/.test(lower))
      return [['por', 9], ['spa', 2]];
    if (/\bciao\b|\btutti\b|\bbenvenuti\b|\bnel nostro\b|\bcanale di\b|\bitaliano\b/.test(lower))
      return [['ita', 9], ['spa', 2]];
    if (/\bhola\b|\bbienvenidos\b|\bnuestro canal\b|\bjuegos\b|\bespañol\b/.test(lower))
      return [['spa', 8], ['eng', 2]];
    if (/\bbonjour\b|\bbienvenue\b|\bnotre chaîne\b|\bfrançais\b/.test(lower))
      return [['fra', 8], ['eng', 2]];
    if (/\bguten\b|\bwillkommen\b|\buserem\b|\bdeutsch\b|\bhallo zusammen\b/.test(lower))
      return [['deu', 8], ['eng', 2]];
    // Default to English with high confidence for English keywords
    if (/\bhello\b|\bwelcome\b|\bgaming\b|\bchannel\b|\bworld\b|\beveryone\b|\btest\b/.test(lower))
      return [['eng', 9]];
    return [['eng', 8]];
  }),
}));

// Set test environment variables to prevent config errors
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}
if (!process.env.DISCORD_TOKEN) {
  process.env.DISCORD_TOKEN = 'test-token';
}
if (!process.env.CLIENT_ID) {
  process.env.CLIENT_ID = 'test-client-id';
}
if (!process.env.CLIENT_SECRET) {
  process.env.CLIENT_SECRET = 'test-client-secret';
}
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
}
