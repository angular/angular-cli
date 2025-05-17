/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { type I18nOptions, createI18nOptions } from '@angular/build/private';
import { type DiagnosticHandlingStrategy } from '@angular/localize/tools';
import { BuilderContext, targetFromTargetString } from '@angular-devkit/architect';
import { fail } from 'node:assert';
import path from 'node:path';
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

  // Target specifier defaults to the current project's build target with no specified configuration
  const buildTargetSpecifier = options.buildTarget ?? ':';
  const buildTarget = targetFromTargetString(buildTargetSpecifier, projectName, 'build');
  const i18nOptions: I18nOptions & {
    duplicateTranslationBehavior: DiagnosticHandlingStrategy;
  } = {
    ...createI18nOptions(projectMetadata, /** inline */ false, context.logger),
    duplicateTranslationBehavior: options.i18nDuplicateTranslation || 'warning',
  };

  // Normalize xliff format extensions
  let format = options.format;
  switch (format) {
    // Default format is xliff1
    case undefined:
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
