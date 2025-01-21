/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import path from 'node:path';
import type { TranslationLoader } from './load-translations';

export interface LocaleDescription {
  files: {
    path: string;
    integrity?: string;
    format?: string;
  }[];
  translation?: Record<string, unknown>;
  dataPath?: string;
  baseHref?: string;
  subPath: string;
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
    return option;
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
    throw new Error(`Project field '${name}' is malformed. Expected an object.`);
  }
}

function ensureString(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(`Project field '${name}' is malformed. Expected a string.`);
  }
}

function ensureValidSubPath(value: unknown, name: string): asserts value is string {
  ensureString(value, name);

  if (!/^[\w-]*$/.test(value)) {
    throw new Error(
      `Project field '${name}' is invalid. It can only contain letters, numbers, hyphens, and underscores.`,
    );
  }
}
export function createI18nOptions(
  projectMetadata: { i18n?: unknown },
  inline?: boolean | string[],
  logger?: {
    warn(message: string): void;
  },
): I18nOptions {
  const { i18n: metadata = {} } = projectMetadata;

  ensureObject(metadata, 'i18n');

  const i18n: I18nOptions = {
    inlineLocales: new Set<string>(),
    // en-US is the default locale added to Angular applications (https://angular.dev/guide/i18n/format-data-locale)
    sourceLocale: 'en-US',
    locales: {},
    get shouldInline() {
      return this.inlineLocales.size > 0;
    },
  };

  let rawSourceLocale: string | undefined;
  let rawSourceLocaleBaseHref: string | undefined;
  let rawsubPath: string | undefined;
  if (typeof metadata.sourceLocale === 'string') {
    rawSourceLocale = metadata.sourceLocale;
  } else if (metadata.sourceLocale !== undefined) {
    ensureObject(metadata.sourceLocale, 'i18n.sourceLocale');

    if (metadata.sourceLocale.code !== undefined) {
      ensureString(metadata.sourceLocale.code, 'i18n.sourceLocale.code');
      rawSourceLocale = metadata.sourceLocale.code;
    }

    if (metadata.sourceLocale.baseHref !== undefined) {
      ensureString(metadata.sourceLocale.baseHref, 'i18n.sourceLocale.baseHref');
      logger?.warn(
        `The 'baseHref' field under 'i18n.sourceLocale' is deprecated and will be removed in future versions. ` +
          `Please use 'subPath' instead.\nNote: 'subPath' defines the URL segment for the locale, acting ` +
          `as both the HTML base HREF and the directory name for output.\nBy default, ` +
          `if not specified, 'subPath' uses the locale code.`,
      );

      rawSourceLocaleBaseHref = metadata.sourceLocale.baseHref;
    }

    if (metadata.sourceLocale.subPath !== undefined) {
      ensureValidSubPath(metadata.sourceLocale.subPath, 'i18n.sourceLocale.subPath');
      rawsubPath = metadata.sourceLocale.subPath;
    }

    if (rawsubPath !== undefined && rawSourceLocaleBaseHref !== undefined) {
      throw new Error(
        `'i18n.sourceLocale.subPath' and 'i18n.sourceLocale.baseHref' cannot be used together.`,
      );
    }
  }

  if (rawSourceLocale !== undefined) {
    i18n.sourceLocale = rawSourceLocale;
    i18n.hasDefinedSourceLocale = true;
  }

  i18n.locales[i18n.sourceLocale] = {
    files: [],
    baseHref: rawSourceLocaleBaseHref,
    subPath: rawsubPath ?? i18n.sourceLocale,
  };

  if (metadata.locales !== undefined) {
    ensureObject(metadata.locales, 'i18n locales');

    for (const [locale, options] of Object.entries(metadata.locales)) {
      let translationFiles: string[] | undefined;
      let baseHref: string | undefined;
      let subPath: string | undefined;

      if (options && typeof options === 'object' && 'translation' in options) {
        translationFiles = normalizeTranslationFileOption(options.translation, locale, false);

        if ('baseHref' in options) {
          ensureString(options.baseHref, `i18n.locales.${locale}.baseHref`);
          logger?.warn(
            `The 'baseHref' field under 'i18n.locales.${locale}' is deprecated and will be removed in future versions. ` +
              `Please use 'subPath' instead.\nNote: 'subPath' defines the URL segment for the locale, acting ` +
              `as both the HTML base HREF and the directory name for output.\nBy default, ` +
              `if not specified, 'subPath' uses the locale code.`,
          );
          baseHref = options.baseHref;
        }

        if ('subPath' in options) {
          ensureValidSubPath(options.subPath, `i18n.locales.${locale}.subPath`);
          subPath = options.subPath;
        }

        if (subPath !== undefined && baseHref !== undefined) {
          throw new Error(
            `'i18n.locales.${locale}.subPath' and 'i18n.locales.${locale}.baseHref' cannot be used together.`,
          );
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
        subPath: subPath ?? locale,
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

  // Check that subPaths are unique only the locales that we are inlining.
  const localesData = Object.entries(i18n.locales).filter(([locale]) =>
    i18n.inlineLocales.has(locale),
  );

  for (let i = 0; i < localesData.length; i++) {
    const [localeA, { subPath: subPathA }] = localesData[i];

    for (let j = i + 1; j < localesData.length; j++) {
      const [localeB, { subPath: subPathB }] = localesData[j];

      if (subPathA === subPathB) {
        throw new Error(
          `Invalid i18n configuration: Locales '${localeA}' and '${localeB}' cannot have the same subPath: '${subPathB}'.`,
        );
      }
    }
  }

  return i18n;
}

export function loadTranslations(
  locale: string,
  desc: LocaleDescription,
  workspaceRoot: string,
  loader: TranslationLoader,
  logger: { warn: (message: string) => void; error: (message: string) => void },
  usedFormats?: Set<string>,
  duplicateTranslation?: 'ignore' | 'error' | 'warning',
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
            case 'ignore':
              break;
            case 'error':
              logger.error(`ERROR ${duplicateTranslationMessage}`);
              break;
            case 'warning':
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
