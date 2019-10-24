/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BuilderContext } from '@angular-devkit/architect';
import { json, virtualFs } from '@angular-devkit/core';
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
  locales: Record<string, { file: string; format?: string; translation?: unknown }>;
  flatOutput?: boolean;
  readonly shouldInline: boolean;
}

export function createI18nOptions(
  metadata: json.JsonObject,
  inline?: boolean | string[],
): I18nOptions {
  if (
    metadata.i18n !== undefined &&
    (typeof metadata.i18n !== 'object' || !metadata.i18n || Array.isArray(metadata.i18n))
  ) {
    throw new Error('Project i18n field is malformed. Expected an object.');
  }
  metadata = metadata.i18n || {};

  if (metadata.sourceLocale !== undefined && typeof metadata.sourceLocale !== 'string') {
    throw new Error('Project i18n sourceLocale field is malformed. Expected a string.');
  }

  const i18n: I18nOptions = {
    inlineLocales: new Set<string>(),
    // en-US is the default locale added to Angular applications (https://angular.io/guide/i18n#i18n-pipes)
    sourceLocale: metadata.sourceLocale || 'en-US',
    locales: {},
    get shouldInline() {
      return this.inlineLocales.size > 0;
    },
  };

  if (
    metadata.locales !== undefined &&
    (!metadata.locales || typeof metadata.locales !== 'object' || Array.isArray(metadata.locales))
  ) {
    throw new Error('Project i18n locales field is malformed. Expected an object.');
  } else if (metadata.locales) {
    for (const [locale, translationFile] of Object.entries(metadata.locales)) {
      if (typeof translationFile !== 'string') {
        throw new Error(
          `Project i18n locales field value for '${locale}' is malformed. Expected a string.`,
        );
      }

      if (locale === i18n.sourceLocale) {
        throw new Error(
          `An i18n locale identifier ('${locale}') cannot both be a source locale and provide a translation.`,
        );
      }

      i18n.locales[locale] = {
        file: translationFile,
      };
    }
  }

  if (inline === true) {
    i18n.inlineLocales.add(i18n.sourceLocale);
    Object.keys(i18n.locales).forEach(locale => i18n.inlineLocales.add(locale));
  } else if (inline) {
    for (const locale of inline) {
      if (!i18n.locales[locale]) {
        throw new Error(`Requested inline locale '${locale}' is not defined for the project.`);
      }

      i18n.inlineLocales.add(locale);
    }
  }

  return i18n;
}

export async function configureI18nBuild<T extends BrowserBuilderSchema | ServerBuilderSchema>(
  context: BuilderContext,
  host: virtualFs.Host<fs.Stats>,
  options: T,
): Promise<{
  buildOptions: T,
  i18n: I18nOptions,
}> {
  if (!context.target) {
    throw new Error('The builder requires a target.');
  }

  const buildOptions = { ... options };

  const tsConfig = readTsconfig(buildOptions.tsConfig, context.workspaceRoot);
  const usingIvy = tsConfig.options.enableIvy !== false;
  const metadata = await context.getProjectMetadata(context.target);
  const i18n = createI18nOptions(metadata, buildOptions.localize);

  // Until 11.0, support deprecated i18n options when not using new localize option
  // i18nFormat is automatically calculated
  if (buildOptions.localize === undefined && usingIvy) {
    mergeDeprecatedI18nOptions(i18n, buildOptions.i18nLocale, buildOptions.i18nFile);
  } else if (buildOptions.localize !== undefined && !usingIvy) {
    buildOptions.localize = undefined;

    context.logger.warn(`Option 'localize' is not supported with View Engine.`);
  }

  if (i18n.inlineLocales.size > 0) {
    // Load locales
    const loader = await createTranslationLoader();
    const projectRoot = path.join(context.workspaceRoot, (metadata.root as string) || '');
    const usedFormats = new Set<string>();
    for (const [locale, desc] of Object.entries(i18n.locales)) {
      if (i18n.inlineLocales.has(locale)) {
        const result = loader(path.join(projectRoot, desc.file));

        usedFormats.add(result.format);
        if (usedFormats.size > 1 && tsConfig.options.enableI18nLegacyMessageIdFormat !== false) {
          // This limitation is only for legacy message id support (defaults to true as of 9.0)
          throw new Error(
            'Localization currently only supports using one type of translation file format for the entire application.',
          );
        }

        desc.format = result.format;
        desc.translation = result.translation;
      }
    }

    // Legacy message id's require the format of the translations
    if (usedFormats.size > 0) {
      buildOptions.i18nFormat = [...usedFormats][0];
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
      } catch { }
    });
  }

  return { buildOptions, i18n };
}

function mergeDeprecatedI18nOptions(i18n: I18nOptions, i18nLocale: string | undefined, i18nFile: string | undefined): I18nOptions {
  if (i18nFile !== undefined && i18nLocale === undefined) {
    throw new Error(`Option 'i18nFile' cannot be used without the 'i18nLocale' option.`);
  }

  if (i18nLocale !== undefined) {
    i18n.inlineLocales.clear();
    i18n.inlineLocales.add(i18nLocale);

    if (i18nFile !== undefined) {
      i18n.locales[i18nLocale] = { file: i18nFile };
      i18n.flatOutput = true;
    }
  }

  return i18n;
}
