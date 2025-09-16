/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder, expectNoLog } from '../setup';

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Option: "subresourceIntegrity"', () => {
    it(`does not add integrity attribute when not present`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness.expectFile('dist/browser/index.html').content.not.toContain('integrity=');
    });

    it(`does not add integrity attribute when 'false'`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        subresourceIntegrity: false,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness.expectFile('dist/browser/index.html').content.not.toContain('integrity=');
    });

    it(`does add integrity attribute when 'true'`, async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        subresourceIntegrity: true,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      harness
        .expectFile('dist/browser/index.html')
        .content.toMatch(/integrity="\w+-[A-Za-z0-9/+=]+"/);
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
      harness
        .expectFile('dist/browser/index.html')
        .content.toMatch(/integrity="\w+-[A-Za-z0-9/+=]+"/);
      expectNoLog(logs, /subresource-integrity/);
    });
  });
});
