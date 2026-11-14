import { describe, expect, it } from 'vitest';
import { renderBlockText } from './blockFont';

describe('renderBlockText', () => {
  it('packs 5 pixel rows into 3 lines of equal width', () => {
    const lines = renderBlockText('HI');
    expect(lines).toHaveLength(3);
    // H (4) + gap (1) + I (3)
    expect(lines.every((line) => line.length === 8)).toBe(true);
    expect(lines[0]).toBe('█  █ ▀█▀');
  });

  it('folds accents so translated headings render', () => {
    expect(renderBlockText('Ó')).toEqual(renderBlockText('O'));
    expect(renderBlockText('ñ')).toEqual(renderBlockText('N'));
  });
});
