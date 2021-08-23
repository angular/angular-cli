/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { logging } from '@angular-devkit/core';
import { buildWebpackBrowser } from '../../index';
import { BASE_OPTIONS, BROWSER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(buildWebpackBrowser, BROWSER_BUILDER_INFO, (harness) => {
  describe('Option: "subresourceIntegrity"', () => {
    it(`does not add integrity attribute when not present`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness.expectFile('dist/index.html').content.not.toContain('integrity=');
    });

    it(`does not add integrity attribute when 'false'`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        subresourceIntegrity: false,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness.expectFile('dist/index.html').content.not.toContain('integrity=');
    });

    it(`does add integrity attribute when 'true'`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        subresourceIntegrity: true,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness.expectFile('dist/index.html').content.toMatch(/integrity="\w+-[A-Za-z0-9/+=]+"/);
    });

    it(`does not issue a warning when 'true' and 'scripts' is set.`, async () => {
      await harness.writeFile('src/script.js', '');

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        subresourceIntegrity: true,
        scripts: ['src/script.js'],
      });

      const { result, logs } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness.expectFile('dist/index.html').content.toMatch(/integrity="\w+-[A-Za-z0-9/+=]+"/);
      expect(logs).not.toContain(
        jasmine.objectContaining<logging.LogEntry>({
          message: jasmine.stringMatching(/subresource-integrity/),
        }),
      );
    });
  });
});
