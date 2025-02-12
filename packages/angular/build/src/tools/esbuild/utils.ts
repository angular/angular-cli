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
import { createHash } from 'node:crypto';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { brotliCompress } from 'node:zlib';
import { coerce } from 'semver';
import { NormalizedApplicationBuildOptions } from '../../builders/application/options';
import { OutputMode } from '../../builders/application/schema';
import { BudgetCalculatorResult } from '../../utils/bundle-calculator';
import {
  SERVER_APP_ENGINE_MANIFEST_FILENAME,
  SERVER_APP_MANIFEST_FILENAME,
} from '../../utils/server-rendering/manifest';
import { BundleStats, generateEsbuildBuildStatsTable } from '../../utils/stats-table';
import { BuildOutputFile, BuildOutputFileType, InitialFileRecord } from './bundler-context';
import {
  BuildOutputAsset,
  ExecutionResult,
  PrerenderedRoutesRecord,
} from './bundler-execution-result';

export function logBuildStats(
  metafile: Metafile,
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
    if (metafile.outputs[file] && 'ng-component' in metafile.outputs[file]) {
      componentStyleChange = true;
      continue;
    }

    const name = initial.get(file)?.name ?? getChunkNameFromMetafile(metafile, file);
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

export function getChunkNameFromMetafile(metafile: Metafile, file: string): string | undefined {
  if (metafile.outputs[file]?.entryPoint) {
    return getEntryPointName(metafile.outputs[file].entryPoint);
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
 * Generates a syntax feature object map for Angular applications based on a list of targets.
 * A full set of feature names can be found here: https://esbuild.github.io/api/#supported
 * @param target An array of browser/engine targets in the format accepted by the esbuild `target` option.
 * @param nativeAsyncAwait Indicate whether to support native async/await.
 * @returns An object that can be used with the esbuild build `supported` option.
 */
export function getFeatureSupport(
  target: string[],
  nativeAsyncAwait: boolean,
): BuildOptions['supported'] {
  return {
    // Native async/await is not supported with Zone.js. Disabling support here will cause
    // esbuild to downlevel async/await, async generators, and for await...of to a Zone.js supported form.
    'async-await': nativeAsyncAwait,
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
  for (let fileIndex = 0; fileIndex < files.length; ) {
    const groupMax = Math.min(fileIndex + MAX_CONCURRENT_WRITES, files.length);

    const actions = [];
    while (fileIndex < groupMax) {
      actions.push(writeFileCallback(files[fileIndex++]));
    }

    await Promise.all(actions);
  }
}

export function createOutputFile(
  path: string,
  data: string | Uint8Array,
  type: BuildOutputFileType,
): BuildOutputFile {
  if (typeof data === 'string') {
    let cachedContents: Uint8Array | null = null;
    let cachedText: string | null = data;
    let cachedHash: string | null = null;

    return {
      path,
      type,
      get contents(): Uint8Array {
        cachedContents ??= new TextEncoder().encode(data);

        return cachedContents;
      },
      set contents(value: Uint8Array) {
        cachedContents = value;
        cachedText = null;
      },
      get text(): string {
        cachedText ??= new TextDecoder('utf-8').decode(this.contents);

        return cachedText;
      },
      get size(): number {
        return this.contents.byteLength;
      },
      get hash(): string {
        cachedHash ??= createHash('sha256')
          .update(cachedText ?? this.contents)
          .digest('hex');

        return cachedHash;
      },
      clone(): BuildOutputFile {
        return createOutputFile(this.path, cachedText ?? this.contents, this.type);
      },
    };
  } else {
    let cachedContents = data;
    let cachedText: string | null = null;
    let cachedHash: string | null = null;

    return {
      get contents(): Uint8Array {
        return cachedContents;
      },
      set contents(value: Uint8Array) {
        cachedContents = value;
        cachedText = null;
      },
      path,
      type,
      get size(): number {
        return this.contents.byteLength;
      },
      get text(): string {
        cachedText ??= new TextDecoder('utf-8').decode(this.contents);

        return cachedText;
      },
      get hash(): string {
        cachedHash ??= createHash('sha256').update(this.contents).digest('hex');

        return cachedHash;
      },
      clone(): BuildOutputFile {
        return createOutputFile(this.path, this.contents, this.type);
      },
    };
  }
}

export function convertOutputFile(file: OutputFile, type: BuildOutputFileType): BuildOutputFile {
  let { contents: cachedContents } = file;
  let cachedText: string | null = null;

  return {
    get contents(): Uint8Array {
      return cachedContents;
    },
    set contents(value: Uint8Array) {
      cachedContents = value;
      cachedText = null;
    },
    hash: file.hash,
    path: file.path,
    type,
    get size(): number {
      return this.contents.byteLength;
    },
    get text(): string {
      cachedText ??= new TextDecoder('utf-8').decode(this.contents);

      return cachedText;
    },
    clone(): BuildOutputFile {
      return convertOutputFile(this, this.type);
    },
  };
}

/**
 * Transform browserlists result to esbuild target.
 * @see https://esbuild.github.io/api/#target
 */
export function transformSupportedBrowsersToTargets(supportedBrowsers: string[]): string[] {
  const transformed: string[] = [];

  // https://esbuild.github.io/api/#target
  const esBuildSupportedBrowsers = new Set([
    'chrome',
    'edge',
    'firefox',
    'ie',
    'ios',
    'node',
    'opera',
    'safari',
  ]);

  for (const browser of supportedBrowsers) {
    let [browserName, version] = browser.toLowerCase().split(' ');

    // browserslist uses the name `ios_saf` for iOS Safari whereas esbuild uses `ios`
    if (browserName === 'ios_saf') {
      browserName = 'ios';
    }

    // browserslist uses ranges `15.2-15.3` versions but only the lowest is required
    // to perform minimum supported feature checks. esbuild also expects a single version.
    [version] = version.split('-');

    if (esBuildSupportedBrowsers.has(browserName)) {
      if (browserName === 'safari' && version === 'tp') {
        // esbuild only supports numeric versions so `TP` is converted to a high number (999) since
        // a Technology Preview (TP) of Safari is assumed to support all currently known features.
        version = '999';
      } else if (!version.includes('.')) {
        // A lone major version is considered by esbuild to include all minor versions. However,
        // browserslist does not and is also inconsistent in its `.0` version naming. For example,
        // Safari 15.0 is named `safari 15` but Safari 16.0 is named `safari 16.0`.
        version += '.0';
      }

      transformed.push(browserName + version);
    }
  }

  return transformed;
}

const SUPPORTED_NODE_VERSIONS = '0.0.0-ENGINES-NODE';

/**
 * Transform supported Node.js versions to esbuild target.
 * @see https://esbuild.github.io/api/#target
 */
export function getSupportedNodeTargets(): string[] {
  if (SUPPORTED_NODE_VERSIONS.charAt(0) === '0') {
    // Unlike `pkg_npm`, `ts_library` which is used to run unit tests does not support substitutions.
    return [];
  }

  return SUPPORTED_NODE_VERSIONS.split('||').map((v) => 'node' + coerce(v)?.version);
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

/**
 * A set of server-generated dependencies that are treated as external.
 *
 * These dependencies are marked as external because they are produced by a
 * separate bundling process and are not included in the primary bundle. This
 * ensures that these generated files are resolved from an external source rather
 * than being part of the main bundle.
 */
export const SERVER_GENERATED_EXTERNALS = new Set([
  './polyfills.server.mjs',
  './' + SERVER_APP_MANIFEST_FILENAME,
  './' + SERVER_APP_ENGINE_MANIFEST_FILENAME,
]);
