/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { execute } from '../../index';
import {
  BASE_OPTIONS,
  describeBuilder,
  UNIT_TEST_BUILDER_INFO,
  setupApplicationTarget,
} from '../setup';

describeBuilder(execute, UNIT_TEST_BUILDER_INFO, (harness) => {
  describe('Behavior: "Vitest top-level await"', () => {
    it('builds the test bundle when the project targets browsers without top-level await', async () => {
      // Zone.js is not a polyfill but is resolvable as a transitive dependency, so the generated
      // TestBed initializer imports 'zone.js/testing' behind a top-level await.
      setupApplicationTarget(harness, { polyfills: [] });

      await harness.writeFile('.browserslistrc', 'Chrome 88');

      harness.useTarget('test', {
        ...BASE_OPTIONS,
      });

      await harness.writeFile(
        'src/app/app.component.spec.ts',
        `
        import { describe, it, expect } from 'vitest';

        describe('Top-level await', () => {
          it('runs', () => {
            expect(true).toBe(true);
          });
        });
      `,
      );

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });
  });
});
