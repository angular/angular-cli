/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { oneLine, stripIndent, stripIndents, trimNewlines } from './literals';

describe('literals', () => {
  describe('stripIndent', () => {
    it('works', () => {
      const test = stripIndent`
        hello world
          how are you?
        test
      `;

      expect(test).toBe('hello world\n  how are you?\ntest');
    });
  });

  describe('stripIndents', () => {
    it('works', () => {
      const test = stripIndents`
        hello world
          how are you?
        test
      `;

      expect(test).toBe('hello world\nhow are you?\ntest');
    });
  });

  describe('oneLine', () => {
    it('works', () => {
      const test = oneLine`
        hello world
          how are you?  blue  red
        test
      `;

      expect(test).toBe('hello world how are you?  blue  red test');
    });
  });

  describe('trimNewlines', () => {
    it('works', () => {
      const test = trimNewlines`
        hello world
      `;

      expect(test).toBe('        hello world');
    });
  });
});
