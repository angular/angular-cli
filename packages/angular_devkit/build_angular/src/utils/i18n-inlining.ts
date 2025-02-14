/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { BuilderContext } from '@angular-devkit/architect';
import { EmittedFiles } from '@angular-devkit/build-webpack';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { BundleActionExecutor } from './action-executor';
import { InlineOptions } from './bundle-inline-options';
import { copyAssets } from './copy-assets';
import { assertIsError } from './error';
import { I18nOptions } from './i18n-webpack';
import { Spinner } from './spinner';

function emittedFilesToInlineOptions(
  emittedFiles: EmittedFiles[],
  scriptsEntryPointName: string[],
  emittedPath: string,
  outputPath: string,
  missingTranslation: 'error' | 'warning' | 'ignore' | undefined,
  context: BuilderContext,
): { options: InlineOptions[]; originalFiles: string[] } {
  const options: InlineOptions[] = [];
  const originalFiles: string[] = [];
  for (const emittedFile of emittedFiles) {
    if (
      emittedFile.asset ||
      emittedFile.extension !== '.js' ||
      (emittedFile.name && scriptsEntryPointName.includes(emittedFile.name))
    ) {
      continue;
    }

    const originalPath = path.join(emittedPath, emittedFile.file);
    const action: InlineOptions = {
      filename: emittedFile.file,
      code: fs.readFileSync(originalPath, 'utf8'),
      outputPath,
      missingTranslation,
      setLocale: emittedFile.name === 'main',
    };
    originalFiles.push(originalPath);

    try {
      const originalMapPath = originalPath + '.map';
      action.map = fs.readFileSync(originalMapPath, 'utf8');
      originalFiles.push(originalMapPath);
    } catch (err) {
      assertIsError(err);
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }

    context.logger.debug(`i18n file queued for processing: ${action.filename}`);

    options.push(action);
  }

  return { options, originalFiles };
}

export async function i18nInlineEmittedFiles(
  context: BuilderContext,
  emittedFiles: EmittedFiles[],
  i18n: I18nOptions,
  baseOutputPath: string,
  outputPaths: string[],
  scriptsEntryPointName: string[],
  emittedPath: string,
  missingTranslation: 'error' | 'warning' | 'ignore' | undefined,
): Promise<boolean> {
  const executor = new BundleActionExecutor({ i18n });
  let hasErrors = false;
  const spinner = new Spinner();
  spinner.start('Generating localized bundles...');

  try {
    const { options, originalFiles: processedFiles } = emittedFilesToInlineOptions(
      emittedFiles,
      scriptsEntryPointName,
      emittedPath,
      baseOutputPath,
      missingTranslation,
      context,
    );

    for await (const result of executor.inlineAll(options)) {
      context.logger.debug(`i18n file processed: ${result.file}`);

      for (const diagnostic of result.diagnostics) {
        spinner.stop();
        if (diagnostic.type === 'error') {
          hasErrors = true;
          context.logger.error(diagnostic.message);
        } else {
          context.logger.warn(diagnostic.message);
        }
        spinner.start();
      }
    }

    // Copy any non-processed files into the output locations
    await copyAssets(
      [
        {
          glob: '**/*',
          input: emittedPath,
          output: '',
          ignore: [...processedFiles].map((f) => path.relative(emittedPath, f)),
        },
      ],
      outputPaths,
      '',
    );
  } catch (err) {
    assertIsError(err);
    spinner.fail('Localized bundle generation failed: ' + err.message);

    return false;
  } finally {
    executor.stop();
  }

  if (hasErrors) {
    spinner.fail('Localized bundle generation failed.');
  } else {
    spinner.succeed('Localized bundle generation complete.');
  }

  return !hasErrors;
}
