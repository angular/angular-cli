/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderContext } from '@angular-devkit/architect';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { Schema as BrowserBuilderSchema, I18NTranslation } from '../builders/browser/schema';
import { Schema as ServerBuilderSchema } from '../builders/server/schema';
import { readTsconfig } from '../utils/read-tsconfig';
import { TranslationLoader, createTranslationLoader } from './load-translations';

/**
 * The base module location used to search for locale specific data.
 */
const LOCALE_DATA_BASE_MODULE = '@angular/common/locales/global';

export interface LocaleDescription {
  files: {
    path: string;
    integrity?: string;
    format?: string;
  }[];
  translation?: Record<string, unknown>;
  dataPath?: string;
  baseHref?: string;
}

export interface I18nOptions {
  inlineLocales: Set<string>;
  sourceLocale: string;
  locales: Record<string, LocaleDescription>;
  flatOutput?: boolean;
  readonly shouldInline: boolean;
  hasDefinedSourceLocale?: boolean;
}

function normalizeTranslationFileOption(
  option: unknown,
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

function ensureObject(value: unknown, name: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Project ${name} field is malformed. Expected an object.`);
  }
}

function ensureString(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(`Project ${name} field is malformed. Expected a string.`);
  }
}

export function createI18nOptions(
  projectMetadata: { i18n?: unknown },
  inline?: boolean | string[],
): I18nOptions {
  const { i18n: metadata = {} } = projectMetadata;

  ensureObject(metadata, 'i18n');

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
  if (typeof metadata.sourceLocale === 'string') {
    rawSourceLocale = metadata.sourceLocale;
  } else if (metadata.sourceLocale !== undefined) {
    ensureObject(metadata.sourceLocale, 'i18n sourceLocale');

    if (metadata.sourceLocale.code !== undefined) {
      ensureString(metadata.sourceLocale.code, 'i18n sourceLocale code');
      rawSourceLocale = metadata.sourceLocale.code;
    }

    if (metadata.sourceLocale.baseHref !== undefined) {
      ensureString(metadata.sourceLocale.baseHref, 'i18n sourceLocale baseHref');
      rawSourceLocaleBaseHref = metadata.sourceLocale.baseHref;
    }
  }

  if (rawSourceLocale !== undefined) {
    i18n.sourceLocale = rawSourceLocale;
    i18n.hasDefinedSourceLocale = true;
  }

  i18n.locales[i18n.sourceLocale] = {
    files: [],
    baseHref: rawSourceLocaleBaseHref,
  };

  if (metadata.locales !== undefined) {
    ensureObject(metadata.locales, 'i18n locales');

    for (const [locale, options] of Object.entries(metadata.locales)) {
      let translationFiles;
      let baseHref;
      if (options && typeof options === 'object' && 'translation' in options) {
        translationFiles = normalizeTranslationFileOption(options.translation, locale, false);

        if ('baseHref' in options) {
          ensureString(options.baseHref, `i18n locales ${locale} baseHref`);
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

export function loadTranslations(
  locale: string,
  desc: LocaleDescription,
  workspaceRoot: string,
  loader: TranslationLoader,
  logger: { warn: (message: string) => void; error: (message: string) => void },
  usedFormats?: Set<string>,
  duplicateTranslation?: I18NTranslation,
) {
  let translations: Record<string, unknown> | undefined = undefined;
  for (const file of desc.files) {
    const loadResult = loader(path.join(workspaceRoot, file.path));

    for (const diagnostics of loadResult.diagnostics.messages) {
      if (diagnostics.type === 'error') {
        logger.error(`Error parsing translation file '${file.path}': ${diagnostics.message}`);
      } else {
        logger.warn(`WARNING [${file.path}]: ${diagnostics.message}`);
      }
    }

    if (loadResult.locale !== undefined && loadResult.locale !== locale) {
      logger.warn(
        `WARNING [${file.path}]: File target locale ('${loadResult.locale}') does not match configured locale ('${locale}')`,
      );
    }

    usedFormats?.add(loadResult.format);
    file.format = loadResult.format;
    file.integrity = loadResult.integrity;

    if (translations) {
      // Merge translations
      for (const [id, message] of Object.entries(loadResult.translations)) {
        if (translations[id] !== undefined) {
          const duplicateTranslationMessage = `[${file.path}]: Duplicate translations for message '${id}' when merging.`;
          switch (duplicateTranslation) {
            case I18NTranslation.Ignore:
              break;
            case I18NTranslation.Error:
              logger.error(`ERROR ${duplicateTranslationMessage}`);
              break;
            case I18NTranslation.Warning:
            default:
              logger.warn(`WARNING ${duplicateTranslationMessage}`);
              break;
          }
        }
        translations[id] = message;
      }
    } else {
      // First or only translation file
      translations = loadResult.translations;
    }
  }
  desc.translation = translations;
}
