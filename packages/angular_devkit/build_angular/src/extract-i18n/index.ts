/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  BuilderContext,
  createBuilder,
  targetFromTargetString,
} from '@angular-devkit/architect';
import { BuildResult, runWebpack } from '@angular-devkit/build-webpack';
import { JsonObject } from '@angular-devkit/core';
import type { ɵParsedMessage as LocalizeMessage } from '@angular/localize';
import * as fs from 'fs';
import * as path from 'path';
import * as webpack from 'webpack';
import { Schema as BrowserBuilderOptions } from '../browser/schema';
import { ExecutionTransformer } from '../transforms';
import { createI18nOptions } from '../utils/i18n-options';
import { assertCompatibleAngularVersion } from '../utils/version';
import { generateBrowserWebpackConfigFromContext } from '../utils/webpack-browser-config';
import { getAotConfig, getCommonConfig, getStatsConfig } from '../webpack/configs';
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
      return 'messages.json';
    case 'arb':
      return 'messages.arb';
    default:
      throw new Error(`Unsupported format "${format}"`);
  }
}

async function getSerializer(format: Format, sourceLocale: string, basePath: string, useLegacyIds: boolean) {
  switch (format) {
    case Format.Xmb:
      const { XmbTranslationSerializer } =
      await import('@angular/localize/src/tools/src/extract/translation_files/xmb_translation_serializer');

      // tslint:disable-next-line: no-any
      return new XmbTranslationSerializer(basePath as any, useLegacyIds);
    case Format.Xlf:
    case Format.Xlif:
    case Format.Xliff:
      const { Xliff1TranslationSerializer } =
        await import('@angular/localize/src/tools/src/extract/translation_files/xliff1_translation_serializer');

      // tslint:disable-next-line: no-any
      return new Xliff1TranslationSerializer(sourceLocale, basePath as any, useLegacyIds, {});
    case Format.Xlf2:
    case Format.Xliff2:
      const { Xliff2TranslationSerializer } =
        await import('@angular/localize/src/tools/src/extract/translation_files/xliff2_translation_serializer');

      // tslint:disable-next-line: no-any
      return new Xliff2TranslationSerializer(sourceLocale, basePath as any, useLegacyIds, {});
    case Format.Json:
      const { SimpleJsonTranslationSerializer } =
        await import('@angular/localize/src/tools/src/extract/translation_files/json_translation_serializer');

      // tslint:disable-next-line: no-any
      return new SimpleJsonTranslationSerializer(sourceLocale);
    case Format.Arb:
      const { ArbTranslationSerializer } =
        await import('@angular/localize/src/tools/src/extract/translation_files/arb_translation_serializer');

      const fileSystem = {
        relative(from: string, to: string): string {
          return path.relative(from, to);
        },
      };

      // tslint:disable-next-line: no-any
      return new ArbTranslationSerializer(sourceLocale, basePath as any, fileSystem as any);
  }
}

function normalizeFormatOption(options: ExtractI18nBuilderOptions) {
  let format;
  if (options.i18nFormat !== Format.Xlf) {
    format = options.i18nFormat;
  } else {
    format = options.format;
  }

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
    case Format.Json:
      format = Format.Json;
      break;
    case Format.Arb:
      format = Format.Arb;
      break;
    case undefined:
      format = Format.Xlf;
      break;
  }

  return format;
}

class NoEmitPlugin {
  apply(compiler: webpack.Compiler): void {
    compiler.hooks.shouldEmit.tap('angular-no-emit', () => false);
  }
}

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
  let outFile = options.outFile || getI18nOutfile(options.format);
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

  let usingIvy = false;
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
      i18nLocale: options.i18nLocale || i18n.sourceLocale,
      i18nFormat: format,
      i18nFile: outFile,
      aot: true,
      progress: options.progress,
      assets: [],
      scripts: [],
      styles: [],
      deleteOutputPath: false,
    },
    context,
    (wco) => {
      const isIvyApplication = wco.tsConfig.options.enableIvy !== false;

      // Default value for legacy message ids is currently true
      useLegacyIds = wco.tsConfig.options.enableI18nLegacyMessageIdFormat ?? true;

      // Ivy extraction is the default for Ivy applications.
      usingIvy = (isIvyApplication && options.ivy === undefined) || !!options.ivy;

      if (usingIvy) {
        if (!isIvyApplication) {
          context.logger.warn(
            'Ivy extraction enabled but application is not Ivy enabled. Extraction may fail.',
          );
        }
      } else if (isIvyApplication) {
        context.logger.warn(
          'Ivy extraction not enabled but application is Ivy enabled. ' +
          'If the extraction fails, the `--ivy` flag will enable Ivy extraction.',
        );
      }

      const partials = [
        { plugins: [new NoEmitPlugin()] },
        getCommonConfig(wco),
        // Only use VE extraction if not using Ivy
        getAotConfig(wco, !usingIvy),
        getStatsConfig(wco),
      ];

      // Add Ivy application file extractor support
      if (usingIvy) {
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
      }

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

  if (usingIvy) {
    try {
      require.resolve('@angular/localize');
    } catch {
      return {
        success: false,
        error: `Ivy extraction requires the '@angular/localize' package.`,
       };
    }
  }

  const webpackResult = await runWebpack(
    (await transforms?.webpackConfiguration?.(config)) || config,
    context,
    {
      logging: createWebpackLoggingCallback(false, context.logger),
      webpackFactory: webpack,
    },
  ).toPromise();

  // Complete if using VE
  if (!usingIvy) {
    return webpackResult;
  }

  // Nothing to process if the Webpack build failed
  if (!webpackResult.success) {
    return webpackResult;
  }

  const basePath = config.context || projectRoot;

  const { checkDuplicateMessages } = await import(
    // tslint:disable-next-line: trailing-comma
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
    // tslint:disable-next-line: no-any
    checkFileSystem as any,
    ivyMessages,
    'warning',
    // tslint:disable-next-line: no-any
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
