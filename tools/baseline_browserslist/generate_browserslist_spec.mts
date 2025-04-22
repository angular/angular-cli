/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { generateBrowserslist } from './generate_browserslist.mjs';

describe('generate_browserslist', () => {
  describe('generateBrowserslist', () => {
    it('generates a `browserslist` file', () => {
      expect(generateBrowserslist('2025-03-31').trim()).toBe(
        `
Chrome >= 105
ChromeAndroid >= 105
Edge >= 105
Firefox >= 104
FirefoxAndroid >= 104
Safari >= 16
iOS >= 16
        `.trim(),
      );
    });
  });
});
