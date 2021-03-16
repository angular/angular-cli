/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { logging } from '@angular-devkit/core';
import { buildWebpackBrowser } from '../../index';
import { BASE_OPTIONS, BROWSER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(buildWebpackBrowser, BROWSER_BUILDER_INFO, (harness) => {
  describe('Option: "showCircularDependencies"', () => {
    beforeEach(async () => {
      // Add circular dependency
      await harness.appendToFile(
        'src/app/app.component.ts',
        `import { AppModule } from './app.module'; console.log(AppModule);`,
      );
    });

    it('should show cyclic dependency warning when option is set to true', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        showCircularDependencies: true,
      });

      const { result, logs } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      expect(logs).toContain(
        jasmine.objectContaining<logging.LogEntry>({
          message: jasmine.stringMatching(/Circular dependency detected/),
        }),
      );
    });

    it('should not show cyclic dependency warning when option is set to false', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        showCircularDependencies: false,
      });

      const { result, logs } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      expect(logs).not.toContain(
        jasmine.objectContaining<logging.LogEntry>({
          message: jasmine.stringMatching(/Circular dependency detected/),
        }),
      );
    });

    it('should not show cyclic dependency warning when option is not present', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result, logs } = await harness.executeOnce();

      expect(result?.success).toBe(true);
      expect(logs).not.toContain(
        jasmine.objectContaining<logging.LogEntry>({
          message: jasmine.stringMatching(/Circular dependency detected/),
        }),
      );
    });
  });
});
