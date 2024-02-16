/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { PartialMessage } from 'esbuild';
import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import { type MessagePort, receiveMessageOnPort } from 'node:worker_threads';
import { SourceFileCache } from '../source-file-cache';
import type { AngularCompilation, DiagnosticModes } from './angular-compilation';
import { AotCompilation } from './aot-compilation';
import { JitCompilation } from './jit-compilation';

export interface InitRequest {
  jit: boolean;
  tsconfig: string;
  fileReplacements?: Record<string, string>;
  stylesheetPort: MessagePort;
  optionsPort: MessagePort;
  optionsSignal: Int32Array;
  webWorkerPort: MessagePort;
  webWorkerSignal: Int32Array;
}

let compilation: AngularCompilation | undefined;

const sourceFileCache = new SourceFileCache();

export async function initialize(request: InitRequest) {
  compilation ??= request.jit ? new JitCompilation() : new AotCompilation();

  const stylesheetRequests = new Map<string, [(value: string) => void, (reason: Error) => void]>();
  request.stylesheetPort.on('message', ({ requestId, value, error }) => {
    if (error) {
      stylesheetRequests.get(requestId)?.[1](error);
    } else {
      stylesheetRequests.get(requestId)?.[0](value);
    }
  });

  const { compilerOptions, referencedFiles } = await compilation.initialize(
    request.tsconfig,
    {
      fileReplacements: request.fileReplacements,
      sourceFileCache,
      modifiedFiles: sourceFileCache.modifiedFiles,
      transformStylesheet(data, containingFile, stylesheetFile) {
        const requestId = randomUUID();
        const resultPromise = new Promise<string>((resolve, reject) =>
          stylesheetRequests.set(requestId, [resolve, reject]),
        );

        request.stylesheetPort.postMessage({
          requestId,
          data,
          containingFile,
          stylesheetFile,
        });

        return resultPromise;
      },
      processWebWorker(workerFile, containingFile) {
        Atomics.store(request.webWorkerSignal, 0, 0);
        request.webWorkerPort.postMessage({ workerFile, containingFile });

        Atomics.wait(request.webWorkerSignal, 0, 0);
        const result = receiveMessageOnPort(request.webWorkerPort)?.message;

        if (result?.error) {
          throw result.error;
        }

        return result?.workerCodeFile ?? workerFile;
      },
    },
    (compilerOptions) => {
      Atomics.store(request.optionsSignal, 0, 0);
      request.optionsPort.postMessage(compilerOptions);

      Atomics.wait(request.optionsSignal, 0, 0);
      const result = receiveMessageOnPort(request.optionsPort)?.message;

      if (result?.error) {
        throw result.error;
      }

      return result?.transformedOptions ?? compilerOptions;
    },
  );

  return {
    referencedFiles,
    // TODO: Expand? `allowJs` is the only field needed currently.
    compilerOptions: { allowJs: compilerOptions.allowJs },
  };
}

export async function diagnose(modes: DiagnosticModes): Promise<{
  errors?: PartialMessage[];
  warnings?: PartialMessage[];
}> {
  assert(compilation);

  const diagnostics = await compilation.diagnoseFiles(modes);

  return diagnostics;
}

export async function emit() {
  assert(compilation);

  const files = await compilation.emitAffectedFiles();

  return [...files];
}

export function update(files: Set<string>): void {
  sourceFileCache.invalidate(files);
}
