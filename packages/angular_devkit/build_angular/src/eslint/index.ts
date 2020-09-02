/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BuilderContext, BuilderOutput, createBuilder } from '@angular-devkit/architect';
import { json } from '@angular-devkit/core';
import { join } from 'path';
import { findCachePath } from '../utils/cache-path';
import { Schema as ESLintSchema } from './schema';

export type ESLintBuilderOptions = ESLintSchema & json.JsonObject;

async function execute(options: ESLintBuilderOptions, context: BuilderContext): Promise<BuilderOutput> {
  const projectName = context.target?.project;
  const {
    files,
    format,
    fix,
    eslintConfig,
    force,
  } = options;

  // Print formatter output only for non human-readable formats.
  const printInfo = !!format && !['checkstyle', 'html', 'jslint-xml', 'json', 'junit'].includes(format);

  if (printInfo) {
    context.logger.info(`Linting ${projectName}...`);
  }

  // This is needed because otherwise under Bazel tsconfigs will not be resolved properly
  // because the @typescript-eslint/eslint-plugin uses `process.cwd()` to resolve tsconfig
  // paths when using JSON config.
  process.chdir(context.workspaceRoot);

  // tslint:disable-next-line: no-implicit-dependencies
  const { ESLint } = await import('eslint');
  const eslint = new ESLint({
    cache: true,
    cacheLocation: join(findCachePath('eslint'), '.eslintcache'),
    fix,
    cwd: context.currentDirectory,
    overrideConfigFile: eslintConfig,
  });

  // Lint files. This doesn't modify target files
  const results = await eslint.lintFiles(files);
  if (results.length === 0) {
    throw new Error('Nothing to lint.');
  }

  // Modify the files with the fixed code.
  if (fix) {
    await ESLint.outputFixes(results);
  }

  // format results
  const formatter = await eslint.loadFormatter(format);
  const output = formatter.format(results);
  if (output.trim()) {
    context.logger.info(output);
  }

  // Sum errors and warnings.
  const hasErrors = results.some(({ errorCount }) => errorCount > 0);
  const hasWarnings = results.some(({ warningCount }) => warningCount > 0);

  if (printInfo) {
    if (hasWarnings) {
      context.logger.warn('Lint warnings found in the listed files.');
    }

    if (hasErrors) {
      context.logger.error('Lint errors found in the listed files.');
    }

    if (!hasWarnings && !hasErrors) {
      context.logger.info('All files passed linting.');
    }
  }

  return {
    success: force || !hasErrors,
  };
}


export default createBuilder<ESLintBuilderOptions>(execute);
