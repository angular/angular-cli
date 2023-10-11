/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext } from '@angular-devkit/architect';
import { join } from 'node:path';
import { InitialFileRecord } from '../../tools/esbuild/bundler-context';
import { ExecutionResult } from '../../tools/esbuild/bundler-execution-result';
import { I18nInliner } from '../../tools/esbuild/i18n-inliner';
import { maxWorkers } from '../../utils/environment-options';
import { loadTranslations } from '../../utils/i18n-options';
import { createTranslationLoader } from '../../utils/load-translations';
import { urlJoin } from '../../utils/url';
import { executePostBundleSteps } from './execute-post-bundle';
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

      const { errors, warnings, additionalAssets, additionalOutputFiles } =
        await executePostBundleSteps(
          {
            ...options,
            baseHref,
          },
          localeOutputFiles,
          executionResult.assetFiles,
          initialFiles,
          locale,
        );

      localeOutputFiles.push(...additionalOutputFiles);
      inlineResult.errors.push(...errors);
      inlineResult.warnings.push(...warnings);

      // Update directory with locale base
      if (options.i18nOptions.flatOutput !== true) {
        localeOutputFiles.forEach((file) => {
          file.path = join(locale, file.path);
        });

        for (const assetFile of [...executionResult.assetFiles, ...additionalAssets]) {
          updatedAssetFiles.push({
            source: assetFile.source,
            destination: join(locale, assetFile.destination),
          });
        }
      } else {
        executionResult.assetFiles.push(...additionalAssets);
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
