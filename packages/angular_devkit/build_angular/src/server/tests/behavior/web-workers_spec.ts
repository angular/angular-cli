/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { execute } from '../../index';
import { BASE_OPTIONS, SERVER_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(execute, SERVER_BUILDER_INFO, (harness) => {
  describe('Behavior: "Errors"', () => {
    it('should not try to resolve web-workers', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
      });

      await harness.writeFiles({
        'src/app/app.worker.ts': `
          /// <reference lib="webworker" />
  
          const foo: string = 'hello world';
          addEventListener('message', ({ data }) => {
            postMessage(foo);
          });
        `,
        'src/main.server.ts': `
          if (typeof Worker !== 'undefined') {
            const worker = new Worker(new URL('./app/app.worker', import.meta.url), { type: 'module' });
            worker.onmessage = ({ data }) => {
              console.log('page got message:', data);
            };
            worker.postMessage('hello');
          }
        `,
      });

      const { result } = await harness.executeOnce();

      expect(result?.success).toBeTrue();
    });
  });
});
