/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BuilderContext } from '@angular-devkit/architect';
import { json } from '@angular-devkit/core';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as rimraf from 'rimraf';
import { readTsconfig } from '../angular-cli-files/utilities/read-tsconfig';
import { Schema as BrowserBuilderSchema } from '../browser/schema';
import { Schema as ServerBuilderSchema } from '../server/schema';
import { createTranslationLoader } from './load-translations';

export interface I18nOptions {
  inlineLocales: Set<string>;
  sourceLocale: string;
  locales: Record<
    string,
    {
      file: string;
      format?: string;
      translation?: unknown;
      dataPath?: string;
      integrity?: string;
      baseHref?: string;
    }
  >;
  flatOutput?: boolean;
  readonly shouldInline: boolean;
  veCompatLocale?: string;
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
    if (metadata.sourceLocale.baseHref !== undefined && typeof metadata.sourceLocale.baseHref !== 'string') {
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
  }

  i18n.locales[i18n.sourceLocale] = {
    file: '',
    baseHref: rawSourceLocaleBaseHref,
  };

  if (metadata.locales !== undefined && !json.isJsonObject(metadata.locales)) {
    throw new Error('Project i18n locales field is malformed. Expected an object.');
  } else if (metadata.locales) {
    for (const [locale, options] of Object.entries(metadata.locales)) {
      let translationFile;
      let baseHref;
      if (json.isJsonObject(options)) {
        if (typeof options.translation !== 'string') {
          throw new Error(
            `Project i18n locales translation field value for '${locale}' is malformed. Expected a string.`,
          );
        }
        translationFile = options.translation;
        if (typeof options.baseHref === 'string') {
          baseHref = options.baseHref;
        }
      } else if (typeof options !== 'string') {
        throw new Error(
          `Project i18n locales field value for '${locale}' is malformed. Expected a string or object.`,
        );
      } else {
        translationFile = options;
      }

      if (locale === i18n.sourceLocale) {
        throw new Error(
          `An i18n locale ('${locale}') cannot both be a source locale and provide a translation.`,
        );
      }

      i18n.locales[locale] = {
        file: translationFile,
        baseHref,
      };
    }
  }

  if (inline === true) {
    i18n.inlineLocales.add(i18n.sourceLocale);
    Object.keys(i18n.locales).forEach(locale => i18n.inlineLocales.add(locale));
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
  const tsConfig = readTsconfig(buildOptions.tsConfig, context.workspaceRoot);
  const usingIvy = tsConfig.options.enableIvy !== false;
  const metadata = await context.getProjectMetadata(context.target);
  const i18n = createI18nOptions(metadata, buildOptions.localize);

  // Until 11.0, support deprecated i18n options when not using new localize option
  // i18nFormat is automatically calculated
  if (buildOptions.localize === undefined && usingIvy) {
    mergeDeprecatedI18nOptions(i18n, buildOptions.i18nLocale, buildOptions.i18nFile);
  } else if (buildOptions.localize !== undefined && !usingIvy) {
    if (
      buildOptions.localize === true ||
      (Array.isArray(buildOptions.localize) && buildOptions.localize.length > 1)
    ) {
      throw new Error(
        `Localization with multiple locales in one build is not supported with View Engine.`,
      );
    }

    for (const deprecatedOption of ['i18nLocale', 'i18nFormat', 'i18nFile']) {
      // tslint:disable-next-line: no-any
      if (typeof (buildOptions as any)[deprecatedOption] !== 'undefined') {
        context.logger.warn(
          `Option 'localize' and deprecated '${deprecatedOption}' found.  Using 'localize'.`,
        );
      }
    }

    if (
      buildOptions.localize === false ||
      (Array.isArray(buildOptions.localize) && buildOptions.localize.length === 0)
    ) {
      buildOptions.i18nFile = undefined;
      buildOptions.i18nLocale = undefined;
      buildOptions.i18nFormat = undefined;
    }
  }

  // Clear deprecated options when using Ivy to prevent unintended behavior
  if (usingIvy) {
    buildOptions.i18nFile = undefined;
    buildOptions.i18nFormat = undefined;
    buildOptions.i18nLocale = undefined;
  }

  if (i18n.inlineLocales.size > 0) {
    const projectRoot = path.join(context.workspaceRoot, (metadata.root as string) || '');
    const localeDataBasePath = findLocaleDataBasePath(projectRoot);
    if (!localeDataBasePath) {
      throw new Error(
        `Unable to find locale data within '@angular/common'. Please ensure '@angular/common' is installed.`,
      );
    }

    // Load locales
    const loader = await createTranslationLoader();
    const usedFormats = new Set<string>();
    for (const [locale, desc] of Object.entries(i18n.locales)) {
      if (!i18n.inlineLocales.has(locale)) {
        continue;
      }

      let localeDataPath = findLocaleDataPath(locale, localeDataBasePath);
      if (!localeDataPath) {
        const [first] = locale.split('-');
        if (first) {
          localeDataPath = findLocaleDataPath(first.toLowerCase(), localeDataBasePath);
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

      if (!desc.file) {
        continue;
      }

      const result = loader(path.join(context.workspaceRoot, desc.file));

      for (const diagnostics of result.diagnostics.messages) {
        if (diagnostics.type === 'error') {
          throw new Error(
            `Error parsing translation file '${desc.file}': ${diagnostics.message}`,
          );
        } else {
          context.logger.warn(`WARNING [${desc.file}]: ${diagnostics.message}`);
        }
      }

      usedFormats.add(result.format);
      if (usedFormats.size > 1 && tsConfig.options.enableI18nLegacyMessageIdFormat !== false) {
        // This limitation is only for legacy message id support (defaults to true as of 9.0)
        throw new Error(
          'Localization currently only supports using one type of translation file format for the entire application.',
        );
      }

      desc.format = result.format;
      desc.translation = result.translation;
      desc.integrity = result.integrity;
    }

    // Legacy message id's require the format of the translations
    if (usedFormats.size > 0) {
      buildOptions.i18nFormat = [...usedFormats][0];
    }

    // Provide support for using the Ivy i18n options with VE
    if (!usingIvy) {
      i18n.veCompatLocale = buildOptions.i18nLocale = [...i18n.inlineLocales][0];

      if (buildOptions.i18nLocale !== i18n.sourceLocale) {
        buildOptions.i18nFile = i18n.locales[buildOptions.i18nLocale].file;
      }

      // Clear inline locales to prevent any new i18n related processing
      i18n.inlineLocales.clear();

      // Update the output path to include the locale to mimic Ivy localize behavior
      buildOptions.outputPath = path.join(buildOptions.outputPath, buildOptions.i18nLocale);
    }
  }

  // If inlining store the output in a temporary location to facilitate post-processing
  if (i18n.shouldInline) {
    const tempPath = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'angular-cli-i18n-'));
    buildOptions.outputPath = tempPath;

    // Remove temporary directory used for i18n processing
    process.on('exit', () => {
      try {
        rimraf.sync(tempPath);
      } catch {}
    });
  }

  return { buildOptions, i18n };
}

function mergeDeprecatedI18nOptions(
  i18n: I18nOptions,
  i18nLocale: string | undefined,
  i18nFile: string | undefined,
): I18nOptions {
  if (i18nFile !== undefined && i18nLocale === undefined) {
    throw new Error(`Option 'i18nFile' cannot be used without the 'i18nLocale' option.`);
  }

  if (i18nLocale !== undefined) {
    i18n.inlineLocales.clear();
    i18n.inlineLocales.add(i18nLocale);

    if (i18nFile !== undefined) {
      i18n.locales[i18nLocale] = { file: i18nFile, baseHref: '' };
    } else {
      // If no file, treat the locale as the source locale
      // This mimics deprecated behavior
      i18n.sourceLocale = i18nLocale;
      i18n.locales[i18nLocale] = { file: '', baseHref: '' };
    }

    i18n.flatOutput = true;
  }

  return i18n;
}

function findLocaleDataBasePath(projectRoot: string): string | null {
  try {
    const commonPath = path.dirname(
      require.resolve('@angular/common/package.json', { paths: [projectRoot] }),
    );
    const localesPath = path.join(commonPath, 'locales/global');

    if (!fs.existsSync(localesPath)) {
      return null;
    }

    return localesPath;
  } catch {
    return null;
  }
}

function findLocaleDataPath(locale: string, basePath: string): string | null {
  // Remove private use subtags
  const scrubbedLocale = locale.replace(/-x(-[a-zA-Z0-9]{1,8})+$/, '');

  const localeDataPath = path.join(basePath, scrubbedLocale + '.js');

  if (!fs.existsSync(localeDataPath)) {
    if (scrubbedLocale === 'en-US') {
      // fallback to known existing en-US locale data as of 9.0
      return findLocaleDataPath('en-US-POSIX', basePath);
    }

    return null;
  }

  return localeDataPath;
}
