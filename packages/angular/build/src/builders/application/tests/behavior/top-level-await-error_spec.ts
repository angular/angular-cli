/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Behavior: "Top-level await error message"', () => {
    it('should show a Zone.js-specific error when top-level await is used with Zone.js', async () => {
      await harness.writeFile(
        'src/main.ts',
        `
        const value = await Promise.resolve('test');
        console.log(value);
        `,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        polyfills: ['zone.js'],
      });

      const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });
      expect(result?.success).toBeFalse();
      expect(logs).toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching(
            'Top-level await is not supported in applications that use Zone.js',
          ),
        }),
      );
    });

    it('should not show a Zone.js-specific error when top-level await is used without Zone.js', async () => {
      await harness.writeFile(
        'src/main.ts',
        `
        const value = await Promise.resolve('test');
        console.log(value);
        `,
      );

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        polyfills: [],
      });

      const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });
      // Without Zone.js, the build may still fail due to target environment constraints,
      // but the error should NOT contain the Zone.js-specific message
      const zoneJsErrorPresent = logs.some(
        (log) =>
          typeof log.message === 'string' &&
          log.message.includes('Top-level await is not supported in applications that use Zone.js'),
      );
      expect(zoneJsErrorPresent).toBeFalse();
    });
  });
});
