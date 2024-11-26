/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { logging } from '@angular-devkit/core';
import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Option: "hashFuncNames"', () => {
    it(`does not add integrity attribute when not present`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        subresourceIntegrity: true,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness.expectFile('dist/browser/index.html').content.not.toContain('integrity=');
    });

    it(`uses default sri algo when not supplied`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness.expectFile('dist/browser/index.html').content.toContain('integrity=sha384');
    });

    it(`will override hash algorithm if provided`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        hashFuncNames: ['sha256'],
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness.expectFile('dist/browser/index.html').content.toContain('integrity=sha256');
    });

    it(`will use the most secure hash algorithm if multiple are provided`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        hashFuncNames: ['sha256', 'sha512'],
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness.expectFile('dist/browser/index.html').content.toContain('integrity=sha512');
    });
  });
});
