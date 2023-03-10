/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { buildEsbuildBrowser } from '../../index';
import { BASE_OPTIONS, BROWSER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(buildEsbuildBrowser, BROWSER_BUILDER_INFO, (harness) => {
  describe('Behavior: "TypeScript JSON module resolution"', () => {
    it('should resolve JSON files when imported with resolveJsonModule enabled', async () => {
      await harness.writeFiles({
        'src/x.json': `{"a": 1}`,
        'src/main.ts': `import * as x from './x.json'; console.log(x);`,
      });

      // Enable tsconfig resolveJsonModule option in tsconfig
      await harness.modifyFile('tsconfig.json', (content) => {
        const tsconfig = JSON.parse(content);
        tsconfig.compilerOptions.resolveJsonModule = true;

        return JSON.stringify(tsconfig);
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBe(true);
    });

    it('should fail to resolve with TS if resolveJsonModule is not present', async () => {
      await harness.writeFiles({
        'src/x.json': `{"a": 1}`,
        'src/main.ts': `import * as x from './x.json'; console.log(x);`,
      });

      // Enable tsconfig resolveJsonModule option in tsconfig
      await harness.modifyFile('tsconfig.json', (content) => {
        const tsconfig = JSON.parse(content);
        tsconfig.compilerOptions.resolveJsonModule = undefined;

        return JSON.stringify(tsconfig);
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });

      expect(result?.success).toBe(false);
      expect(logs).toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching(`Cannot find module './x.json'`),
        }),
      );
    });

    it('should fail to resolve with TS if resolveJsonModule is disabled', async () => {
      await harness.writeFiles({
        'src/x.json': `{"a": 1}`,
        'src/main.ts': `import * as x from './x.json'; console.log(x);`,
      });

      // Enable tsconfig resolveJsonModule option in tsconfig
      await harness.modifyFile('tsconfig.json', (content) => {
        const tsconfig = JSON.parse(content);
        tsconfig.compilerOptions.resolveJsonModule = false;

        return JSON.stringify(tsconfig);
      });

      harness.useTarget('build', {
        ...BASE_OPTIONS,
      });

      const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });

      expect(result?.success).toBe(false);
      expect(logs).toContain(
        jasmine.objectContaining({
          message: jasmine.stringMatching(`Cannot find module './x.json'`),
        }),
      );
    });
  });
});
