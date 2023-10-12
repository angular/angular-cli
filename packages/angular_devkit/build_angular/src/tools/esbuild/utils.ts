/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext } from '@angular-devkit/architect';
import { BuildOptions, Metafile, OutputFile, PartialMessage, formatMessages } from 'esbuild';
import { createHash } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import fs from 'node:fs/promises';
import path, { join } from 'node:path';
import { promisify } from 'node:util';
import { brotliCompress } from 'node:zlib';
import { coerce } from 'semver';
import { BudgetCalculatorResult } from '../../utils/bundle-calculator';
import { Spinner } from '../../utils/spinner';
import { BundleStats, generateBuildStatsTable } from '../webpack/utils/stats';
import { BuildOutputFile, BuildOutputFileType, InitialFileRecord } from './bundler-context';
import { BuildOutputAsset } from './bundler-execution-result';

const compressAsync = promisify(brotliCompress);

export function logBuildStats(
  context: BuilderContext,
  metafile: Metafile,
  initial: Map<string, InitialFileRecord>,
  budgetFailures: BudgetCalculatorResult[] | undefined,
  estimatedTransferSizes?: Map<string, number>,
): void {
  const stats: BundleStats[] = [];
  for (const [file, output] of Object.entries(metafile.outputs)) {
    // Only display JavaScript and CSS files
    if (!file.endsWith('.js') && !file.endsWith('.css')) {
      continue;
    }
    // Skip internal component resources
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((output as any)['ng-component']) {
      continue;
    }

    let name = initial.get(file)?.name;
    if (name === undefined && output.entryPoint) {
      name = path
        .basename(output.entryPoint)
        .replace(/\.[cm]?[jt]s$/, '')
        .replace(/[\\/.]/g, '-');
    }

    stats.push({
      initial: initial.has(file),
      stats: [file, name ?? '-', output.bytes, estimatedTransferSizes?.get(file) ?? '-'],
    });
  }

  const tableText = generateBuildStatsTable(
    stats,
    true,
    true,
    !!estimatedTransferSizes,
    budgetFailures,
  );

  context.logger.info('\n' + tableText + '\n');
}

export async function calculateEstimatedTransferSizes(
  outputFiles: OutputFile[],
): Promise<Map<string, number>> {
  const sizes = new Map<string, number>();
  const pendingCompression = [];

  for (const outputFile of outputFiles) {
    // Only calculate JavaScript and CSS files
    if (!outputFile.path.endsWith('.js') && !outputFile.path.endsWith('.css')) {
      continue;
    }

    // Skip compressing small files which may end being larger once compressed and will most likely not be
    // compressed in actual transit.
    if (outputFile.contents.byteLength < 1024) {
      sizes.set(outputFile.path, outputFile.contents.byteLength);
      continue;
    }

    pendingCompression.push(
      compressAsync(outputFile.contents).then((result) =>
        sizes.set(outputFile.path, result.byteLength),
      ),
    );
  }

  await Promise.all(pendingCompression);

  return sizes;
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

export async function logMessages(
  context: BuilderContext,
  { errors, warnings }: { errors?: PartialMessage[]; warnings?: PartialMessage[] },
): Promise<void> {
  if (warnings?.length) {
    const warningMessages = await formatMessages(warnings, { kind: 'warning', color: true });
    context.logger.warn(warningMessages.join('\n'));
  }

  if (errors?.length) {
    const errorMessages = await formatMessages(errors, { kind: 'error', color: true });
    context.logger.error(errorMessages.join('\n'));
  }
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
  outputPath: string,
) {
  const directoryExists = new Set<string>();
  const ensureDirectoryExists = async (basePath: string) => {
    if (basePath && !directoryExists.has(basePath)) {
      await fs.mkdir(path.join(outputPath, basePath), { recursive: true });
      directoryExists.add(basePath);
    }
  };

  // Writes the output file to disk and ensures the containing directories are present
  await emitFilesToDisk(outputFiles, async (file: BuildOutputFile) => {
    const fullOutputPath = file.fullOutputPath;
    // Ensure output subdirectories exist
    const basePath = path.dirname(fullOutputPath);
    await ensureDirectoryExists(basePath);

    // Write file contents
    await fs.writeFile(path.join(outputPath, fullOutputPath), file.contents);
  });

  if (assetFiles?.length) {
    await emitFilesToDisk(assetFiles, async ({ source, destination }) => {
      // Ensure output subdirectories exist
      const destPath = join('browser', destination);
      const basePath = path.dirname(destPath);
      await ensureDirectoryExists(basePath);

      // Copy file contents
      await fs.copyFile(source, path.join(outputPath, destPath), fsConstants.COPYFILE_FICLONE);
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
    get fullOutputPath(): string {
      return getFullOutputPath(this);
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
    get fullOutputPath(): string {
      return getFullOutputPath(this);
    },
    clone(): BuildOutputFile {
      return createOutputFileFromData(this.path, this.contents, this.type);
    },
  };
}

export function getFullOutputPath(file: BuildOutputFile): string {
  switch (file.type) {
    case BuildOutputFileType.Browser:
    case BuildOutputFileType.Media:
      return join('browser', file.path);
    case BuildOutputFileType.Server:
      return join('server', file.path);
    default:
      return file.path;
  }
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
