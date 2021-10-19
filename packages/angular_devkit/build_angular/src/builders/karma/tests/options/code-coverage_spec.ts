/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { last, tap } from 'rxjs/operators';
import { promisify } from 'util';
import { execute } from '../../index';
import { BASE_OPTIONS, KARMA_BUILDER_INFO, describeBuilder } from '../setup';

// In each of the test below we'll have to call setTimeout to wait for the coverage
// analysis to be done. This is because karma-coverage performs the analysis
// asynchronously but the promise that it returns is not awaited by Karma.
// Coverage analysis begins when onRunComplete() is invoked, and output files
// are subsequently written to disk. For more information, see
// https://github.com/karma-runner/karma-coverage/blob/32acafa90ed621abd1df730edb44ae55a4009c2c/lib/reporter.js#L221

const setTimeoutPromise = promisify(setTimeout);
const coveragePath = 'coverage/lcov.info';

describeBuilder(execute, KARMA_BUILDER_INFO, (harness) => {
  describe('Option: "codeCoverage"', () => {
    it('should generate coverage report when option is set to true', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        codeCoverage: true,
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      await setTimeoutPromise(1000);
      harness.expectFile(coveragePath).toExist();
    });

    it('should not generate coverage report when option is set to false', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        codeCoverage: false,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBeTrue();

      await setTimeoutPromise(1000);
      harness.expectFile(coveragePath).toNotExist();
    });

    it('should not generate coverage report when option is unset', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBeTrue();

      await setTimeoutPromise(1000);
      harness.expectFile(coveragePath).toNotExist();
    });

    it(`should collect coverage from paths in 'sourceRoot'`, async () => {
      await harness.writeFiles({
        './dist/my-lib/index.d.ts': `
          export declare const title = 'app';
        `,
        './dist/my-lib/index.js': `
          export const title = 'app';
        `,
        './src/app/app.component.ts': `
          import { Component } from '@angular/core';
          import { title } from 'my-lib';
  
          @Component({
            selector: 'app-root',
            templateUrl: './app.component.html',
            styleUrls: ['./app.component.css']
          })
          export class AppComponent {
            title = title;
          }
        `,
      });
      await harness.modifyFile('tsconfig.json', (content) =>
        content.replace(
          /"baseUrl": ".\/",/,
          `
            "baseUrl": "./",
            "paths": {
              "my-lib": [
                "./dist/my-lib"
              ]
            },
          `,
        ),
      );

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        codeCoverage: true,
      });
      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();

      await setTimeoutPromise(1000);
      harness.expectFile(coveragePath).content.not.toContain('my-lib');
    });
  });
});
