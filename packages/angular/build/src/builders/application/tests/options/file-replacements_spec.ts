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
  describe('Option: "fileReplacements"', () => {
    it('should replace JSON files', async () => {
      harness.useTarget('build', {
        ...BASE_OPTIONS,
        fileReplacements: [{ replace: './src/one.json', with: './src/two.json' }],
      });

      await harness.modifyFile('tsconfig.json', (content) => {
        const tsconfig = JSON.parse(content);
        tsconfig.compilerOptions.resolveJsonModule = true;

        return JSON.stringify(tsconfig);
      });

      await harness.writeFile('./src/one.json', '{ "x": 12345 }');
      await harness.writeFile('./src/two.json', '{ "x": 67890 }');
      await harness.writeFile('src/main.ts', 'import { x } from "./one.json";\n console.log(x);');

      const { result } = await harness.executeOnce();
      expect(result?.success).toBe(true);
      harness.expectFile('dist/browser/main.js').content.not.toContain('12345');
      harness.expectFile('dist/browser/main.js').content.toContain('67890');
    });
  });
});
