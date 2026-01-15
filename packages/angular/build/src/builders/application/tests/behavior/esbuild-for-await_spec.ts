/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Behavior: "Esbuild for-await"', () => {
    it('should properly downlevel for-await loops with optimization enabled', async () => {
      // Setup a for-await loop that triggers the esbuild minification bug when async/await is downleveled.
      await harness.writeFile(
        'src/main.ts',
        `
        async function test() {
          const someAsyncIterable = {
            [Symbol.asyncIterator]() {
              return {
                next() {
                  return Promise.resolve({ done: true, value: undefined });
                }
              };
            }
          };
          for await(const item of someAsyncIterable) {
            console.log(item);
          }
        }
        test();
        `,
      );

      // Ensure target is ES2022 so that optional catch binding is supported natively.
      await harness.modifyFile('src/tsconfig.app.json', (content) => {
        const tsConfig = JSON.parse(content);
        tsConfig.compilerOptions.target = 'ES2022';
        return JSON.stringify(tsConfig);
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
        optimization: true,
        polyfills: ['zone.js'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);

      // We expect the output to contain a catch block that captures the error in a variable,
      // even if that variable is mangled.
      // The pattern for the downleveled for-await catch block is roughly:
      // } catch (temp) { error = [temp]; }
      //
      // With the bug, esbuild (when minifying) would optimize away the catch binding if it thought it was unused,
      // resulting in: } catch { ... } which breaks the logic requiring the error object.
      //
      // The regex matches:
      // catch \s*         -> catch keyword and whitespace
      // \( [a-zA-Z_$][\w$]* \) -> (variable)
      // \s* { \s*         -> { and whitespace
      // [a-zA-Z_$][\w$]*  -> error array variable
      // \s* = \s*         -> assignment
      // \[ [a-zA-Z_$][\w$]* \] -> [variable]
      harness
        .expectFile('dist/browser/main.js')
        .content.toMatch(
          /catch\s*\([a-zA-Z_$][\w$]*\)\s*\{\s*[a-zA-Z_$][\w$]*\s*=\s*\[[a-zA-Z_$][\w$]*\]/,
        );
    });
  });
});
