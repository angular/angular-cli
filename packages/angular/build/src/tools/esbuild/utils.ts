/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { BuilderContext } from '@angular-devkit/architect';
import { BuildOptions, Metafile, OutputFile, formatMessages } from 'esbuild';
import { Listr } from 'listr2';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { brotliCompress } from 'node:zlib';
import { NormalizedApplicationBuildOptions } from '../../builders/application/options';
import { OutputMode } from '../../builders/application/schema';
import { BudgetCalculatorResult } from '../../utils/bundle-calculator';

import { BundleStats, generateEsbuildBuildStatsTable } from '../../utils/stats-table';
import {
  BuildOutputAsset,
  ExecutionResult,
  PrerenderedRoutesRecord,
} from './bundler-execution-result';
import { type BuildOutputFile, BuildOutputFileType, type InitialFileRecord } from './bundler-files';

export function logBuildStats(
  metafiles: Metafile[],
  outputFiles: BuildOutputFile[],
  initial: Map<string, InitialFileRecord>,
  budgetFailures: BudgetCalculatorResult[] | undefined,
  colors: boolean,
  changedFiles?: Set<string>,
  estimatedTransferSizes?: Map<string, number>,
  ssrOutputEnabled?: boolean,
  verbose?: boolean,
): string {
  // Remove the i18n subpath in case the build is using i18n.
  // en-US/main.js -> main.js
  const normalizedChangedFiles: Set<string> = new Set(
    [...(changedFiles ?? [])].map((f) => basename(f)),
  );
  const browserStats: BundleStats[] = [];
  const serverStats: BundleStats[] = [];
  let unchangedCount = 0;
  let componentStyleChange = false;

  for (const { path: file, size, type } of outputFiles) {
    // Only display JavaScript and CSS files
    if (!/\.(?:css|m?js)$/.test(file)) {
      continue;
    }

    // Show only changed files if a changed list is provided
    if (normalizedChangedFiles.size && !normalizedChangedFiles.has(file)) {
      ++unchangedCount;
      continue;
    }

    const isPlatformServer =
      type === BuildOutputFileType.ServerApplication || type === BuildOutputFileType.ServerRoot;
    if (isPlatformServer && !ssrOutputEnabled) {
      // Only log server build stats when SSR is enabled.
      continue;
    }

    // Skip logging external component stylesheets used for HMR
    if (metafiles.some((mf) => mf.outputs[file] && 'ng-component' in mf.outputs[file])) {
      componentStyleChange = true;
      continue;
    }

    const name = initial.get(file)?.name ?? getChunkNameFromMetafile(metafiles, file);
    const stat: BundleStats = {
      initial: initial.has(file),
      stats: [file, name ?? '-', size, estimatedTransferSizes?.get(file) ?? '-'],
    };

    if (isPlatformServer) {
      serverStats.push(stat);
    } else {
      browserStats.push(stat);
    }
  }

  if (browserStats.length > 0 || serverStats.length > 0) {
    const tableText = generateEsbuildBuildStatsTable(
      [browserStats, serverStats],
      colors,
      unchangedCount === 0,
      !!estimatedTransferSizes,
      budgetFailures,
      verbose,
    );

    return tableText + '\n';
  } else if (changedFiles !== undefined) {
    if (componentStyleChange) {
      return '\nComponent stylesheet(s) changed.\n';
    } else {
      return '\nNo output file changes.\n';
    }
  }
  if (unchangedCount > 0) {
    return `Unchanged output files: ${unchangedCount}`;
  }

  return '';
}

export function getChunkNameFromMetafile(
  metafiles: Metafile[] | Metafile,
  file: string,
): string | undefined {
  const metafileArray = Array.isArray(metafiles) ? metafiles : [metafiles];
  for (const metafile of metafileArray) {
    if (metafile.outputs[file]?.entryPoint) {
      return getEntryPointName(metafile.outputs[file].entryPoint);
    }
  }
}

export async function calculateEstimatedTransferSizes(
  outputFiles: OutputFile[],
): Promise<Map<string, number>> {
  const sizes = new Map<string, number>();
  if (outputFiles.length <= 0) {
    return sizes;
  }

  return new Promise((resolve, reject) => {
    let completeCount = 0;
    for (const outputFile of outputFiles) {
      // Only calculate JavaScript and CSS files
      if (!outputFile.path.endsWith('.js') && !outputFile.path.endsWith('.css')) {
        ++completeCount;
        continue;
      }

      // Skip compressing small files which may end being larger once compressed and will most likely not be
      // compressed in actual transit.
      if (outputFile.contents.byteLength < 1024) {
        sizes.set(outputFile.path, outputFile.contents.byteLength);
        ++completeCount;
        continue;
      }

      // Directly use the async callback function to minimize the number of Promises that need to be created.
      brotliCompress(outputFile.contents, (error, result) => {
        if (error) {
          reject(error);

          return;
        }

        sizes.set(outputFile.path, result.byteLength);
        if (++completeCount >= outputFiles.length) {
          resolve(sizes);
        }
      });
    }

    // Covers the case where no files need to be compressed
    if (completeCount >= outputFiles.length) {
      resolve(sizes);
    }
  });
}

export async function withSpinner<T>(text: string, action: () => T | Promise<T>): Promise<T> {
  let result;
  const taskList = new Listr(
    [
      {
        title: text,
        async task() {
          result = await action();
        },
      },
    ],
    { rendererOptions: { clearOutput: true } },
  );

  await taskList.run();

  return result as T;
}

export async function withNoProgress<T>(text: string, action: () => T | Promise<T>): Promise<T> {
  return action();
}

/**
 * Generates a syntax feature object map for Angular applications.
 * A full set of feature names can be found here: https://esbuild.github.io/api/#supported
 * @param nativeAsyncAwait Indicate whether to support native async/await.
 * @returns An object that can be used with the esbuild build `supported` option.
 */
export function getFeatureSupport(nativeAsyncAwait: boolean): BuildOptions['supported'] {
  return {
    // Native async/await is not supported with Zone.js. Disabling support here will cause
    // esbuild to downlevel async/await, async generators, and for await...of to a Zone.js supported form.
    'async-await': nativeAsyncAwait,
    // Workaround for an esbuild minification bug when async-await is disabled and the target is es2019+.
    // The catch binding for downleveled for-await will be incorrectly removed in this specific situation.
    ...(!nativeAsyncAwait ? { 'optional-catch-binding': false } : {}),
    // V8 currently has a performance defect involving object spread operations that can cause signficant
    // degradation in runtime performance. By not supporting the language feature here, a downlevel form
    // will be used instead which provides a workaround for the performance issue.
    // For more details: https://bugs.chromium.org/p/v8/issues/detail?id=11536
    'object-rest-spread': false,
  };
}

const MAX_CONCURRENT_WRITES = 64;
export async function emitFilesToDisk<T = BuildOutputAsset | BuildOutputFile>(
  files: T[],
  writeFileCallback: (file: T) => Promise<void>,
): Promise<void> {
  // Write files in groups of MAX_CONCURRENT_WRITES to avoid too many open files
  for (let fileIndex = 0; fileIndex < files.length;) {
    const groupMax = Math.min(fileIndex + MAX_CONCURRENT_WRITES, files.length);

    const actions = [];
    while (fileIndex < groupMax) {
      actions.push(writeFileCallback(files[fileIndex++]));
    }

    await Promise.all(actions);
  }
}

interface BuildManifest {
  errors: string[];
  warnings: string[];
  outputPaths: {
    root: URL;
    server?: URL | undefined;
    browser: URL;
  };
  prerenderedRoutes: PrerenderedRoutesRecord;
}

export async function createJsonBuildManifest(
  result: ExecutionResult,
  normalizedOptions: NormalizedApplicationBuildOptions,
): Promise<string> {
  const {
    colors: color,
    outputOptions: { base, server, browser },
    ssrOptions,
    outputMode,
  } = normalizedOptions;

  const { warnings, errors, prerenderedRoutes } = result;

  const manifest: BuildManifest = {
    errors: errors.length ? await formatMessages(errors, { kind: 'error', color }) : [],
    warnings: warnings.length ? await formatMessages(warnings, { kind: 'warning', color }) : [],
    outputPaths: {
      root: pathToFileURL(base),
      browser: pathToFileURL(join(base, browser)),
      server:
        outputMode !== OutputMode.Static && ssrOptions
          ? pathToFileURL(join(base, server))
          : undefined,
    },
    prerenderedRoutes,
  };

  return JSON.stringify(manifest, undefined, 2);
}

export async function logMessages(
  logger: BuilderContext['logger'],
  executionResult: ExecutionResult,
  color?: boolean,
  jsonLogs?: boolean,
): Promise<void> {
  const { warnings, errors, logs } = executionResult;

  if (logs.length) {
    logger.info(logs.join('\n'));
  }

  if (jsonLogs) {
    return;
  }

  if (warnings.length) {
    logger.warn((await formatMessages(warnings, { kind: 'warning', color })).join('\n'));
  }

  if (errors.length) {
    logger.error((await formatMessages(errors, { kind: 'error', color })).join('\n'));
  }
}

/**
 * Ascertain whether the application operates without `zone.js`, we currently rely on the polyfills setting to determine its status.
 * If a file with an extension is provided or if `zone.js` is included in the polyfills, the application is deemed as not zoneless.
 * @param polyfills An array of polyfills
 * @returns true, when the application is considered as zoneless.
 */
export function isZonelessApp(polyfills: string[] | undefined): boolean {
  // TODO: Instead, we should rely on the presence of zone.js in the polyfills build metadata.
  return !polyfills?.some((p) => p === 'zone.js' || /\.[mc]?[jt]s$/.test(p));
}

export function getEntryPointName(entryPoint: string): string {
  return basename(entryPoint)
    .replace(/(.*:)/, '') // global:bundle.css  -> bundle.css
    .replace(/\.[cm]?[jt]s$/, '')
    .replace(/[\\/.]/g, '-');
}
