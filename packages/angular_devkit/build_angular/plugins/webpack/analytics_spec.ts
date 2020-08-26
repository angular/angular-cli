/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { countOccurrences } from './analytics';


function _randomString(len: number) {
  const charSpace = `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ`;

  let s = '';
  for (let i = 0; i < len; i++) {
    s += charSpace[Math.floor(Math.random() * charSpace.length)];
  }

  return s;
}

describe('countOccurrences', () => {
  // Every use cases is a text, search, word break or not, and expected result.
  const useCases: [string, string, boolean, number][] = [
    ['abc1def1ghi1jkl1mno1pqrs1tuvw1xyz', '1', false, 7],  // 0
    ['abc1def12ghi1jkl1mno12pqrs12tuvw1xyz12', '12', false, 4],  // 1
    ['abc', 'abc', false, 1],  // 2
    ['abc', 'abc', true, 1],  // 3
    ['aaaaa', 'aaa', false, 1],  // 4
    ['aa aaa', 'aaa', true, 1],  // 5
    ['aaaaaa', 'aaa', false, 2],  // 6
    ['aaa aaa', 'aaa', true, 2],  // 7
    ['a', 'a', false, 1],  // 8
    ['a', 'a', true, 1],  // 9
  ];

  useCases.forEach(([text, search, wordBreak, expected], i) => {
    it(`works (${i})`, () => {
      expect(countOccurrences(text, search, wordBreak)).toBe(expected);
    });
  });

  // Random testing.
  it('can count (random, wordBreak=false)', () => {
    // Generate a random string with injected search strings in it.
    let text = _randomString(10000);
    const search = _randomString(100).toLowerCase();
    const nb = Math.floor(Math.random() * 200 + 100);

    // Insert nb search string in.
    new Array(nb).fill(0)
      // Map it with a random position.
      .map(() => Math.floor(Math.random() * text.length))
      // Sort from highest to lowest.
      .sort((a, b) => b - a)
      // Insert the search string for each position created this way.
      .forEach(pos => {
        text = text.slice(0, pos) + search + text.slice(pos);
      });

    expect(countOccurrences(text, search, false)).toBe(nb);
    expect(countOccurrences(text, search, true)).toBe(0);
  });

  it('can count (random, wordBreak=true)', () => {
    // Generate a random string with injected search strings in it.
    let text = _randomString(10000);
    const search = _randomString(100).toLowerCase();
    let nb = Math.floor(Math.random() * 200 + 100);

    // Insert nb search string in.
    new Array(nb).fill(0)
    // Map it with a random position.
      .map(() => Math.floor(Math.random() * text.length))
      // Sort from highest to lowest.
      .sort((a, b) => b - a)
      // Insert the search string for each position created this way.
      .forEach(pos => {
        switch (Math.floor(Math.random() * 5)) {
          case 0:
            // Do not insert a wordbreak.
            text = text.slice(0, pos) + search + text.slice(pos);
            nb--;
            break;

          case 1: text = text.slice(0, pos) + ' ' + search + ' ' + text.slice(pos); break;
          case 2: text = text.slice(0, pos) + '(' + search + '$' + text.slice(pos); break;
          case 3: text = text.slice(0, pos) + '|' + search + ')' + text.slice(pos); break;
          case 4: text = text.slice(0, pos) + '-' + search + '.' + text.slice(pos); break;
        }
      });

    expect(countOccurrences(text, search, true)).toBe(nb);
  });
});
