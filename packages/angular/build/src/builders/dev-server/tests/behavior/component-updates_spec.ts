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
  describe('Behavior: "Component updates"', () => {
    beforeEach(async () => {
      setupTarget(harness, {});

      // Application code is not needed for these tests
      await harness.writeFile('src/main.ts', 'console.log("foo");');
    });

    it('responds with a 400 status if no request component query is present', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });

      const { result, response } = await executeOnceAndFetch(harness, '/@ng/component');

      expect(result?.success).toBeTrue();
      expect(response?.status).toBe(400);
    });

    it('responds with an empty JS file when no component update is available', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });
      const { result, response } = await executeOnceAndFetch(
        harness,
        '/@ng/component?c=src%2Fapp%2Fapp.component.ts%40AppComponent',
      );

      expect(result?.success).toBeTrue();
      expect(response?.status).toBe(200);
      const output = await response?.text();
      expect(response?.headers.get('Content-Type')).toEqual('text/javascript');
      expect(response?.headers.get('Cache-Control')).toEqual('no-cache');
      expect(output).toBe('');
    });

    it('sets ngHmrMode define to true when HMR is enabled', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        hmr: true,
      });

      await harness.writeFile(
        'src/main.ts',
        'declare const ngHmrMode: boolean; console.log(`HMR=${ngHmrMode}`);',
      );

      const { result, content } = await executeOnceAndFetch(harness, 'main.js');

      expect(result?.success).toBeTrue();
      expect(content).toContain('HMR=${true}');
    });

    it('sets ngHmrMode define to false when HMR is disabled', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        hmr: false,
      });

      await harness.writeFile(
        'src/main.ts',
        'declare const ngHmrMode: boolean; console.log(`HMR=${ngHmrMode}`);',
      );

      const { result, content } = await executeOnceAndFetch(harness, 'main.js');

      expect(result?.success).toBeTrue();
      expect(content).toContain('HMR=${false}');
    });
  });
});
