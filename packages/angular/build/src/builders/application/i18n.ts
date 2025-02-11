/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { BuilderContext } from '@angular-devkit/architect';
import type { Metafile } from 'esbuild';
import { join } from 'node:path';
import { BuildOutputFileType, InitialFileRecord } from '../../tools/esbuild/bundler-context';
import {
  ExecutionResult,
  PrerenderedRoutesRecord,
} from '../../tools/esbuild/bundler-execution-result';
import { I18nInliner } from '../../tools/esbuild/i18n-inliner';
import { maxWorkers } from '../../utils/environment-options';
import { loadTranslations } from '../../utils/i18n-options';
import { createTranslationLoader } from '../../utils/load-translations';
import { executePostBundleSteps } from './execute-post-bundle';
import { NormalizedApplicationBuildOptions, getLocaleBaseHref } from './options';

/**
 * Inlines all active locales as specified by the application build options into all
 * application JavaScript files created during the build.
 * @param metafile An esbuild metafile object.
 * @param options The normalized application builder options used to create the build.
 * @param executionResult The result of an executed build.
 * @param initialFiles A map containing initial file information for the executed build.
 */
export async function inlineI18n(
  metafile: Metafile,
  options: NormalizedApplicationBuildOptions,
  executionResult: ExecutionResult,
  initialFiles: Map<string, InitialFileRecord>,
): Promise<{
  errors: string[];
  warnings: string[];
  prerenderedRoutes: PrerenderedRoutesRecord;
}> {
  const { i18nOptions, optimizationOptions, baseHref, cacheOptions } = options;

  // Create the multi-threaded inliner with common options and the files generated from the build.
  const inliner = new I18nInliner(
    {
      missingTranslation: i18nOptions.missingTranslationBehavior ?? 'warning',
      outputFiles: executionResult.outputFiles,
      shouldOptimize: optimizationOptions.scripts,
      persistentCachePath: cacheOptions.enabled ? cacheOptions.path : undefined,
    },
    maxWorkers,
  );

  const inlineResult: {
    errors: string[];
    warnings: string[];
    prerenderedRoutes: PrerenderedRoutesRecord;
  } = {
    errors: [],
    warnings: [],
    prerenderedRoutes: {},
  };

  // For each active locale, use the inliner to process the output files of the build.
  const updatedOutputFiles = [];
  const updatedAssetFiles = [];
  // Root and SSR entry files are not modified.
  const unModifiedOutputFiles = executionResult.outputFiles.filter(
    ({ type }) => type === BuildOutputFileType.Root || type === BuildOutputFileType.ServerRoot,
  );

  try {
    for (const locale of i18nOptions.inlineLocales) {
      // A locale specific set of files is returned from the inliner.
      const localeInlineResult = await inliner.inlineForLocale(
        locale,
        i18nOptions.locales[locale].translation,
      );
      const localeOutputFiles = localeInlineResult.outputFiles;
      inlineResult.errors.push(...localeInlineResult.errors);
      inlineResult.warnings.push(...localeInlineResult.warnings);

      const {
        errors,
        warnings,
        additionalAssets,
        additionalOutputFiles,
        prerenderedRoutes: generatedRoutes,
      } = await executePostBundleSteps(
        metafile,
        {
          ...options,
          baseHref: getLocaleBaseHref(baseHref, i18nOptions, locale) ?? baseHref,
        },
        [...unModifiedOutputFiles, ...localeOutputFiles],
        executionResult.assetFiles,
        initialFiles,
        locale,
      );

      localeOutputFiles.push(...additionalOutputFiles);
      inlineResult.errors.push(...errors);
      inlineResult.warnings.push(...warnings);

      // Update directory with locale base or subPath
      const subPath = i18nOptions.locales[locale].subPath;
      if (i18nOptions.flatOutput !== true) {
        localeOutputFiles.forEach((file) => {
          file.path = join(subPath, file.path);
        });

        for (const assetFile of [...executionResult.assetFiles, ...additionalAssets]) {
          updatedAssetFiles.push({
            source: assetFile.source,
            destination: join(subPath, assetFile.destination),
          });
        }
      } else {
        executionResult.assetFiles.push(...additionalAssets);
      }

      inlineResult.prerenderedRoutes = { ...inlineResult.prerenderedRoutes, ...generatedRoutes };
      updatedOutputFiles.push(...localeOutputFiles);
    }
  } finally {
    await inliner.close();
  }

  // Update the result with all localized files.
  executionResult.outputFiles = [
    // Root and SSR entry files are not modified.
    ...unModifiedOutputFiles,
    // Updated files for each locale.
    ...updatedOutputFiles,
  ];

  // Assets are only changed if not using the flat output option
  if (!i18nOptions.flatOutput) {
    executionResult.assetFiles = updatedAssetFiles;
  }

  return inlineResult;
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
