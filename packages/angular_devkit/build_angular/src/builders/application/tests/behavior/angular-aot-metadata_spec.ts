/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Behavior: "Angular metadata"', () => {
    it('should not emit any AOT class metadata functions', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);

      harness.expectFile('dist/main.js').content.not.toContain('setClassMetadata');
    });

    it('should not emit any AOT NgModule scope metadata functions', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);

      harness.expectFile('dist/main.js').content.not.toContain('setNgModuleScope');
    });
  });
});
