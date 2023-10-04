/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext } from '@angular-devkit/architect';
import { join } from 'node:path';
import { BuildOutputFileType, InitialFileRecord } from '../../tools/esbuild/bundler-context';
import { ExecutionResult } from '../../tools/esbuild/bundler-execution-result';
import { I18nInliner } from '../../tools/esbuild/i18n-inliner';
import { generateIndexHtml } from '../../tools/esbuild/index-html-generator';
import { createOutputFileFromText } from '../../tools/esbuild/utils';
import { maxWorkers } from '../../utils/environment-options';
import { loadTranslations } from '../../utils/i18n-options';
import { createTranslationLoader } from '../../utils/load-translations';
import { prerenderPages } from '../../utils/server-rendering/prerender';
import { augmentAppWithServiceWorkerEsbuild } from '../../utils/service-worker';
import { urlJoin } from '../../utils/url';
import { NormalizedApplicationBuildOptions } from './options';

/**
 * Inlines all active locales as specified by the application build options into all
 * application JavaScript files created during the build.
 * @param options The normalized application builder options used to create the build.
 * @param executionResult The result of an executed build.
 * @param initialFiles A map containing initial file information for the executed build.
 */
export async function inlineI18n(
  options: NormalizedApplicationBuildOptions,
  executionResult: ExecutionResult,
  initialFiles: Map<string, InitialFileRecord>,
): Promise<{ errors: string[]; warnings: string[] }> {
  // Create the multi-threaded inliner with common options and the files generated from the build.
  const inliner = new I18nInliner(
    {
      missingTranslation: options.i18nOptions.missingTranslationBehavior ?? 'warning',
      outputFiles: executionResult.outputFiles,
      shouldOptimize: options.optimizationOptions.scripts,
    },
    maxWorkers,
  );

  const inlineResult: { errors: string[]; warnings: string[] } = {
    errors: [],
    warnings: [],
  };

  // For each active locale, use the inliner to process the output files of the build.
  const updatedOutputFiles = [];
  const updatedAssetFiles = [];
  try {
    for (const locale of options.i18nOptions.inlineLocales) {
      // A locale specific set of files is returned from the inliner.
      const localeOutputFiles = await inliner.inlineForLocale(
        locale,
        options.i18nOptions.locales[locale].translation,
      );

      const baseHref =
        getLocaleBaseHref(options.baseHref, options.i18nOptions, locale) ?? options.baseHref;

      // Generate locale specific index HTML files
      if (options.indexHtmlOptions) {
        const { content, contentWithoutCriticalCssInlined, errors, warnings } =
          await generateIndexHtml(
            initialFiles,
            localeOutputFiles,
            {
              ...options,
              baseHref,
            },
            locale,
          );

        localeOutputFiles.push(
          createOutputFileFromText(
            options.indexHtmlOptions.output,
            content,
            BuildOutputFileType.Browser,
          ),
        );
        inlineResult.errors.push(...errors);
        inlineResult.warnings.push(...warnings);

        // Pre-render (SSG) and App-shell
        if (options.prerenderOptions || options.appShellOptions) {
          const { output, warnings, errors } = await prerenderPages(
            options.workspaceRoot,
            options.appShellOptions,
            options.prerenderOptions,
            localeOutputFiles,
            contentWithoutCriticalCssInlined,
            options.optimizationOptions.styles.inlineCritical,
            maxWorkers,
            options.verbose,
          );

          inlineResult.errors.push(...errors);
          inlineResult.warnings.push(...warnings);

          for (const [path, content] of Object.entries(output)) {
            localeOutputFiles.push(
              createOutputFileFromText(path, content, BuildOutputFileType.Browser),
            );
          }
        }
      }

      if (options.serviceWorker) {
        try {
          const serviceWorkerResult = await augmentAppWithServiceWorkerEsbuild(
            options.workspaceRoot,
            options.serviceWorker,
            baseHref || '/',
            localeOutputFiles,
            executionResult.assetFiles,
          );
          localeOutputFiles.push(
            createOutputFileFromText(
              'ngsw.json',
              serviceWorkerResult.manifest,
              BuildOutputFileType.Browser,
            ),
          );
          executionResult.assetFiles.push(...serviceWorkerResult.assetFiles);
        } catch (error) {
          inlineResult.errors.push(error instanceof Error ? error.message : `${error}`);
        }
      }

      // Update directory with locale base
      if (options.i18nOptions.flatOutput !== true) {
        localeOutputFiles.forEach((file) => {
          file.path = join(locale, file.path);
        });

        for (const assetFile of executionResult.assetFiles) {
          updatedAssetFiles.push({
            source: assetFile.source,
            destination: join(locale, assetFile.destination),
          });
        }
      }

      updatedOutputFiles.push(...localeOutputFiles);
    }
  } finally {
    await inliner.close();
  }

  // Update the result with all localized files
  executionResult.outputFiles = updatedOutputFiles;

  // Assets are only changed if not using the flat output option
  if (options.i18nOptions.flatOutput !== true) {
    executionResult.assetFiles = updatedAssetFiles;
  }

  return inlineResult;
}

function getLocaleBaseHref(
  baseHref: string | undefined,
  i18n: NormalizedApplicationBuildOptions['i18nOptions'],
  locale: string,
): string | undefined {
  if (i18n.flatOutput) {
    return undefined;
  }

  if (i18n.locales[locale] && i18n.locales[locale].baseHref !== '') {
    return urlJoin(baseHref || '', i18n.locales[locale].baseHref ?? `/${locale}/`);
  }

  return undefined;
}

/**
 * Loads all active translations using the translation loaders from the `@angular/localize` package.
 * @param context The architect builder context for the current build.
 * @param i18n The normalized i18n options to use.
 */
export async function loadActiveTranslations(
  context: BuilderContext,
  i18n: NormalizedApplicationBuildOptions['i18nOptions'],
) {
  // Load locale data and translations (if present)
  let loader;
  for (const [locale, desc] of Object.entries(i18n.locales)) {
    if (!i18n.inlineLocales.has(locale) && locale !== i18n.sourceLocale) {
      continue;
    }

    if (!desc.files.length) {
      continue;
    }

    loader ??= await createTranslationLoader();

    loadTranslations(
      locale,
      desc,
      context.workspaceRoot,
      loader,
      {
        warn(message) {
          context.logger.warn(message);
        },
        error(message) {
          throw new Error(message);
        },
      },
      undefined,
      i18n.duplicateTranslationBehavior,
    );
  }
}
