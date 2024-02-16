/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { logging } from '@angular-devkit/core';
import { BuildOptions, Metafile, OutputFile, formatMessages } from 'esbuild';
import { createHash } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import fs from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { brotliCompress } from 'node:zlib';
import { coerce } from 'semver';
import {
  NormalizedApplicationBuildOptions,
  NormalizedOutputOptions,
} from '../../builders/application/options';
import { BudgetCalculatorResult } from '../../utils/bundle-calculator';
import { Spinner } from '../../utils/spinner';
import { BundleStats, generateEsbuildBuildStatsTable } from '../webpack/utils/stats';
import { BuildOutputFile, BuildOutputFileType, InitialFileRecord } from './bundler-context';
import { BuildOutputAsset, ExecutionResult } from './bundler-execution-result';

export function logBuildStats(
  metafile: Metafile,
  initial: Map<string, InitialFileRecord>,
  budgetFailures: BudgetCalculatorResult[] | undefined,
  colors: boolean,
  changedFiles?: Set<string>,
  estimatedTransferSizes?: Map<string, number>,
  ssrOutputEnabled?: boolean,
  verbose?: boolean,
): string {
  const browserStats: BundleStats[] = [];
  const serverStats: BundleStats[] = [];
  let unchangedCount = 0;

  for (const [file, output] of Object.entries(metafile.outputs)) {
    // Only display JavaScript and CSS files
    if (!/\.(?:css|m?js)$/.test(file)) {
      continue;
    }

    // Skip internal component resources
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((output as any)['ng-component']) {
      continue;
    }

    // Show only changed files if a changed list is provided
    if (changedFiles && !changedFiles.has(file)) {
      ++unchangedCount;
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isPlatformServer = (output as any)['ng-platform-server'];
    if (isPlatformServer && !ssrOutputEnabled) {
      // Only log server build stats when SSR is enabled.
      continue;
    }

    let name = initial.get(file)?.name;
    if (name === undefined && output.entryPoint) {
      name = basename(output.entryPoint)
        .replace(/\.[cm]?[jt]s$/, '')
        .replace(/[\\/.]/g, '-');
    }

    const stat: BundleStats = {
      initial: initial.has(file),
      stats: [file, name ?? '-', output.bytes, estimatedTransferSizes?.get(file) ?? '-'],
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
    return '\nNo output file changes.\n';
  }
  if (unchangedCount > 0) {
    return `Unchanged output files: ${unchangedCount}`;
  }

  return '';
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
  const spinner = new Spinner(text);
  spinner.start();

  try {
    return await action();
  } finally {
    spinner.stop();
  }
}

export async function withNoProgress<T>(text: string, action: () => T | Promise<T>): Promise<T> {
  return action();
}

/**
 * Generates a syntax feature object map for Angular applications based on a list of targets.
 * A full set of feature names can be found here: https://esbuild.github.io/api/#supported
 * @param target An array of browser/engine targets in the format accepted by the esbuild `target` option.
 * @returns An object that can be used with the esbuild build `supported` option.
 */
export function getFeatureSupport(target: string[]): BuildOptions['supported'] {
  const supported: Record<string, boolean> = {
    // Native async/await is not supported with Zone.js. Disabling support here will cause
    // esbuild to downlevel async/await, async generators, and for await...of to a Zone.js supported form.
    'async-await': false,
    // V8 currently has a performance defect involving object spread operations that can cause signficant
    // degradation in runtime performance. By not supporting the language feature here, a downlevel form
    // will be used instead which provides a workaround for the performance issue.
    // For more details: https://bugs.chromium.org/p/v8/issues/detail?id=11536
    'object-rest-spread': false,
  };

  // Detect Safari browser versions that have a class field behavior bug
  // See: https://github.com/angular/angular-cli/issues/24355#issuecomment-1333477033
  // See: https://github.com/WebKit/WebKit/commit/e8788a34b3d5f5b4edd7ff6450b80936bff396f2
  let safariClassFieldScopeBug = false;
  for (const browser of target) {
    let majorVersion;
    if (browser.startsWith('ios')) {
      majorVersion = Number(browser.slice(3, 5));
    } else if (browser.startsWith('safari')) {
      majorVersion = Number(browser.slice(6, 8));
    } else {
      continue;
    }
    // Technically, 14.0 is not broken but rather does not have support. However, the behavior
    // is identical since it would be set to false by esbuild if present as a target.
    if (majorVersion === 14 || majorVersion === 15) {
      safariClassFieldScopeBug = true;
      break;
    }
  }
  // If class field support cannot be used set to false; otherwise leave undefined to allow
  // esbuild to use `target` to determine support.
  if (safariClassFieldScopeBug) {
    supported['class-field'] = false;
    supported['class-static-field'] = false;
  }

  return supported;
}

export async function writeResultFiles(
  outputFiles: BuildOutputFile[],
  assetFiles: BuildOutputAsset[] | undefined,
  { base, browser, media, server }: NormalizedOutputOptions,
) {
  const directoryExists = new Set<string>();
  const ensureDirectoryExists = async (destPath: string) => {
    const basePath = dirname(destPath);
    if (!directoryExists.has(basePath)) {
      await fs.mkdir(join(base, basePath), { recursive: true });
      directoryExists.add(basePath);
    }
  };

  // Writes the output file to disk and ensures the containing directories are present
  await emitFilesToDisk(outputFiles, async (file: BuildOutputFile) => {
    let outputDir: string;
    switch (file.type) {
      case BuildOutputFileType.Browser:
      case BuildOutputFileType.Media:
        outputDir = browser;
        break;
      case BuildOutputFileType.Server:
        outputDir = server;
        break;
      case BuildOutputFileType.Root:
        outputDir = '';
        break;
      default:
        throw new Error(
          `Unhandled write for file "${file.path}" with type "${BuildOutputFileType[file.type]}".`,
        );
    }

    const destPath = join(outputDir, file.path);

    // Ensure output subdirectories exist
    await ensureDirectoryExists(destPath);

    // Write file contents
    await fs.writeFile(join(base, destPath), file.contents);
  });

  if (assetFiles?.length) {
    await emitFilesToDisk(assetFiles, async ({ source, destination }) => {
      const destPath = join(browser, destination);

      // Ensure output subdirectories exist
      await ensureDirectoryExists(destPath);

      // Copy file contents
      await fs.copyFile(source, join(base, destPath), fsConstants.COPYFILE_FICLONE);
    });
  }
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

export function createOutputFileFromText(
  path: string,
  text: string,
  type: BuildOutputFileType,
): BuildOutputFile {
  return {
    path,
    text,
    type,
    get hash() {
      return createHash('sha256').update(this.text).digest('hex');
    },
    get contents() {
      return Buffer.from(this.text, 'utf-8');
    },
    clone(): BuildOutputFile {
      return createOutputFileFromText(this.path, this.text, this.type);
    },
  };
}

export function createOutputFileFromData(
  path: string,
  data: Uint8Array,
  type: BuildOutputFileType,
): BuildOutputFile {
  return {
    path,
    type,
    get text() {
      return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString('utf-8');
    },
    get hash() {
      return createHash('sha256').update(this.text).digest('hex');
    },
    get contents() {
      return data;
    },
    clone(): BuildOutputFile {
      return createOutputFileFromData(this.path, this.contents, this.type);
    },
  };
}

export function convertOutputFile(file: OutputFile, type: BuildOutputFileType): BuildOutputFile {
  const { path, contents, hash } = file;

  return {
    contents,
    hash,
    path,
    type,
    get text() {
      return Buffer.from(
        this.contents.buffer,
        this.contents.byteOffset,
        this.contents.byteLength,
      ).toString('utf-8');
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
  prerenderedRoutes?: string[];
}

export async function logMessages(
  logger: logging.LoggerApi,
  executionResult: ExecutionResult,
  options: NormalizedApplicationBuildOptions,
): Promise<void> {
  const {
    outputOptions: { base, server, browser },
    ssrOptions,
    jsonLogs,
    colors: color,
  } = options;
  const { warnings, errors, prerenderedRoutes } = executionResult;
  const warningMessages = warnings.length
    ? await formatMessages(warnings, { kind: 'warning', color })
    : [];
  const errorMessages = errors.length ? await formatMessages(errors, { kind: 'error', color }) : [];

  if (jsonLogs) {
    // JSON format output
    const manifest: BuildManifest = {
      errors: errorMessages,
      warnings: warningMessages,
      outputPaths: {
        root: pathToFileURL(base),
        browser: pathToFileURL(join(base, browser)),
        server: ssrOptions ? pathToFileURL(join(base, server)) : undefined,
      },
      prerenderedRoutes,
    };

    logger.info(JSON.stringify(manifest, undefined, 2));

    return;
  }

  if (warningMessages.length) {
    logger.warn(warningMessages.join('\n'));
  }

  if (errorMessages.length) {
    logger.error(errorMessages.join('\n'));
  }
}
