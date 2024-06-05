/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { executeDevServer } from '../../index';
import { executeOnceAndFetch } from '../execute-fetch';
import { describeServeBuilder } from '../jasmine-helpers';
import { BASE_OPTIONS, DEV_SERVER_BUILDER_INFO } from '../setup';

describeServeBuilder(executeDevServer, DEV_SERVER_BUILDER_INFO, (harness, setupTarget) => {
  describe('option: "headers"', () => {
    beforeEach(async () => {
      setupTarget(harness, {
        styles: ['src/styles.css'],
      });

      // Application code is not needed for these tests
      await harness.writeFile('src/main.ts', '');
      await harness.writeFile('src/styles.css', '');
    });

    it('index response headers should include configured header', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        headers: {
          'x-custom': 'foo',
        },
      });

      const { result, response } = await executeOnceAndFetch(harness, '/');

      expect(result?.success).toBeTrue();
      expect(await response?.headers.get('x-custom')).toBe('foo');
    });

    it('media resource response headers should include configured header', async () => {
      await harness.writeFiles({
        'src/styles.css': `h1 { background: url('./test.svg')}`,
        'src/test.svg': `<svg xmlns="http://www.w3.org/2000/svg">
                          <text x="20" y="20" font-size="20" fill="red">Hello World</text>
                         </svg>`,
      });

      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        headers: {
          'x-custom': 'foo',
        },
      });

      const { result, response } = await executeOnceAndFetch(harness, '/media/test.svg');

      expect(result?.success).toBeTrue();
      expect(await response?.headers.get('x-custom')).toBe('foo');
    });
  });
});
