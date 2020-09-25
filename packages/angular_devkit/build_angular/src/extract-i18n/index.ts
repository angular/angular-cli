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
import { gte as semverGte } from 'semver';
import * as webpack from 'webpack';
import { Schema as BrowserBuilderOptions } from '../browser/schema';
import { ExecutionTransformer } from '../transforms';
import { createI18nOptions } from '../utils/i18n-options';
import { assertCompatibleAngularVersion } from '../utils/version';
import { generateBrowserWebpackConfigFromContext } from '../utils/webpack-browser-config';
import {
  getAotConfig,
  getCommonConfig,
  getStatsConfig,
  getStylesConfig,
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
    default:
      throw new Error(`Unsupported format "${format}"`);
  }
}

async function getSerializer(format: Format, sourceLocale: string, basePath: string, useLegacyIds = true) {
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
  }
}

class InMemoryOutputPlugin {
  apply(compiler: webpack.Compiler): void {
    // tslint:disable-next-line:no-any
    compiler.outputFileSystem = new (webpack as any).MemoryOutputFileSystem();
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

  if (options.i18nFormat !== Format.Xlf) {
    options.format = options.i18nFormat;
  }

  switch (options.format) {
    case Format.Xlf:
    case Format.Xlif:
    case Format.Xliff:
      options.format = Format.Xlf;
      break;
    case Format.Xlf2:
    case Format.Xliff2:
      options.format = Format.Xlf2;
      break;
    case undefined:
      options.format = Format.Xlf;
      break;
  }

  // We need to determine the outFile name so that AngularCompiler can retrieve it.
  let outFile = options.outFile || getI18nOutfile(options.format);
  if (options.outputPath) {
    // AngularCompilerPlugin doesn't support genDir so we have to adjust outFile instead.
    outFile = path.join(options.outputPath, outFile);
  }

  if (!context.target || !context.target.project) {
    throw new Error('The builder requires a target.');
  }

  const metadata = await context.getProjectMetadata(context.target);
  const i18n = createI18nOptions(metadata);

  let usingIvy = false;
  const ivyMessages: LocalizeMessage[] = [];
  const { config, projectRoot } = await generateBrowserWebpackConfigFromContext(
    {
      ...browserOptions,
      optimization: {
        scripts: false,
        styles: false,
      },
      sourceMap: {
        scripts: true,
        styles: false,
        vendor: true,
      },
      buildOptimizer: false,
      i18nLocale: options.i18nLocale || i18n.sourceLocale,
      i18nFormat: options.format,
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

      // Ivy-based extraction is currently opt-in
      if (options.ivy) {
        if (!isIvyApplication) {
          context.logger.warn(
            'Ivy extraction enabled but application is not Ivy enabled. Extraction may fail.',
          );
        }
        usingIvy = true;
      } else if (isIvyApplication) {
        context.logger.warn(
          'Ivy extraction not enabled but application is Ivy enabled. ' +
          'If the extraction fails, the `--ivy` flag will enable Ivy extraction.',
        );
      }

      const partials = [
        { plugins: [new InMemoryOutputPlugin()] },
        getCommonConfig(wco),
        // Only use VE extraction if not using Ivy
        getAotConfig(wco, !usingIvy),
        getStylesConfig(wco),
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

      return partials;
    },
  );

  if (usingIvy) {
    let validLocalizePackage = false;
    try {
      const { version: localizeVersion } = require('@angular/localize/package.json');
      validLocalizePackage = semverGte(localizeVersion, '10.1.0-next.0', { includePrerelease: true });
    } catch {}

    if (!validLocalizePackage) {
      context.logger.error(
        "Ivy extraction requires the '@angular/localize' package version 10.1.0 or higher.",
      );

      return { success: false };
    }
  }

  const webpackResult = await runWebpack(
    (await transforms?.webpackConfiguration?.(config)) || config,
    context,
    {
      logging: createWebpackLoggingCallback(false, context.logger),
      webpackFactory: await import('webpack'),
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

  // Serialize all extracted messages
  const serializer = await getSerializer(
    options.format,
    i18n.sourceLocale,
    config.context || projectRoot,
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
