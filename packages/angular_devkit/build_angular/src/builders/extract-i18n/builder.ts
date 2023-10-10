/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { Diagnostics } from '@angular/localize/tools';
import type { BuilderContext, BuilderOutput } from '@angular-devkit/architect';
import fs from 'node:fs';
import path from 'node:path';
import type webpack from 'webpack';
import type { ExecutionTransformer } from '../../transforms';
import { loadEsmModule } from '../../utils/load-esm';
import { purgeStaleBuildCache } from '../../utils/purge-cache';
import { assertCompatibleAngularVersion } from '../../utils/version';
import { normalizeOptions } from './options';
import { Schema as ExtractI18nBuilderOptions, Format } from './schema';

/**
 * @experimental Direct usage of this function is considered experimental.
 */
export async function execute(
  options: ExtractI18nBuilderOptions,
  context: BuilderContext,
  transforms?: {
    webpackConfiguration?: ExecutionTransformer<webpack.Configuration>;
  },
): Promise<BuilderOutput> {
  // Determine project name from builder context target
  const projectName = context.target?.project;
  if (!projectName) {
    context.logger.error(`The 'extract-i18n' builder requires a target to be specified.`);

    return { success: false };
  }

  // Check Angular version.
  assertCompatibleAngularVersion(context.workspaceRoot);

  // Load the Angular localize package.
  // The package is a peer dependency and might not be present
  let localizeToolsModule;
  try {
    localizeToolsModule =
      await loadEsmModule<typeof import('@angular/localize/tools')>('@angular/localize/tools');
  } catch {
    return {
      success: false,
      error:
        `i18n extraction requires the '@angular/localize' package.` +
        ` You can add it by using 'ng add @angular/localize'.`,
    };
  }

  // Normalize options
  const normalizedOptions = await normalizeOptions(context, projectName, options);
  const builderName = await context.getBuilderNameForTarget(normalizedOptions.buildTarget);

  // Extract messages based on configured builder
  let extractionResult;
  if (
    builderName === '@angular-devkit/build-angular:application' ||
    builderName === '@angular-devkit/build-angular:browser-esbuild'
  ) {
    const { extractMessages } = await import('./application-extraction');
    extractionResult = await extractMessages(
      normalizedOptions,
      builderName,
      context,
      localizeToolsModule.MessageExtractor,
    );
  } else {
    // Purge old build disk cache.
    // Other build systems handle stale cache purging directly.
    await purgeStaleBuildCache(context);

    const { extractMessages } = await import('./webpack-extraction');
    extractionResult = await extractMessages(normalizedOptions, builderName, context, transforms);
  }

  // Return the builder result if it failed
  if (!extractionResult.builderResult.success) {
    return extractionResult.builderResult;
  }

  // Perform duplicate message checks
  const { checkDuplicateMessages } = localizeToolsModule;

  // The filesystem is used to create a relative path for each file
  // from the basePath.  This relative path is then used in the error message.
  const checkFileSystem = {
    relative(from: string, to: string): string {
      return path.relative(from, to);
    },
  };
  const diagnostics = checkDuplicateMessages(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    checkFileSystem as any,
    extractionResult.messages,
    'warning',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extractionResult.basePath as any,
  );
  if (diagnostics.messages.length > 0) {
    context.logger.warn(diagnostics.formatDiagnostics(''));
  }

  // Serialize all extracted messages
  const serializer = await createSerializer(
    localizeToolsModule,
    normalizedOptions.format,
    normalizedOptions.i18nOptions.sourceLocale,
    extractionResult.basePath,
    extractionResult.useLegacyIds,
    diagnostics,
  );
  const content = serializer.serialize(extractionResult.messages);

  // Ensure directory exists
  const outputPath = path.dirname(normalizedOptions.outFile);
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  // Write translation file
  fs.writeFileSync(normalizedOptions.outFile, content);

  if (normalizedOptions.progress) {
    context.logger.info(`Extraction Complete. (Messages: ${extractionResult.messages.length})`);
  }

  return { success: true, outputPath: normalizedOptions.outFile };
}

async function createSerializer(
  localizeToolsModule: typeof import('@angular/localize/tools'),
  format: Format,
  sourceLocale: string,
  basePath: string,
  useLegacyIds: boolean,
  diagnostics: Diagnostics,
) {
  const {
    XmbTranslationSerializer,
    LegacyMessageIdMigrationSerializer,
    ArbTranslationSerializer,
    Xliff1TranslationSerializer,
    Xliff2TranslationSerializer,
    SimpleJsonTranslationSerializer,
  } = localizeToolsModule;

  switch (format) {
    case Format.Xmb:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new XmbTranslationSerializer(basePath as any, useLegacyIds);
    case Format.Xlf:
    case Format.Xlif:
    case Format.Xliff:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new Xliff1TranslationSerializer(sourceLocale, basePath as any, useLegacyIds, {});
    case Format.Xlf2:
    case Format.Xliff2:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new Xliff2TranslationSerializer(sourceLocale, basePath as any, useLegacyIds, {});
    case Format.Json:
      return new SimpleJsonTranslationSerializer(sourceLocale);
    case Format.LegacyMigrate:
      return new LegacyMessageIdMigrationSerializer(diagnostics);
    case Format.Arb:
      const fileSystem = {
        relative(from: string, to: string): string {
          return path.relative(from, to);
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new ArbTranslationSerializer(sourceLocale, basePath as any, fileSystem as any);
  }
}
