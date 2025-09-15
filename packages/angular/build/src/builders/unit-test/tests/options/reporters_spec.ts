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
  describe('Option: "reporters"', () => {
    beforeEach(() => {
      setupApplicationTarget(harness);
    });

    it(`should support a single reporter`, async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        reporters: ['json'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it(`should support multiple reporters`, async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        reporters: ['json', 'verbose'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it(`should support a single reporter with options`, async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        reporters: [['json', { outputFile: 'a.json' }]],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('a.json').toExist();
    });

    it(`should support multiple reporters with options`, async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        reporters: [
          ['json', { outputFile: 'a.json' }],
          ['junit', { outputFile: 'a.xml' }],
        ],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('a.json').toExist();
      harness.expectFile('a.xml').toExist();
    });

    it(`should support multiple reporters with and without options`, async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        reporters: [['json', { outputFile: 'a.json' }], 'verbose', 'default'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      harness.expectFile('a.json').toExist();
    });
  });
});
