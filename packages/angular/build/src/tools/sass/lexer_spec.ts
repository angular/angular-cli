/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { findUrls } from './lexer';

describe('Sass URL lexer', () => {
  it('should find url immediately after a colon, comma, or whitespace', () => {
    const input = `.c{property:url("first"),url("second"), url("third");}`;

    const result = [...findUrls(input)];

    expect(result).toEqual([
      { start: 16, end: 23, value: 'first' },
      { start: 29, end: 37, value: 'second' },
      { start: 44, end: 51, value: 'third' },
    ]);
  });

  it('should find full url with string containing url function', () => {
    const input = `.c{property:url("url('abc')");}`;

    const result = [...findUrls(input)];

    expect(result).toEqual([{ start: 16, end: 28, value: `url('abc')` }]);
  });
});
