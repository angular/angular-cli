/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { stripIndents } from './literals';

describe('literals', () => {
  describe('stripIndents', () => {
    it('works', () => {
      const test = stripIndents`
        hello world
          how are you?
        test
      `;

      expect(test).toBe('\nhello world\n  how are you?\ntest\n');
    });
  });
});
