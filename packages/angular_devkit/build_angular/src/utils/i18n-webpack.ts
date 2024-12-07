/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  type I18nOptions,
  createI18nOptions,
  createTranslationLoader,
  loadTranslations,
} from '@angular/build/private';
import { BuilderContext } from '@angular-devkit/architect';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { Schema as BrowserBuilderSchema } from '../builders/browser/schema';
import { Schema as ServerBuilderSchema } from '../builders/server/schema';
import { readTsconfig } from '../utils/read-tsconfig';

/**
 * The base module location used to search for locale specific data.
 */
const LOCALE_DATA_BASE_MODULE = '@angular/common/locales/global';

// Re-export for use within Webpack related builders
export { I18nOptions, loadTranslations };

export async function configureI18nBuild<T extends BrowserBuilderSchema | ServerBuilderSchema>(
  context: BuilderContext,
  options: T,
): Promise<{
  buildOptions: T;
  i18n: I18nOptions;
}> {
  if (!context.target) {
    throw new Error('The builder requires a target.');
  }

  const buildOptions = { ...options };
  const tsConfig = await readTsconfig(buildOptions.tsConfig, context.workspaceRoot);
  const metadata = await context.getProjectMetadata(context.target);
  const i18n = createI18nOptions(metadata, buildOptions.localize, context.logger);

  // No additional processing needed if no inlining requested and no source locale defined.
  if (!i18n.shouldInline && !i18n.hasDefinedSourceLocale) {
    return { buildOptions, i18n };
  }

  const projectRoot = path.join(context.workspaceRoot, (metadata.root as string) || '');
  // The trailing slash is required to signal that the path is a directory and not a file.
  const projectRequire = createRequire(projectRoot + '/');
  const localeResolver = (locale: string) =>
    projectRequire.resolve(path.join(LOCALE_DATA_BASE_MODULE, locale));

  // Load locale data and translations (if present)
  let loader;
  const usedFormats = new Set<string>();
  for (const [locale, desc] of Object.entries(i18n.locales)) {
    if (!i18n.inlineLocales.has(locale) && locale !== i18n.sourceLocale) {
      continue;
    }

    let localeDataPath = findLocaleDataPath(locale, localeResolver);
    if (!localeDataPath) {
      const [first] = locale.split('-');
      if (first) {
        localeDataPath = findLocaleDataPath(first.toLowerCase(), localeResolver);
        if (localeDataPath) {
          context.logger.warn(
            `Locale data for '${locale}' cannot be found. Using locale data for '${first}'.`,
          );
        }
      }
    }
    if (!localeDataPath) {
      context.logger.warn(
        `Locale data for '${locale}' cannot be found. No locale data will be included for this locale.`,
      );
    } else {
      desc.dataPath = localeDataPath;
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
      usedFormats,
      buildOptions.i18nDuplicateTranslation,
    );

    if (usedFormats.size > 1 && tsConfig.options.enableI18nLegacyMessageIdFormat !== false) {
      // This limitation is only for legacy message id support (defaults to true as of 9.0)
      throw new Error(
        'Localization currently only supports using one type of translation file format for the entire application.',
      );
    }
  }

  // If inlining store the output in a temporary location to facilitate post-processing
  if (i18n.shouldInline) {
    // TODO: we should likely save these in the .angular directory in the next major version.
    // We'd need to do a migration to add the temp directory to gitignore.
    const tempPath = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'angular-cli-i18n-'));
    buildOptions.outputPath = tempPath;

    process.on('exit', () => {
      try {
        fs.rmSync(tempPath, { force: true, recursive: true, maxRetries: 3 });
      } catch {}
    });
  }

  return { buildOptions, i18n };
}

function findLocaleDataPath(locale: string, resolver: (locale: string) => string): string | null {
  // Remove private use subtags
  const scrubbedLocale = locale.replace(/-x(-[a-zA-Z0-9]{1,8})+$/, '');

  try {
    return resolver(scrubbedLocale);
  } catch {
    // fallback to known existing en-US locale data as of 14.0
    return scrubbedLocale === 'en-US' ? findLocaleDataPath('en', resolver) : null;
  }
}
