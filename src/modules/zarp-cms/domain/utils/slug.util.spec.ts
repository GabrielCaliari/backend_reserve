import { generateSlug } from './slug.util';

describe('generateSlug', () => {
  it('should convert a simple title to slug', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });

  it('should handle accented characters', () => {
    expect(generateSlug('Olá Mundo Café')).toBe('ola-mundo-cafe');
  });

  it('should remove special characters', () => {
    expect(generateSlug('Hello, World! @2024')).toBe('hello-world-2024');
  });

  it('should collapse consecutive hyphens', () => {
    expect(generateSlug('hello---world')).toBe('hello-world');
  });

  it('should trim leading and trailing hyphens', () => {
    expect(generateSlug('--hello-world--')).toBe('hello-world');
  });

  it('should handle empty string', () => {
    expect(generateSlug('')).toBe('');
  });

  it('should handle string with only special characters', () => {
    expect(generateSlug('!@#$%^&*()')).toBe('');
  });

  it('should handle mixed case and numbers', () => {
    expect(generateSlug('Top 10 Best Articles')).toBe('top-10-best-articles');
  });

  it('should handle unicode characters', () => {
    expect(generateSlug('São Paulo é Incrível')).toBe('sao-paulo-e-incrivel');
  });

  it('should handle whitespace variations', () => {
    expect(generateSlug('  hello   world  ')).toBe('hello-world');
  });
});
