/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext, targetFromTargetString } from '@angular-devkit/architect';
import { fail } from 'node:assert';
import path from 'node:path';
import { createI18nOptions } from '../../utils/i18n-options';
import { Schema as ExtractI18nOptions, Format } from './schema';

export type NormalizedExtractI18nOptions = Awaited<ReturnType<typeof normalizeOptions>>;

/**
 * Normalize the user provided options by creating full paths for all path based options
 * and converting multi-form options into a single form that can be directly used
 * by the build process.
 *
 * @param context The context for current builder execution.
 * @param projectName The name of the project for the current execution.
 * @param options An object containing the options to use for the build.
 * @returns An object containing normalized options required to perform the build.
 */
export async function normalizeOptions(
  context: BuilderContext,
  projectName: string,
  options: ExtractI18nOptions,
) {
  const workspaceRoot = context.workspaceRoot;
  const projectMetadata = await context.getProjectMetadata(projectName);
  const projectRoot = path.join(workspaceRoot, (projectMetadata.root as string | undefined) ?? '');

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const buildTarget = targetFromTargetString(options.buildTarget ?? options.browserTarget!);

  const i18nOptions = createI18nOptions(projectMetadata);

  // Normalize xliff format extensions
  let format = options.format;
  switch (format) {
    case undefined:
    // Default format is xliff1
    case Format.Xlf:
    case Format.Xlif:
    case Format.Xliff:
      format = Format.Xliff;
      break;
    case Format.Xlf2:
    case Format.Xliff2:
      format = Format.Xliff2;
      break;
  }

  let outFile = options.outFile || getDefaultOutFile(format);
  if (options.outputPath) {
    outFile = path.join(options.outputPath, outFile);
  }
  outFile = path.resolve(context.workspaceRoot, outFile);

  return {
    workspaceRoot,
    projectRoot,
    buildTarget,
    i18nOptions,
    format,
    outFile,
    progress: options.progress ?? true,
  };
}

function getDefaultOutFile(format: Format) {
  switch (format) {
    case Format.Xmb:
      return 'messages.xmb';
    case Format.Xliff:
    case Format.Xliff2:
      return 'messages.xlf';
    case Format.Json:
    case Format.LegacyMigrate:
      return 'messages.json';
    case Format.Arb:
      return 'messages.arb';
    default:
      fail(`Invalid Format enum value: ${format as unknown}`);
  }
}
