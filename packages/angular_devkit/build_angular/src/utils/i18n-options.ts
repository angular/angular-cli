/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext } from '@angular-devkit/architect';
import { json } from '@angular-devkit/core';
import fs from 'fs';
import module from 'module';
import os from 'os';
import path from 'path';
import { Schema as BrowserBuilderSchema } from '../builders/browser/schema';
import { Schema as ServerBuilderSchema } from '../builders/server/schema';
import { readTsconfig } from '../utils/read-tsconfig';
import { createTranslationLoader } from './load-translations';

/**
 * The base module location used to search for locale specific data.
 */
const LOCALE_DATA_BASE_MODULE = '@angular/common/locales/global';

export interface I18nOptions {
  inlineLocales: Set<string>;
  sourceLocale: string;
  locales: Record<
    string,
    {
      files: { path: string; integrity?: string; format?: string }[];
      translation?: Record<string, unknown>;
      dataPath?: string;
      baseHref?: string;
    }
  >;
  flatOutput?: boolean;
  readonly shouldInline: boolean;
  hasDefinedSourceLocale?: boolean;
}

function normalizeTranslationFileOption(
  option: json.JsonValue,
  locale: string,
  expectObjectInError: boolean,
): string[] {
  if (typeof option === 'string') {
    return [option];
  }

  if (Array.isArray(option) && option.every((element) => typeof element === 'string')) {
    return option as string[];
  }

  let errorMessage = `Project i18n locales translation field value for '${locale}' is malformed. `;
  if (expectObjectInError) {
    errorMessage += 'Expected a string, array of strings, or object.';
  } else {
    errorMessage += 'Expected a string or array of strings.';
  }

  throw new Error(errorMessage);
}

export function createI18nOptions(
  metadata: json.JsonObject,
  inline?: boolean | string[],
): I18nOptions {
  if (metadata.i18n !== undefined && !json.isJsonObject(metadata.i18n)) {
    throw new Error('Project i18n field is malformed. Expected an object.');
  }
  metadata = metadata.i18n || {};

  const i18n: I18nOptions = {
    inlineLocales: new Set<string>(),
    // en-US is the default locale added to Angular applications (https://angular.io/guide/i18n#i18n-pipes)
    sourceLocale: 'en-US',
    locales: {},
    get shouldInline() {
      return this.inlineLocales.size > 0;
    },
  };

  let rawSourceLocale;
  let rawSourceLocaleBaseHref;
  if (json.isJsonObject(metadata.sourceLocale)) {
    rawSourceLocale = metadata.sourceLocale.code;
    if (
      metadata.sourceLocale.baseHref !== undefined &&
      typeof metadata.sourceLocale.baseHref !== 'string'
    ) {
      throw new Error('Project i18n sourceLocale baseHref field is malformed. Expected a string.');
    }
    rawSourceLocaleBaseHref = metadata.sourceLocale.baseHref;
  } else {
    rawSourceLocale = metadata.sourceLocale;
  }

  if (rawSourceLocale !== undefined) {
    if (typeof rawSourceLocale !== 'string') {
      throw new Error('Project i18n sourceLocale field is malformed. Expected a string.');
    }

    i18n.sourceLocale = rawSourceLocale;
    i18n.hasDefinedSourceLocale = true;
  }

  i18n.locales[i18n.sourceLocale] = {
    files: [],
    baseHref: rawSourceLocaleBaseHref,
  };

  if (metadata.locales !== undefined && !json.isJsonObject(metadata.locales)) {
    throw new Error('Project i18n locales field is malformed. Expected an object.');
  } else if (metadata.locales) {
    for (const [locale, options] of Object.entries(metadata.locales)) {
      let translationFiles;
      let baseHref;
      if (json.isJsonObject(options)) {
        translationFiles = normalizeTranslationFileOption(options.translation, locale, false);

        if (typeof options.baseHref === 'string') {
          baseHref = options.baseHref;
        }
      } else {
        translationFiles = normalizeTranslationFileOption(options, locale, true);
      }

      if (locale === i18n.sourceLocale) {
        throw new Error(
          `An i18n locale ('${locale}') cannot both be a source locale and provide a translation.`,
        );
      }

      i18n.locales[locale] = {
        files: translationFiles.map((file) => ({ path: file })),
        baseHref,
      };
    }
  }

  if (inline === true) {
    i18n.inlineLocales.add(i18n.sourceLocale);
    Object.keys(i18n.locales).forEach((locale) => i18n.inlineLocales.add(locale));
  } else if (inline) {
    for (const locale of inline) {
      if (!i18n.locales[locale] && i18n.sourceLocale !== locale) {
        throw new Error(`Requested locale '${locale}' is not defined for the project.`);
      }

      i18n.inlineLocales.add(locale);
    }
  }

  return i18n;
}

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
  const i18n = createI18nOptions(metadata, buildOptions.localize);

  // No additional processing needed if no inlining requested and no source locale defined.
  if (!i18n.shouldInline && !i18n.hasDefinedSourceLocale) {
    return { buildOptions, i18n };
  }

  const projectRoot = path.join(context.workspaceRoot, (metadata.root as string) || '');
  // The trailing slash is required to signal that the path is a directory and not a file.
  const projectRequire = module.createRequire(projectRoot + '/');
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
            `Locale data for '${locale}' cannot be found.  Using locale data for '${first}'.`,
          );
        }
      }
    }
    if (!localeDataPath) {
      context.logger.warn(
        `Locale data for '${locale}' cannot be found.  No locale data will be included for this locale.`,
      );
    } else {
      desc.dataPath = localeDataPath;
    }

    if (!desc.files.length) {
      continue;
    }

    if (!loader) {
      loader = await createTranslationLoader();
    }

    for (const file of desc.files) {
      const loadResult = loader(path.join(context.workspaceRoot, file.path));

      for (const diagnostics of loadResult.diagnostics.messages) {
        if (diagnostics.type === 'error') {
          throw new Error(`Error parsing translation file '${file.path}': ${diagnostics.message}`);
        } else {
          context.logger.warn(`WARNING [${file.path}]: ${diagnostics.message}`);
        }
      }

      if (loadResult.locale !== undefined && loadResult.locale !== locale) {
        context.logger.warn(
          `WARNING [${file.path}]: File target locale ('${loadResult.locale}') does not match configured locale ('${locale}')`,
        );
      }

      usedFormats.add(loadResult.format);
      if (usedFormats.size > 1 && tsConfig.options.enableI18nLegacyMessageIdFormat !== false) {
        // This limitation is only for legacy message id support (defaults to true as of 9.0)
        throw new Error(
          'Localization currently only supports using one type of translation file format for the entire application.',
        );
      }

      file.format = loadResult.format;
      file.integrity = loadResult.integrity;

      if (desc.translation) {
        // Merge translations
        for (const [id, message] of Object.entries(loadResult.translations)) {
          if (desc.translation[id] !== undefined) {
            context.logger.warn(
              `WARNING [${file.path}]: Duplicate translations for message '${id}' when merging`,
            );
          }
          desc.translation[id] = message;
        }
      } else {
        // First or only translation file
        desc.translation = loadResult.translations;
      }
    }
  }

  // If inlining store the output in a temporary location to facilitate post-processing
  if (i18n.shouldInline) {
    const tempPath = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'angular-cli-i18n-'));
    buildOptions.outputPath = tempPath;

    // Remove temporary directory used for i18n processing
    process.on('exit', () => {
      try {
        fs.rmdirSync(tempPath, { recursive: true, maxRetries: 3 });
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
    if (scrubbedLocale === 'en-US') {
      // fallback to known existing en-US locale data as of 9.0
      return findLocaleDataPath('en-US-POSIX', resolver);
    }

    return null;
  }
}
