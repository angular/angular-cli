/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { executeDevServer } from '../../index';
import { executeOnceAndFetch } from '../execute-fetch';
import { describeServeBuilder } from '../jasmine-helpers';
import { BASE_OPTIONS, DEV_SERVER_BUILDER_INFO } from '../setup';

describeServeBuilder(executeDevServer, DEV_SERVER_BUILDER_INFO, (harness, setupTarget) => {
  describe('option: "define"', () => {
    beforeEach(() => {
      setupTarget(harness);

      // Application code
      harness.writeFile(
        'src/main.ts',
        `
        // @ts-ignore
        console.log(TEST);
        // @ts-ignore
        console.log(BUILD);
        // @ts-ignore
        console.log(SERVE);
      `,
      );
    });

    it('should replace global identifiers in the application', async () => {
      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        define: {
          TEST: JSON.stringify('test123'),
        },
      });

      const { result, response } = await executeOnceAndFetch(harness, '/main.js');

      expect(result?.success).toBeTrue();
      const content = await response?.text();
      expect(content).toContain('console.log("test123")');
    });

    it('should merge "define" option from dev-server and build', async () => {
      harness.modifyTarget('build', (options) => {
        options.define = {
          BUILD: JSON.stringify('build'),
        };
      });

      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        define: {
          SERVE: JSON.stringify('serve'),
        },
      });

      const { result, response } = await executeOnceAndFetch(harness, '/main.js');

      expect(result?.success).toBeTrue();
      const content = await response?.text();
      expect(content).toContain('console.log("build")');
      expect(content).toContain('console.log("serve")');
    });

    it('should overwrite "define" option from build with the one from dev-server', async () => {
      harness.modifyTarget('build', (options) => {
        options.define = {
          TEST: JSON.stringify('build'),
        };
      });

      harness.useTarget('serve', {
        ...BASE_OPTIONS,
        define: {
          TEST: JSON.stringify('serve'),
        },
      });

      const { result, response } = await executeOnceAndFetch(harness, '/main.js');

      expect(result?.success).toBeTrue();
      const content = await response?.text();
      expect(content).toContain('console.log("serve")');
      expect(content).not.toContain('console.log("build")');
    });
  });
});
