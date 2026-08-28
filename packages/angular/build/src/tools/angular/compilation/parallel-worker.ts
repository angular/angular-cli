/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { PartialMessage } from 'esbuild';
import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import { type MessagePort, receiveMessageOnPort } from 'node:worker_threads';
import { initializeHash } from '../../../utils/hash';
import { getAndClearCumulativeDurations } from '../../esbuild/profiling';
import type {
  AngularCompilation,
  AngularCompilationResult,
  DiagnosticModes,
} from './angular-compilation';
import { AotCompilation } from './aot-compilation';
import type { CompilerOptionOverrides } from './compiler-options';
import { JitCompilation } from './jit-compilation';

export interface InitRequest {
  jit: boolean;
  browserOnlyBuild: boolean;
  tsconfig: string;
  fileReplacements?: Record<string, string>;
  compilerOptionOverrides?: CompilerOptionOverrides;
  stylesheetPort: MessagePort;
  webWorkerPort: MessagePort;
  webWorkerSignal: Int32Array;
}

let compilation: AngularCompilation | undefined;
let activeWebWorkerPort: MessagePort | undefined;

const modifiedFiles = new Set<string>();

export async function initialize(request: InitRequest): Promise<AngularCompilationResult> {
  activeWebWorkerPort?.close();
  activeWebWorkerPort = request.webWorkerPort;

  const currentModifiedFiles = new Set(modifiedFiles);
  modifiedFiles.clear();

  let success = false;
  try {
    await initializeHash();
    compilation ??= request.jit
      ? new JitCompilation(request.browserOnlyBuild)
      : new AotCompilation(request.browserOnlyBuild);

    const stylesheetRequests = new Map<
      string,
      [(value: string) => void, (reason: Error) => void]
    >();
    request.stylesheetPort.on('message', ({ requestId, value, error }) => {
      const handlers = stylesheetRequests.get(requestId);
      if (handlers) {
        stylesheetRequests.delete(requestId);
        if (error) {
          handlers[1](error);
        } else {
          handlers[0](value);
        }
      }
    });

    const {
      compilerOptions,
      referencedFiles,
      externalStylesheets,
      templateUpdates,
      componentResourcesDependencies,
      warnings,
    } = await compilation.initialize(
      request.tsconfig,
      {
        fileReplacements: request.fileReplacements,
        modifiedFiles: currentModifiedFiles,
        transformStylesheet(data, containingFile, stylesheetFile, order, className) {
          const requestId = randomUUID();
          const resultPromise = new Promise<string>((resolve, reject) =>
            stylesheetRequests.set(requestId, [resolve, reject]),
          );

          request.stylesheetPort.postMessage({
            requestId,
            data,
            containingFile,
            stylesheetFile,
            order,
            className,
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
      request.compilerOptionOverrides,
    );

    success = true;

    return {
      externalStylesheets,
      templateUpdates,
      referencedFiles,
      warnings,
      // TODO: Expand? `allowJs`, `isolatedModules`, `sourceMap`, `inlineSourceMap` are the only fields needed currently.
      compilerOptions: {
        allowJs: compilerOptions.allowJs,
        isolatedModules: compilerOptions.isolatedModules,
        sourceMap: compilerOptions.sourceMap,
        inlineSourceMap: compilerOptions.inlineSourceMap,
        _useTypeScriptTranspilation: compilerOptions['_useTypeScriptTranspilation'] as
          boolean | undefined,
      },
      componentResourcesDependencies,
    };
  } finally {
    request.stylesheetPort.close();
    if (!success) {
      activeWebWorkerPort?.close();
      activeWebWorkerPort = undefined;
    }
  }
}

export async function diagnose(modes: DiagnosticModes): Promise<{
  errors?: PartialMessage[];
  warnings?: PartialMessage[];
  timings?: Record<string, number[]>;
}> {
  assert(compilation);

  const diagnostics = await compilation.diagnoseFiles(modes);
  const timings = getAndClearCumulativeDurations();

  return {
    ...diagnostics,
    timings,
  };
}

export async function emit() {
  assert(compilation);

  try {
    const files = await compilation.emitAffectedFiles();

    return [...files];
  } finally {
    activeWebWorkerPort?.close();
    activeWebWorkerPort = undefined;
  }
}

export async function update(files: Set<string>): Promise<void> {
  for (const file of files) {
    modifiedFiles.add(file);
  }
  await compilation?.update?.(files);
}
