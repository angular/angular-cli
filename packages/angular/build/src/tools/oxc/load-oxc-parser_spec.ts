/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Worker } from 'node:worker_threads';
import { loadOxcParser } from './load-oxc-parser';

describe('loadOxcParser', () => {
  it('should cache and return the same oxc-parser module instance across calls', () => {
    const first = loadOxcParser();
    const second = loadOxcParser();

    expect(first === second).toBeTrue();
    expect(typeof first.parseSync).toBe('function');
    expect(first.visitorKeys['Program']).toBeDefined();
  });

  it('should load the WASI binding under NAPI_RS_FORCE_WASI=error and restore Module._resolveFilename', async () => {
    const loadOxcParserPath = require.resolve('./load-oxc-parser');
    const sourceMapPath = require.resolve('../../utils/source-map');

    const result = await new Promise<{
      resolveFilenameRestored: boolean;
      wasiBindingLoaded: boolean;
      statementCount: number;
      commentCount: number;
      strippedCode: string;
      getterValue: unknown;
      ownAssignedValue: unknown;
      hasOwnAfterAssign: boolean;
      protoGetterPreserved: boolean;
      emptyObjectValue: unknown;
    }>((resolve, reject) => {
      const workerScript = `
        const { Module } = require('node:module');
        const { parentPort, workerData } = require('node:worker_threads');
        const { loadOxcParser } = require(workerData.loadOxcParserPath);
        const { removeSourceMappingURL } = require(workerData.sourceMapPath);

        const origResolveFilename = Module._resolveFilename;
        const oxc = loadOxcParser();
        const resolveFilenameRestored = Module._resolveFilename === origResolveFilename;
        const wasiBindingLoaded = Object.keys(require.cache).some((key) =>
          key.includes('binding-wasm32-wasi'),
        );

        const parsed = oxc.parseSync('test.js', 'const answer = 42;\\n//# sourceMappingURL=test.map');
        const strippedCode = removeSourceMappingURL(
          '//# sourceMappingURL=first.js.map\\nconst x = 1;\\n//# sourceMappingURL=second.js.map',
        );

        const receiver = { napiModule: 'from-napi-module' };
        const getterValue = receiver.addonModule;
        receiver.addonModule = 'own-value';
        const hasOwnAfterAssign = Object.hasOwn(receiver, 'addonModule');
        const ownAssignedValue = receiver.addonModule;

        Object.prototype.addonModule = 'polluted';
        const protoGetterPreserved =
          typeof Object.getOwnPropertyDescriptor(Object.prototype, 'addonModule')?.get === 'function';
        const emptyObjectValue = {}.addonModule;
        (42).addonModule = 'primitive';

        parentPort.postMessage({
          resolveFilenameRestored,
          wasiBindingLoaded,
          statementCount: parsed.program.body.length,
          commentCount: parsed.comments.length,
          strippedCode,
          getterValue,
          ownAssignedValue,
          hasOwnAfterAssign,
          protoGetterPreserved,
          emptyObjectValue,
        });
      `;

      const worker = new Worker(workerScript, {
        eval: true,
        env: {
          ...process.env,
          NAPI_RS_FORCE_WASI: 'error',
        },
        workerData: {
          loadOxcParserPath,
          sourceMapPath,
        },
      });

      worker.once('message', resolve);
      worker.once('error', reject);
      worker.once('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker exited with non-zero exit code ${code}`));
        }
      });
    });

    expect(result.resolveFilenameRestored).toBeTrue();
    expect(result.wasiBindingLoaded).toBeTrue();
    expect(result.statementCount).toBe(1);
    expect(result.commentCount).toBe(1);
    expect(result.strippedCode).toBe('\nconst x = 1;\n');
    expect(result.getterValue).toBe('from-napi-module');
    expect(result.hasOwnAfterAssign).toBeTrue();
    expect(result.ownAssignedValue).toBe('own-value');
    expect(result.protoGetterPreserved).toBeTrue();
    expect(result.emptyObjectValue).toBeUndefined();
  });
});
