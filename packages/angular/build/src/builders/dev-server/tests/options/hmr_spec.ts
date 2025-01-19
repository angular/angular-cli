/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { logging } from '@angular-devkit/core';
import { executeDevServer } from '../../index';
import { executeOnceAndFetch } from '../execute-fetch';
import { describeServeBuilder } from '../jasmine-helpers';
import { BASE_OPTIONS, DEV_SERVER_BUILDER_INFO } from '../setup';

describeServeBuilder(executeDevServer, DEV_SERVER_BUILDER_INFO, (harness, setupTarget) => {
  describe('option: "hmr"', () => {
    beforeEach(async () => {
      setupTarget(harness, {});
    });

    it('shows message with opt out steps by default', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
      });

      const { result, logs } = await executeOnceAndFetch(harness, '/');

      expect(result?.success).toBeTrue();
      expect(logs).toContain(
        jasmine.objectContaining<logging.LogEntry>({
          message: jasmine.stringMatching('Component HMR has been enabled'),
        }),
      );
      expect(logs).toContain(
        jasmine.objectContaining<logging.LogEntry>({
          message: jasmine.stringMatching('--no-hmr'),
        }),
      );
    });

    it('shows message with opt out steps when explicitly enabled', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        hmr: true,
      });

      const { result, logs } = await executeOnceAndFetch(harness, '/');

      expect(result?.success).toBeTrue();
      expect(logs).toContain(
        jasmine.objectContaining<logging.LogEntry>({
          message: jasmine.stringMatching('Component HMR has been enabled'),
        }),
      );
      expect(logs).toContain(
        jasmine.objectContaining<logging.LogEntry>({
          message: jasmine.stringMatching('--no-hmr'),
        }),
      );
    });

    it('does not show enabled message with opt out steps when explicitly disabled', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        hmr: false,
      });

      const { result, logs } = await executeOnceAndFetch(harness, '/');

      expect(result?.success).toBeTrue();
      expect(logs).not.toContain(
        jasmine.objectContaining<logging.LogEntry>({
          message: jasmine.stringMatching('Component HMR has been enabled'),
        }),
      );
      expect(logs).not.toContain(
        jasmine.objectContaining<logging.LogEntry>({
          message: jasmine.stringMatching('--no-hmr'),
        }),
      );
    });
  });
});
