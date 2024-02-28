/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { buildApplication } from '../../index';
import { APPLICATION_BUILDER_INFO, BASE_OPTIONS, describeBuilder } from '../setup';

describeBuilder(buildApplication, APPLICATION_BUILDER_INFO, (harness) => {
  describe('Option: "define"', () => {
    it('should replace a value in application code when specified as a number', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        define: {
          'AN_INTEGER': '42',
        },
      });

      await harness.writeFile('./src/types.d.ts', 'declare const AN_INTEGER: number;');
      await harness.writeFile('src/main.ts', 'console.log(AN_INTEGER);');

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/browser/main.js').content.not.toContain('AN_INTEGER');
      harness.expectFile('dist/browser/main.js').content.toContain('(42)');
    });

    it('should replace a value in application code when specified as a string', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        define: {
          'A_STRING': '"42"',
        },
      });

      await harness.writeFile('./src/types.d.ts', 'declare const A_STRING: string;');
      await harness.writeFile('src/main.ts', 'console.log(A_STRING);');

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/browser/main.js').content.not.toContain('A_STRING');
      harness.expectFile('dist/browser/main.js').content.toContain('("42")');
    });

    it('should replace a value in application code when specified as a boolean', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        define: {
          'A_BOOLEAN': 'true',
        },
      });

      await harness.writeFile('./src/types.d.ts', 'declare const A_BOOLEAN: boolean;');
      await harness.writeFile('src/main.ts', 'console.log(A_BOOLEAN);');

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/browser/main.js').content.not.toContain('A_BOOLEAN');
      harness.expectFile('dist/browser/main.js').content.toContain('(true)');
    });
  });
});
