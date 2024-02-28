/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { logging } from '@angular-devkit/core';
import { concatMap, count, firstValueFrom, take, timeout } from 'rxjs';
import { buildApplication } from '../../index';
import { OutputHashing } from '../../schema';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  beforeEach(async () => {
    await harness.modifyFile('src/tsconfig.app.json', (content) => {
      const tsConfig = JSON.parse(content);
      tsConfig.files = ['main.server.ts', 'main.ts'];

      return JSON.stringify(tsConfig);
    });

    await harness.writeFiles({
      'src/lazy.ts': `export const foo: number = 1;`,
      'src/main.ts': `export async function fn () {
        const lazy = await import('./lazy');
        return lazy.foo;
      }`,
      'src/main.server.ts': `export { fn as default } from './main';`,
    });
  });

  describe('Behavior: "Rebuild both server and browser bundles when using lazy loading"', () => {
    it('detect changes and errors when expected', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        watch: true,
        namedChunks: true,
        outputHashing: OutputHashing.None,
        server: 'src/main.server.ts',
        ssr: true,
      });

      const buildCount = await firstValueFrom(
        harness.execute({ outputLogsOnFailure: false }).pipe(
          timeout(30_000),
          concatMap(async ({ result, logs }, index) => {
            switch (index) {
              case 0:
                expect(result?.success).toBeTrue();

                // Add valid code
                await harness.appendToFile('src/lazy.ts', `console.log('foo');`);

                break;
              case 1:
                expect(result?.success).toBeTrue();

                // Update type of 'foo' to invalid (number -> string)
                await harness.writeFile('src/lazy.ts', `export const foo: string = 1;`);

                break;
              case 2:
                expect(result?.success).toBeFalse();
                expect(logs).toContain(
                  jasmine.objectContaining<logging.LogEntry>({
                    message: jasmine.stringMatching(
                      `Type 'number' is not assignable to type 'string'.`,
                    ),
                  }),
                );

                // Fix TS error
                await harness.writeFile('src/lazy.ts', `export const foo: string = "1";`);

                break;
              case 3:
                expect(result?.success).toBeTrue();

                break;
            }
          }),
          take(4),
          count(),
        ),
      );

      expect(buildCount).toBe(4);
    });
  });
});
