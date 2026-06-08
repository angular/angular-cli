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
  xdescribe('Option: "buildTarget"', () => {
    beforeEach(async () => {
      setupApplicationTarget(harness);
    });

    it('should fail when buildTarget is not provided', async () => {
      const { buildTarget, ...rest } = BASE_OPTIONS;
      harness.useTarget('test', rest as any);

      await expectAsync(harness.executeOnce()).toBeRejectedWithError(/"buildTarget" is required/);
    });

    it('should fail when buildTarget is empty', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        buildTarget: '',
      });

      await expectAsync(harness.executeOnce()).toBeRejectedWithError(
        /must match "\^\S+:\S+(:\S+)?\$"/,
      );
    });

    it('should fail when buildTarget does not have a project name', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        buildTarget: ':build',
      });

      await expectAsync(harness.executeOnce()).toBeRejectedWithError(
        /must match "\^\S+:\S+(:\S+)?\$"/,
      );
    });

    it('should fail when buildTarget does not have a target name', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        buildTarget: 'app:',
      });

      await expectAsync(harness.executeOnce()).toBeRejectedWithError(
        /must match "\^\S+:\S+(:\S+)?\$"/,
      );
    });
  });
});
