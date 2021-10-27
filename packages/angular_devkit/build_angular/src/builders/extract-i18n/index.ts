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
import type { Diagnostics } from '@angular/localize/tools';
import * as fs from 'fs';
import * as path from 'path';
import webpack from 'webpack';
import { ExecutionTransformer } from '../../transforms';
import { createI18nOptions } from '../../utils/i18n-options';
import { loadEsmModule } from '../../utils/load-esm';
import { assertCompatibleAngularVersion } from '../../utils/version';
import { generateBrowserWebpackConfigFromContext } from '../../utils/webpack-browser-config';
import {
  getBrowserConfig,
  getCommonConfig,
  getStatsConfig,
  getTypeScriptConfig,
  getWorkerConfig,
} from '../../webpack/configs';
import { createWebpackLoggingCallback } from '../../webpack/utils/stats';
import { Schema as BrowserBuilderOptions, OutputHashing } from '../browser/schema';
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
  assertCompatibleAngularVersion(context.workspaceRoot);

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

  try {
    require.resolve('@angular/localize');
  } catch {
    return {
      success: false,
      error: `i18n extraction requires the '@angular/localize' package.`,
      outputPath: outFile,
    };
  }

  const metadata = await context.getProjectMetadata(context.target);
  const i18n = createI18nOptions(metadata);

  let useLegacyIds = true;

  const ivyMessages: LocalizeMessage[] = [];
  const builderOptions = {
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
  };
  const { config, projectRoot } = await generateBrowserWebpackConfigFromContext(
    builderOptions,
    context,
    (wco) => {
      // Default value for legacy message ids is currently true
      useLegacyIds = wco.tsConfig.options.enableI18nLegacyMessageIdFormat ?? true;

      const partials = [
        { plugins: [new NoEmitPlugin()] },
        getCommonConfig(wco),
        getBrowserConfig(wco),
        getTypeScriptConfig(wco),
        getWorkerConfig(wco),
        getStatsConfig(wco),
      ];

      // Add Ivy application file extractor support
      partials.unshift({
        module: {
          rules: [
            {
              test: /\.[cm]?[tj]sx?$/,
              loader: require.resolve('./ivy-extract-loader'),
              options: {
                messageHandler: (messages: LocalizeMessage[]) => ivyMessages.push(...messages),
              },
            },
          ],
        },
      });

      // Replace all stylesheets with empty content
      partials.push({
        module: {
          rules: [
            {
              test: /\.(css|scss|sass|styl|less)$/,
              loader: require.resolve('./empty-loader'),
            },
          ],
        },
      });

      return partials;
    },
  );

  // All the localize usages are setup to first try the ESM entry point then fallback to the deep imports.
  // This provides interim compatibility while the framework is transitioned to bundled ESM packages.
  const localizeToolsModule = await loadEsmModule<typeof import('@angular/localize/tools')>(
    '@angular/localize/tools',
  );
  const webpackResult = await runWebpack(
    (await transforms?.webpackConfiguration?.(config)) || config,
    context,
    {
      logging: createWebpackLoggingCallback(builderOptions, context.logger),
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
    localizeToolsModule,
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

export default createBuilder<ExtractI18nBuilderOptions>(execute);
