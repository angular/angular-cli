/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { execute } from '../../index';
import { BASE_OPTIONS, KARMA_BUILDER_INFO, describeKarmaBuilder } from '../setup';
import { BuilderMode } from '../../schema';

const ESBUILD_LOG_TEXT = 'Application bundle generation complete.';

describeKarmaBuilder(execute, KARMA_BUILDER_INFO, (harness, setupTarget, isApplicationTarget) => {
  describe('option: "builderMode"', () => {
    beforeEach(async () => {
      await setupTarget(harness);
    });

    it('"application" always uses esbuild', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        // Must explicitly provide localize polyfill:
        polyfills: ['zone.js', '@angular/localize/init', 'zone.js/testing'],
        builderMode: BuilderMode.Application,
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      expect(logs).toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching(ESBUILD_LOG_TEXT),
        }),
      );
    });

    it('"browser" always uses webpack', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        builderMode: BuilderMode.Browser,
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      expect(logs).not.toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching(ESBUILD_LOG_TEXT),
        }),
      );
    });

    it('"detect" follows configuration of the development builder', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        builderMode: BuilderMode.Detect,
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      if (isApplicationTarget) {
        expect(logs).toContain(
          jasmine.objectContaining({
            message: jasmine.stringMatching(ESBUILD_LOG_TEXT),
          }),
        );
      } else {
        expect(logs).not.toContain(
          jasmine.objectContaining({
            message: jasmine.stringMatching(ESBUILD_LOG_TEXT),
          }),
        );
      }
    });
  });
});
