/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { MessageChannel } from 'node:worker_threads';
import { AotCompilation } from './aot-compilation';
import { initialize } from './parallel-worker';

describe('parallel-worker', () => {
  it('uses incrementing numeric request IDs for transformStylesheet and handles omitted webWorkerPort in library builds', async () => {
    const receivedRequestIds: unknown[] = [];
    let workerResult: string | undefined;

    spyOn(AotCompilation.prototype, 'initialize').and.callFake(async (_tsconfig, hostOptions) => {
      const [style1, style2] = await Promise.all([
        hostOptions.transformStylesheet('body {}', '/src/a.ts', '/src/a.css', 0, 'CompA'),
        hostOptions.transformStylesheet('div {}', '/src/b.ts', '/src/b.css', 1, 'CompB'),
      ]);
      expect(style1).toBe('transformed:body {}');
      expect(style2).toBe('transformed:div {}');

      workerResult = hostOptions.processWebWorker('./my.worker', '/src/a.ts');

      return {
        compilerOptions: {},
        referencedFiles: ['/src/a.ts'],
      };
    });

    const stylesheetChannel = new MessageChannel();
    stylesheetChannel.port1.on('message', ({ requestId, data }) => {
      receivedRequestIds.push(requestId);
      stylesheetChannel.port1.postMessage({
        requestId,
        value: `transformed:${data}`,
      });
    });

    try {
      const result = await initialize({
        jit: false,
        browserOnlyBuild: false,
        tsconfig: '/src/tsconfig.lib.json',
        buildType: 'library',
        stylesheetPort: stylesheetChannel.port2,
      });

      expect(receivedRequestIds).toEqual([1, 2]);
      expect(workerResult).toBe('./my.worker');
      expect(result.referencedFiles).toEqual(['/src/a.ts']);
    } finally {
      stylesheetChannel.port1.close();
    }
  });
});
