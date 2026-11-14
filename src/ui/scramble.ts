/** Random placeholder text in the shape of a value, for the "decoding" effect of `ScrambleText`. */

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&*+=<>?/';
const DIGITS = '0123456789';
/** Kept in place so the placeholder still looks like the field it replaces. */
const FIXED = /[\s.,:;°()\-+/]/;

function pick(set: string): string {
  return set[Math.floor(Math.random() * set.length)]!;
}

/** Random characters in the shape of `text`; the first `revealed` characters stay real. */
export function scramble(text: string, revealed = 0): string {
  let out = '';
  for (let index = 0; index < text.length; index++) {
    const char = text[index]!;
    if (index < revealed || FIXED.test(char)) out += char;
    else out += /\d/.test(char) ? pick(DIGITS) : pick(LETTERS);
  }
  return out;
}
