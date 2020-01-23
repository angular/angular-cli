/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BuilderContext } from '@angular-devkit/architect';
import { EmittedFiles } from '@angular-devkit/build-webpack';
import * as fs from 'fs';
import * as path from 'path';
import { BundleActionExecutor } from './action-executor';
import { copyAssets } from './copy-assets';
import { I18nOptions } from './i18n-options';
import { InlineOptions } from './process-bundle';

function emittedFilesToInlineOptions(
  emittedFiles: EmittedFiles[],
  scriptsEntryPointName: string[],
  emittedPath: string,
  outputPath: string,
  es5: boolean,
  missingTranslation: 'error' | 'warning' | 'ignore' | undefined,
): { options: InlineOptions[]; originalFiles: string[] }  {
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
      es5,
      outputPath,
      missingTranslation,
      setLocale: emittedFile.name === 'main' || emittedFile.name === 'vendor',
    };
    originalFiles.push(originalPath);

    try {
      const originalMapPath = originalPath + '.map';
      action.map = fs.readFileSync(originalMapPath, 'utf8');
      originalFiles.push(originalMapPath);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }

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
  es5: boolean,
  missingTranslation: 'error' | 'warning' | 'ignore' | undefined,
): Promise<boolean> {
  const executor = new BundleActionExecutor({ i18n });
  let hasErrors = false;
  try {
    const { options, originalFiles: processedFiles } = emittedFilesToInlineOptions(
      emittedFiles,
      scriptsEntryPointName,
      emittedPath,
      baseOutputPath,
      es5,
      missingTranslation,
    );

    for await (const result of executor.inlineAll(options)) {
      for (const diagnostic of result.diagnostics) {
        if (diagnostic.type === 'error') {
          hasErrors = true;
          context.logger.error(diagnostic.message);
        } else {
          context.logger.warn(diagnostic.message);
        }
      }
    }

    // Copy any non-processed files into the output locations
    await copyAssets(
      [
        {
          glob: '**/*',
          input: emittedPath,
          output: '',
          ignore: [...processedFiles].map(f => path.relative(emittedPath, f)),
        },
      ],
      outputPaths,
      '',
    );
  } catch (err) {
    context.logger.error('Localized bundle generation failed: ' + err.message);

    return false;
  } finally {
    await executor.stop();
  }

  if (hasErrors) {
    context.logger.error('Localized bundle generation failed.');
  } else {
    context.logger.info('Localized bundle generation complete.');
  }

  return !hasErrors;
}
