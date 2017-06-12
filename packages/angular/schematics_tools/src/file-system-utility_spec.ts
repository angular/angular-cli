/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {parseJson} from './file-system-utility';


describe('parseJson', () => {
  it('works', () => {
    expect(parseJson('{ "a": 1 }')).toEqual({a: 1});
    expect(() => parseJson('{ 1 }')).toThrow();
  });

  it('strips comments', () => {
    expect(parseJson(`
      // THIS IS A COMMENT
      {
        /* THIS IS ALSO A COMMENT */ // IGNORED BECAUSE COMMENT
        // AGAIN, COMMENT /* THIS SHOULD NOT BE WEIRD
        "a": "this // should not be a comment",
        "a2": "this /* should also not be a comment",
        /* MULTIPLE
           LINE
           COMMENT
           \o/ */
        "b" /* COMMENT */: /* YOU GUESSED IT */ 1 // COMMENT
        , /* STILL VALID */
        "c": 2
      }
    `)).toEqual({
      a: 'this // should not be a comment',
      a2: 'this /* should also not be a comment',
      b: 1,
      c: 2
    });
  });
});
