/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { CompilerOptions } from '@angular/compiler-cli';
import type { PartialMessage } from 'esbuild';
import { createRequire } from 'node:module';
import { MessageChannel } from 'node:worker_threads';
import Piscina from 'piscina';
import type { SourceFile } from 'typescript';
import type { AngularHostOptions } from '../angular-host';
import { AngularCompilation, DiagnosticModes, EmitFileResult } from './angular-compilation';

/**
 * An Angular compilation which uses a Node.js Worker thread to load and execute
 * the TypeScript and Angular compilers. This allows for longer synchronous actions
 * such as semantic and template diagnostics to be calculated in parallel to the
 * other aspects of the application bundling process. The worker thread also has
 * a separate memory pool which significantly reduces the need for adjusting the
 * main Node.js CLI process memory settings with large application code sizes.
 */
export class ParallelCompilation extends AngularCompilation {
  readonly #worker: Piscina;

  constructor(readonly jit: boolean) {
    super();

    // TODO: Convert to import.meta usage during ESM transition
    const localRequire = createRequire(__filename);

    this.#worker = new Piscina({
      minThreads: 1,
      maxThreads: 1,
      idleTimeout: Infinity,
      // Web containers do not support transferable objects with receiveOnMessagePort which
      // is used when the Atomics based wait loop is enable.
      useAtomics: !process.versions.webcontainer,
      filename: localRequire.resolve('./parallel-worker'),
    });
  }

  override initialize(
    tsconfig: string,
    hostOptions: AngularHostOptions,
    compilerOptionsTransformer?:
      | ((compilerOptions: CompilerOptions) => CompilerOptions)
      | undefined,
  ): Promise<{
    affectedFiles: ReadonlySet<SourceFile>;
    compilerOptions: CompilerOptions;
    referencedFiles: readonly string[];
  }> {
    const stylesheetChannel = new MessageChannel();
    // The request identifier is required because Angular can issue multiple concurrent requests
    stylesheetChannel.port1.on('message', ({ requestId, data, containingFile, stylesheetFile }) => {
      hostOptions
        .transformStylesheet(data, containingFile, stylesheetFile)
        .then((value) => stylesheetChannel.port1.postMessage({ requestId, value }))
        .catch((error) => stylesheetChannel.port1.postMessage({ requestId, error }));
    });

    // The web worker processing is a synchronous operation and uses shared memory combined with
    // the Atomics API to block execution here until a response is received.
    const webWorkerChannel = new MessageChannel();
    const webWorkerSignal = new Int32Array(new SharedArrayBuffer(4));
    webWorkerChannel.port1.on('message', ({ workerFile, containingFile }) => {
      try {
        const workerCodeFile = hostOptions.processWebWorker(workerFile, containingFile);
        webWorkerChannel.port1.postMessage({ workerCodeFile });
      } catch (error) {
        webWorkerChannel.port1.postMessage({ error });
      } finally {
        Atomics.store(webWorkerSignal, 0, 1);
        Atomics.notify(webWorkerSignal, 0);
      }
    });

    // The compiler options transformation is a synchronous operation and uses shared memory combined
    // with the Atomics API to block execution here until a response is received.
    const optionsChannel = new MessageChannel();
    const optionsSignal = new Int32Array(new SharedArrayBuffer(4));
    optionsChannel.port1.on('message', (compilerOptions) => {
      try {
        const transformedOptions = compilerOptionsTransformer?.(compilerOptions) ?? compilerOptions;
        optionsChannel.port1.postMessage({ transformedOptions });
      } catch (error) {
        webWorkerChannel.port1.postMessage({ error });
      } finally {
        Atomics.store(optionsSignal, 0, 1);
        Atomics.notify(optionsSignal, 0);
      }
    });

    // Execute the initialize function in the worker thread
    return this.#worker.run(
      {
        fileReplacements: hostOptions.fileReplacements,
        tsconfig,
        jit: this.jit,
        stylesheetPort: stylesheetChannel.port2,
        optionsPort: optionsChannel.port2,
        optionsSignal,
        webWorkerPort: webWorkerChannel.port2,
        webWorkerSignal,
      },
      {
        name: 'initialize',
        transferList: [stylesheetChannel.port2, optionsChannel.port2, webWorkerChannel.port2],
      },
    );
  }

  /**
   * This is not needed with this compilation type since the worker will already send a response
   * with the serializable esbuild compatible diagnostics.
   */
  protected override collectDiagnostics(): never {
    throw new Error('Not implemented in ParallelCompilation.');
  }

  override diagnoseFiles(
    modes = DiagnosticModes.All,
  ): Promise<{ errors?: PartialMessage[]; warnings?: PartialMessage[] }> {
    return this.#worker.run(modes, { name: 'diagnose' });
  }

  override emitAffectedFiles(): Promise<Iterable<EmitFileResult>> {
    return this.#worker.run(undefined, { name: 'emit' });
  }

  override update(files: Set<string>): Promise<void> {
    return this.#worker.run(files, { name: 'update' });
  }

  override close() {
    return this.#worker.destroy();
  }
}
