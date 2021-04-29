/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext, createBuilder, targetFromTargetString } from '@angular-devkit/architect';
import { BuildResult, runWebpack } from '@angular-devkit/build-webpack';
import { JsonObject } from '@angular-devkit/core';
import type { ɵParsedMessage as LocalizeMessage } from '@angular/localize';
import type { Diagnostics } from '@angular/localize/src/tools/src/diagnostics';
import * as fs from 'fs';
import * as path from 'path';
import * as webpack from 'webpack';
import { Schema as BrowserBuilderOptions, OutputHashing } from '../browser/schema';
import { ExecutionTransformer } from '../transforms';
import { createI18nOptions } from '../utils/i18n-options';
import { assertCompatibleAngularVersion } from '../utils/version';
import { generateBrowserWebpackConfigFromContext } from '../utils/webpack-browser-config';
import {
  getBrowserConfig,
  getCommonConfig,
  getStatsConfig,
  getTypeScriptConfig,
} from '../webpack/configs';
import { createWebpackLoggingCallback } from '../webpack/utils/stats';
import { Format, Schema } from './schema';

export type ExtractI18nBuilderOptions = Schema & JsonObject;

function getI18nOutfile(format: string | undefined) {
  switch (format) {
    case 'xmb':
      return 'messages.xmb';
    case 'xlf':
    case 'xlif':
    case 'xliff':
    case 'xlf2':
    case 'xliff2':
      return 'messages.xlf';
    case 'json':
    case 'legacy-migrate':
      return 'messages.json';
    case 'arb':
      return 'messages.arb';
    default:
      throw new Error(`Unsupported format "${format}"`);
  }
}

async function getSerializer(
  format: Format,
  sourceLocale: string,
  basePath: string,
  useLegacyIds: boolean,
  diagnostics: Diagnostics,
) {
  switch (format) {
    case Format.Xmb:
      const { XmbTranslationSerializer } = await import(
        '@angular/localize/src/tools/src/extract/translation_files/xmb_translation_serializer'
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new XmbTranslationSerializer(basePath as any, useLegacyIds);
    case Format.Xlf:
    case Format.Xlif:
    case Format.Xliff:
      const { Xliff1TranslationSerializer } = await import(
        '@angular/localize/src/tools/src/extract/translation_files/xliff1_translation_serializer'
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new Xliff1TranslationSerializer(sourceLocale, basePath as any, useLegacyIds, {});
    case Format.Xlf2:
    case Format.Xliff2:
      const { Xliff2TranslationSerializer } = await import(
        '@angular/localize/src/tools/src/extract/translation_files/xliff2_translation_serializer'
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new Xliff2TranslationSerializer(sourceLocale, basePath as any, useLegacyIds, {});
    case Format.Json:
      const { SimpleJsonTranslationSerializer } = await import(
        '@angular/localize/src/tools/src/extract/translation_files/json_translation_serializer'
      );

      return new SimpleJsonTranslationSerializer(sourceLocale);
    case Format.LegacyMigrate:
      const { LegacyMessageIdMigrationSerializer } = await import(
        '@angular/localize/src/tools/src/extract/translation_files/legacy_message_id_migration_serializer'
      );

      return new LegacyMessageIdMigrationSerializer(diagnostics);
    case Format.Arb:
      const { ArbTranslationSerializer } = await import(
        '@angular/localize/src/tools/src/extract/translation_files/arb_translation_serializer'
      );

      const fileSystem = {
        relative(from: string, to: string): string {
          return path.relative(from, to);
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new ArbTranslationSerializer(sourceLocale, basePath as any, fileSystem as any);
  }
}

function normalizeFormatOption(options: ExtractI18nBuilderOptions): Format {
  let format = options.format;

  switch (format) {
    case Format.Xlf:
    case Format.Xlif:
    case Format.Xliff:
      format = Format.Xlf;
      break;
    case Format.Xlf2:
    case Format.Xliff2:
      format = Format.Xlf2;
      break;
  }

  // Default format is xliff1
  return format ?? Format.Xlf;
}

class NoEmitPlugin {
  apply(compiler: webpack.Compiler): void {
    compiler.hooks.shouldEmit.tap('angular-no-emit', () => false);
  }
}

/**
 * @experimental Direct usage of this function is considered experimental.
 */
export async function execute(
  options: ExtractI18nBuilderOptions,
  context: BuilderContext,
  transforms?: {
    webpackConfiguration?: ExecutionTransformer<webpack.Configuration>;
  },
): Promise<BuildResult> {
  // Check Angular version.
  assertCompatibleAngularVersion(context.workspaceRoot, context.logger);

  const browserTarget = targetFromTargetString(options.browserTarget);
  const browserOptions = await context.validateOptions<JsonObject & BrowserBuilderOptions>(
    await context.getTargetOptions(browserTarget),
    await context.getBuilderNameForTarget(browserTarget),
  );

  const format = normalizeFormatOption(options);

  // We need to determine the outFile name so that AngularCompiler can retrieve it.
  let outFile = options.outFile || getI18nOutfile(format);
  if (options.outputPath) {
    // AngularCompilerPlugin doesn't support genDir so we have to adjust outFile instead.
    outFile = path.join(options.outputPath, outFile);
  }
  outFile = path.resolve(context.workspaceRoot, outFile);

  if (!context.target || !context.target.project) {
    throw new Error('The builder requires a target.');
  }

  const metadata = await context.getProjectMetadata(context.target);
  const i18n = createI18nOptions(metadata);

  let useLegacyIds = true;

  const ivyMessages: LocalizeMessage[] = [];
  const { config, projectRoot } = await generateBrowserWebpackConfigFromContext(
    {
      ...browserOptions,
      optimization: false,
      sourceMap: {
        scripts: true,
        styles: false,
        vendor: true,
      },
      buildOptimizer: false,
      aot: true,
      progress: options.progress,
      budgets: [],
      assets: [],
      scripts: [],
      styles: [],
      deleteOutputPath: false,
      extractLicenses: false,
      subresourceIntegrity: false,
      outputHashing: OutputHashing.None,
      namedChunks: true,
    },
    context,
    (wco) => {
      if (wco.tsConfig.options.enableIvy === false) {
        context.logger.warn(
          'Ivy extraction enabled but application is not Ivy enabled. Extraction may fail.',
        );
      }

      // Default value for legacy message ids is currently true
      useLegacyIds = wco.tsConfig.options.enableI18nLegacyMessageIdFormat ?? true;

      const partials = [
        { plugins: [new NoEmitPlugin()] },
        getCommonConfig(wco),
        getBrowserConfig(wco),
        getTypeScriptConfig(wco),
        getStatsConfig(wco),
      ];

      // Add Ivy application file extractor support
      partials.unshift({
        module: {
          rules: [
            {
              test: /\.[t|j]s$/,
              loader: require.resolve('./ivy-extract-loader'),
              options: {
                messageHandler: (messages: LocalizeMessage[]) => ivyMessages.push(...messages),
              },
            },
          ],
        },
      });

      // Replace all stylesheets with an empty default export
      partials.push({
        plugins: [
          new webpack.NormalModuleReplacementPlugin(
            /\.(css|scss|sass|styl|less)$/,
            path.join(__dirname, 'empty-export-default.js'),
          ),
        ],
      });

      return partials;
    },
  );

  try {
    require.resolve('@angular/localize');
  } catch {
    return {
      success: false,
      error: `Ivy extraction requires the '@angular/localize' package.`,
      outputPath: outFile,
    };
  }

  const webpackResult = await runWebpack(
    (await transforms?.webpackConfiguration?.(config)) || config,
    context,
    {
      logging: createWebpackLoggingCallback(false, context.logger),
      webpackFactory: webpack,
    },
  ).toPromise();

  // Set the outputPath to the extraction output location for downstream consumers
  webpackResult.outputPath = outFile;

  // Complete if Webpack build failed
  if (!webpackResult.success) {
    return webpackResult;
  }

  const basePath = config.context || projectRoot;

  const { checkDuplicateMessages } = await import(
    '@angular/localize/src/tools/src/extract/duplicates'
  );

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
    ivyMessages,
    'warning',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    basePath as any,
  );
  if (diagnostics.messages.length > 0) {
    context.logger.warn(diagnostics.formatDiagnostics(''));
  }

  // Serialize all extracted messages
  const serializer = await getSerializer(
    format,
    i18n.sourceLocale,
    basePath,
    useLegacyIds,
    diagnostics,
  );
  const content = serializer.serialize(ivyMessages);

  // Ensure directory exists
  const outputPath = path.dirname(outFile);
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  // Write translation file
  fs.writeFileSync(outFile, content);

  return webpackResult;
}

export default createBuilder<JsonObject & ExtractI18nBuilderOptions>(execute);
