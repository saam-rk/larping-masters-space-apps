import { describe, expect, it } from 'vitest';
import { scramble } from './scramble';

describe('scramble', () => {
  it('keeps the length, separators and digit positions of the value', () => {
    const text = '-85,4381° S, 37.36667° E';
    const out = scramble(text);
    expect(out).toHaveLength(text.length);
    for (let index = 0; index < text.length; index++) {
      const char = text[index]!;
      if (/[\s.,°-]/.test(char)) expect(out[index]).toBe(char);
      if (/\d/.test(char)) expect(out[index]).toMatch(/\d/);
    }
  });

  it('keeps the revealed prefix', () => {
    expect(scramble('NOBILE RIM 1', 6).slice(0, 6)).toBe('NOBILE');
    expect(scramble('abc', 3)).toBe('abc');
  });
});
