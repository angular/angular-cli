/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { logging } from '@angular-devkit/core';
import { concatMap, count, take, timeout } from 'rxjs/operators';
import { BUILD_TIMEOUT, buildWebpackBrowser } from '../../index';
import { BASE_OPTIONS, BROWSER_BUILDER_INFO, describeBuilder } from '../setup';

// The below plugin is only enabled when verbose option is set to true.
const VERBOSE_LOG_TEXT = 'LOG from webpack.';

describeBuilder(buildWebpackBrowser, BROWSER_BUILDER_INFO, (harness) => {
  describe('Option: "verbose"', () => {
    beforeEach(async () => {
      // Application code is not needed for verbose output
      await harness.writeFile('src/main.ts', '');
    });

    it('should include verbose logs when true', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        verbose: true,
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      expect(logs).toContain(
        jasmine.objectContaining<logging.LogEntry>({
          message: jasmine.stringMatching(VERBOSE_LOG_TEXT),
        }),
      );
    });

    it('should not include verbose logs when undefined', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        verbose: undefined,
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      expect(logs).not.toContain(
        jasmine.objectContaining<logging.LogEntry>({
          message: jasmine.stringMatching(VERBOSE_LOG_TEXT),
        }),
      );
    });

    it('should not include verbose logs when false', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        verbose: false,
      });

      const { result, logs } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
      expect(logs).not.toContain(
        jasmine.objectContaining<logging.LogEntry>({
          message: jasmine.stringMatching(VERBOSE_LOG_TEXT),
        }),
      );
    });

    it('should list modified files when verbose is set to true', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        verbose: true,
        watch: true,
      });

      await harness
        .execute()
        .pipe(
          timeout(BUILD_TIMEOUT),
          concatMap(async ({ result, logs }, index) => {
            expect(result?.success).toBeTrue();

            switch (index) {
              case 0:
                // Amend file
                await harness.appendToFile('/src/main.ts', ' ');
                break;
              case 1:
                expect(logs).toContain(
                  jasmine.objectContaining<logging.LogEntry>({
                    message: jasmine.stringMatching(
                      /angular\.watch-files-logs-plugin\n\s+Modified files:\n.+main\.ts/,
                    ),
                  }),
                );

                break;
            }
          }),
          take(2),
          count(),
        )
        .toPromise();
    });

    it('should not include error stacktraces when false', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        verbose: false,
        styles: ['./src/styles.scss'],
      });

      // Create a compilatation error.
      await harness.writeFile('./src/styles.scss', `@import 'invalid-module';`);

      const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });
      expect(result?.success).toBeFalse();
      expect(logs).toContain(
        jasmine.objectContaining<logging.LogEntry>({
          message: jasmine.stringMatching(`SassError: Can't find stylesheet to import.`),
        }),
      );
      expect(logs).not.toContain(
        jasmine.objectContaining<logging.LogEntry>({
          message: jasmine.stringMatching('styles.scss.webpack'),
        }),
      );
      expect(logs).not.toContain(
        jasmine.objectContaining<logging.LogEntry>({
          message: jasmine.stringMatching('at Object.loader'),
        }),
      );
    });

    it('should include error stacktraces when true', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        verbose: true,
        styles: ['./src/styles.scss'],
      });

      // Create a compilatation error.
      await harness.writeFile('./src/styles.scss', `@import 'invalid-module';`);

      const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });
      expect(result?.success).toBeFalse();

      expect(logs).toContain(
        jasmine.objectContaining<logging.LogEntry>({
          message: jasmine.stringMatching('styles.scss.webpack'),
        }),
      );
      expect(logs).toContain(
        jasmine.objectContaining<logging.LogEntry>({
          message: jasmine.stringMatching('at Object.loader'),
        }),
      );
    });
  });
});
