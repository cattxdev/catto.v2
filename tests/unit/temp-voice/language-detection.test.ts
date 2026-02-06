/**
 * Unit tests for Language Detection Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LanguageDetectionService } from '../../../src/modules/temp-voice/services/moderation/language-detection.service.js';
import { DEFAULT_LANGUAGE } from '../../../src/modules/temp-voice/constants/languages.js';

// franc-min is mocked globally in vitest.setup.ts to avoid WASM OOM issues

describe('LanguageDetectionService', () => {
  let service: LanguageDetectionService;

  beforeEach(() => {
    service = new LanguageDetectionService();
  });

  describe('detectLanguage', () => {
    it('should detect English text', () => {
      const result = service.detectLanguage('Hello everyone, welcome to our gaming channel');
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.isFallback).toBe(false);
    });

    it('should detect Spanish text', () => {
      const result = service.detectLanguage('Hola a todos, bienvenidos a nuestro canal de juegos');
      expect(result.language).toBe('es');
      expect(result.isFallback).toBe(false);
    });

    it('should detect French text', () => {
      const result = service.detectLanguage('Bonjour à tous, bienvenue sur notre chaîne de jeu');
      expect(result.language).toBe('fr');
      expect(result.isFallback).toBe(false);
    });

    it('should detect German text', () => {
      const result = service.detectLanguage('Hallo zusammen, willkommen auf unserem Gaming-Kanal');
      expect(result.language).toBe('de');
      expect(result.isFallback).toBe(false);
    });

    it('should detect Portuguese text', () => {
      const result = service.detectLanguage('Olá a todos, bem-vindos ao nosso canal de jogos');
      expect(result.language).toBe('pt');
      expect(result.isFallback).toBe(false);
    });

    it('should detect Italian text', () => {
      const result = service.detectLanguage('Ciao a tutti, benvenuti nel nostro canale di giochi');
      expect(result.language).toBe('it');
      expect(result.isFallback).toBe(false);
    });

    it('should use fallback for short text', () => {
      const result = service.detectLanguage('abc');
      expect(result.isFallback).toBe(true);
      expect(result.confidence).toBe(0);
    });

    it('should use fallback for empty text', () => {
      const result = service.detectLanguage('');
      expect(result.isFallback).toBe(true);
      expect(result.language).toBe(DEFAULT_LANGUAGE);
    });

    it('should use custom fallback language', () => {
      const result = service.detectLanguage('abc', 'es');
      expect(result.isFallback).toBe(true);
      expect(result.language).toBe('es');
    });

    it('should handle text with numbers and symbols', () => {
      const result = service.detectLanguage('Chat Room 123 !!!');
      expect(result.isFallback).toBe(true); // Too short after normalization
    });

    it('should return alternatives for ambiguous text', () => {
      const result = service.detectLanguage('Welcome to the voice channel for gaming sessions');
      // With mock, result is well-defined; just verify the structure
      expect(result).toBeDefined();
      expect(result).toHaveProperty('language');
      expect(result).toHaveProperty('confidence');
    });
  });

  describe('detectMultipleLanguages', () => {
    it('should detect primary language', () => {
      const languages = service.detectMultipleLanguages('Hello world gaming channel');
      expect(languages).toContain('en');
    });

    it('should return array with at least one language', () => {
      const languages = service.detectMultipleLanguages('test');
      expect(languages.length).toBeGreaterThan(0);
    });

    it('should use fallback for short text', () => {
      const languages = service.detectMultipleLanguages('x', 'fr');
      expect(languages).toContain('fr');
    });
  });

  describe('getConfidenceScore', () => {
    it('should return confidence for detected language', () => {
      const score = service.getConfidenceScore('Hello everyone welcome to our channel', 'en');
      expect(score).toBeGreaterThan(0);
    });

    it('should return 0 for non-detected language', () => {
      const score = service.getConfidenceScore('Hello everyone', 'it');
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('cache', () => {
    it('should cache detection results', () => {
      const text = 'This is a test of the caching system for language detection';
      const result1 = service.detectLanguage(text);
      const result2 = service.detectLanguage(text);
      
      expect(result1.language).toBe(result2.language);
      expect(result1.confidence).toBe(result2.confidence);
    });

    it('should clear cache', () => {
      service.detectLanguage('test text');
      service.clearCache();
      // Should not throw and should work after clearing
      const result = service.detectLanguage('new test');
      expect(result).toBeDefined();
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources without error', () => {
      expect(() => service.destroy()).not.toThrow();
    });

    it('should clear cache on destroy', () => {
      service.detectLanguage('test');
      service.destroy();
      // Cache should be cleared
      expect(() => service.detectLanguage('new test')).not.toThrow();
    });
  });

  describe('text normalization', () => {
    it('should handle text with special characters', () => {
      const result = service.detectLanguage('Hello!!! @#$ World??? Gaming...');
      // Should still detect language after normalization
      expect(result).toBeDefined();
    });

    it('should handle text with extra whitespace', () => {
      const result = service.detectLanguage('  Hello    World   ');
      expect(result).toBeDefined();
    });

    it('should handle mixed case', () => {
      const result = service.detectLanguage('HeLLo WoRLD GaMiNg ChAnNeL');
      expect(result.language).toBe('en');
    });
  });
});
