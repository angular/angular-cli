/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext } from '@angular-devkit/architect';
import { BuildOptions, Metafile, OutputFile, PartialMessage, formatMessages } from 'esbuild';
import { constants as fsConstants } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { brotliCompress } from 'node:zlib';
import { Spinner } from '../../utils/spinner';
import { BundleStats, generateBuildStatsTable } from '../webpack/utils/stats';
import { InitialFileRecord } from './bundler-context';

const compressAsync = promisify(brotliCompress);

export function logBuildStats(
  context: BuilderContext,
  metafile: Metafile,
  initial: Map<string, InitialFileRecord>,
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

    stats.push({
      initial: initial.has(file),
      stats: [
        file,
        initial.get(file)?.name ?? '-',
        output.bytes,
        estimatedTransferSizes?.get(file) ?? '-',
      ],
    });
  }

  const tableText = generateBuildStatsTable(stats, true, true, !!estimatedTransferSizes, undefined);

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

export async function withNoProgress<T>(test: string, action: () => T | Promise<T>): Promise<T> {
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
    // esbuild to downlevel async/await and for await...of to a Zone.js supported form. However, esbuild
    // does not currently support downleveling async generators. Instead babel is used within the JS/TS
    // loader to perform the downlevel transformation.
    // NOTE: If esbuild adds support in the future, the babel support for async generators can be disabled.
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
  outputFiles: OutputFile[],
  assetFiles: { source: string; destination: string }[] | undefined,
  outputPath: string,
) {
  const directoryExists = new Set<string>();
  await Promise.all(
    outputFiles.map(async (file) => {
      // Ensure output subdirectories exist
      const basePath = path.dirname(file.path);
      if (basePath && !directoryExists.has(basePath)) {
        await fs.mkdir(path.join(outputPath, basePath), { recursive: true });
        directoryExists.add(basePath);
      }
      // Write file contents
      await fs.writeFile(path.join(outputPath, file.path), file.contents);
    }),
  );

  if (assetFiles?.length) {
    await Promise.all(
      assetFiles.map(async ({ source, destination }) => {
        // Ensure output subdirectories exist
        const basePath = path.dirname(destination);
        if (basePath && !directoryExists.has(basePath)) {
          await fs.mkdir(path.join(outputPath, basePath), { recursive: true });
          directoryExists.add(basePath);
        }
        // Copy file contents
        await fs.copyFile(source, path.join(outputPath, destination), fsConstants.COPYFILE_FICLONE);
      }),
    );
  }
}

export function createOutputFileFromText(path: string, text: string): OutputFile {
  return {
    path,
    text,
    get contents() {
      return Buffer.from(this.text, 'utf-8');
    },
  };
}
