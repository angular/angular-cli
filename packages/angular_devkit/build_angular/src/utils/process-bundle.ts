/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import remapping from '@ampproject/remapping';
import {
  NodePath,
  ParseResult,
  parseSync,
  template as templateBuilder,
  transformAsync,
  transformFromAstSync,
  traverse,
  types,
} from '@babel/core';
import * as fs from 'fs/promises';
import * as path from 'path';
import { workerData } from 'worker_threads';
import { InlineOptions } from './bundle-inline-options';
import { allowMinify, shouldBeautify } from './environment-options';
import { assertIsError } from './error';
import { I18nOptions } from './i18n-webpack';
import { loadEsmModule } from './load-esm';

// Extract Sourcemap input type from the remapping function since it is not currently exported
type SourceMapInput = Exclude<Parameters<typeof remapping>[0], unknown[]>;

// Lazy loaded webpack-sources object
// Webpack is only imported if needed during the processing
let webpackSources: typeof import('webpack').sources | undefined;

const { i18n } = (workerData || {}) as { i18n?: I18nOptions };

/**
 * Internal flag to enable the direct usage of the `@angular/localize` translation plugins.
 * Their usage is currently several times slower than the string manipulation method.
 * Future work to optimize the plugins should enable plugin usage as the default.
 */
const USE_LOCALIZE_PLUGINS = false;

type LocalizeUtilityModule = typeof import('@angular/localize/tools');

/**
 * Cached instance of the `@angular/localize/tools` module.
 * This is used to remove the need to repeatedly import the module per file translation.
 */
let localizeToolsModule: LocalizeUtilityModule | undefined;

/**
 * Attempts to load the `@angular/localize/tools` module containing the functionality to
 * perform the file translations.
 * This module must be dynamically loaded as it is an ESM module and this file is CommonJS.
 */
async function loadLocalizeTools(): Promise<LocalizeUtilityModule> {
  if (localizeToolsModule !== undefined) {
    return localizeToolsModule;
  }

  // Load ESM `@angular/localize/tools` using the TypeScript dynamic import workaround.
  // Once TypeScript provides support for keeping the dynamic import this workaround can be
  // changed to a direct dynamic import.
  return loadEsmModule('@angular/localize/tools');
}

async function createI18nPlugins(
  locale: string,
  translation: unknown | undefined,
  missingTranslation: 'error' | 'warning' | 'ignore',
  shouldInline: boolean,
  localeDataContent?: string,
) {
  const { Diagnostics, makeEs2015TranslatePlugin, makeLocalePlugin } = await loadLocalizeTools();

  const plugins = [];
  const diagnostics = new Diagnostics();

  if (shouldInline) {
    plugins.push(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      makeEs2015TranslatePlugin(diagnostics, (translation || {}) as any, {
        missingTranslation: translation === undefined ? 'ignore' : missingTranslation,
      }),
    );
  }

  plugins.push(makeLocalePlugin(locale));

  if (localeDataContent) {
    plugins.push({
      visitor: {
        Program(path: NodePath<types.Program>) {
          path.unshiftContainer('body', templateBuilder.ast(localeDataContent));
        },
      },
    });
  }

  return { diagnostics, plugins };
}

interface LocalizePosition {
  start: number;
  end: number;
  messageParts: TemplateStringsArray;
  expressions: types.Expression[];
}

const localizeName = '$localize';

export async function inlineLocales(options: InlineOptions) {
  if (!i18n || i18n.inlineLocales.size === 0) {
    return { file: options.filename, diagnostics: [], count: 0 };
  }
  if (i18n.flatOutput && i18n.inlineLocales.size > 1) {
    throw new Error('Flat output is only supported when inlining one locale.');
  }

  const hasLocalizeName = options.code.includes(localizeName);
  if (!hasLocalizeName && !options.setLocale) {
    return inlineCopyOnly(options);
  }

  await loadLocalizeTools();

  let ast: ParseResult | undefined | null;
  try {
    ast = parseSync(options.code, {
      babelrc: false,
      configFile: false,
      sourceType: 'unambiguous',
      filename: options.filename,
    });
  } catch (error) {
    assertIsError(error);

    // Make the error more readable.
    // Same errors will contain the full content of the file as the error message
    // Which makes it hard to find the actual error message.
    const index = error.message.indexOf(')\n');
    const msg = index !== -1 ? error.message.slice(0, index + 1) : error.message;
    throw new Error(`${msg}\nAn error occurred inlining file "${options.filename}"`);
  }

  if (!ast) {
    throw new Error(`Unknown error occurred inlining file "${options.filename}"`);
  }

  if (!USE_LOCALIZE_PLUGINS) {
    return inlineLocalesDirect(ast, options);
  }

  const diagnostics = [];
  for (const locale of i18n.inlineLocales) {
    const isSourceLocale = locale === i18n.sourceLocale;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const translations: any = isSourceLocale ? {} : i18n.locales[locale].translation || {};
    let localeDataContent;
    if (options.setLocale) {
      // If locale data is provided, load it and prepend to file
      const localeDataPath = i18n.locales[locale]?.dataPath;
      if (localeDataPath) {
        localeDataContent = await loadLocaleData(localeDataPath, true);
      }
    }

    const { diagnostics: localeDiagnostics, plugins } = await createI18nPlugins(
      locale,
      translations,
      isSourceLocale ? 'ignore' : options.missingTranslation || 'warning',
      true,
      localeDataContent,
    );
    const transformResult = transformFromAstSync(ast, options.code, {
      filename: options.filename,
      // using false ensures that babel will NOT search and process sourcemap comments (large memory usage)
      // The types do not include the false option even though it is valid
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inputSourceMap: false as any,
      babelrc: false,
      configFile: false,
      plugins,
      compact: !shouldBeautify,
      sourceMaps: !!options.map,
    });

    diagnostics.push(...localeDiagnostics.messages);

    if (!transformResult || !transformResult.code) {
      throw new Error(`Unknown error occurred processing bundle for "${options.filename}".`);
    }

    const outputPath = path.join(
      options.outputPath,
      i18n.flatOutput ? '' : locale,
      options.filename,
    );
    await fs.writeFile(outputPath, transformResult.code);

    if (options.map && transformResult.map) {
      const outputMap = remapping([transformResult.map as SourceMapInput, options.map], () => null);

      await fs.writeFile(outputPath + '.map', JSON.stringify(outputMap));
    }
  }

  return { file: options.filename, diagnostics };
}

async function inlineLocalesDirect(ast: ParseResult, options: InlineOptions) {
  if (!i18n || i18n.inlineLocales.size === 0) {
    return { file: options.filename, diagnostics: [], count: 0 };
  }

  const { default: generate } = await import('@babel/generator');
  const localizeDiag = await loadLocalizeTools();
  const diagnostics = new localizeDiag.Diagnostics();

  const positions = findLocalizePositions(ast, options, localizeDiag);
  if (positions.length === 0 && !options.setLocale) {
    return inlineCopyOnly(options);
  }

  const inputMap = !!options.map && (JSON.parse(options.map) as { sourceRoot?: string });
  // Cleanup source root otherwise it will be added to each source entry
  const mapSourceRoot = inputMap && inputMap.sourceRoot;
  if (inputMap) {
    delete inputMap.sourceRoot;
  }

  // Load Webpack only when needed
  if (webpackSources === undefined) {
    webpackSources = (await import('webpack')).sources;
  }
  const { ConcatSource, OriginalSource, ReplaceSource, SourceMapSource } = webpackSources;

  for (const locale of i18n.inlineLocales) {
    const content = new ReplaceSource(
      inputMap
        ? new SourceMapSource(options.code, options.filename, inputMap)
        : new OriginalSource(options.code, options.filename),
    );

    const isSourceLocale = locale === i18n.sourceLocale;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const translations: any = isSourceLocale ? {} : i18n.locales[locale].translation || {};
    for (const position of positions) {
      const translated = localizeDiag.translate(
        diagnostics,
        translations,
        position.messageParts,
        position.expressions,
        isSourceLocale ? 'ignore' : options.missingTranslation || 'warning',
      );

      const expression = localizeDiag.buildLocalizeReplacement(translated[0], translated[1]);
      const { code } = generate(expression);

      content.replace(position.start, position.end - 1, code);
    }

    let outputSource: import('webpack').sources.Source = content;
    if (options.setLocale) {
      const setLocaleText = `globalThis.$localize=Object.assign(globalThis.$localize || {},{locale:"${locale}"});\n`;

      // If locale data is provided, load it and prepend to file
      let localeDataSource;
      const localeDataPath = i18n.locales[locale] && i18n.locales[locale].dataPath;
      if (localeDataPath) {
        const localeDataContent = await loadLocaleData(localeDataPath, true);
        localeDataSource = new OriginalSource(localeDataContent, path.basename(localeDataPath));
      }

      outputSource = localeDataSource
        ? // The semicolon ensures that there is no syntax error between statements
          new ConcatSource(setLocaleText, localeDataSource, ';\n', content)
        : new ConcatSource(setLocaleText, content);
    }

    const { source: outputCode, map: outputMap } = outputSource.sourceAndMap() as {
      source: string;
      map: { file: string; sourceRoot?: string };
    };
    const outputPath = path.join(
      options.outputPath,
      i18n.flatOutput ? '' : locale,
      options.filename,
    );
    await fs.writeFile(outputPath, outputCode);

    if (inputMap && outputMap) {
      outputMap.file = options.filename;
      if (mapSourceRoot) {
        outputMap.sourceRoot = mapSourceRoot;
      }
      await fs.writeFile(outputPath + '.map', JSON.stringify(outputMap));
    }
  }

  return { file: options.filename, diagnostics: diagnostics.messages, count: positions.length };
}

async function inlineCopyOnly(options: InlineOptions) {
  if (!i18n) {
    throw new Error('i18n options are missing');
  }

  for (const locale of i18n.inlineLocales) {
    const outputPath = path.join(
      options.outputPath,
      i18n.flatOutput ? '' : locale,
      options.filename,
    );
    await fs.writeFile(outputPath, options.code);
    if (options.map) {
      await fs.writeFile(outputPath + '.map', options.map);
    }
  }

  return { file: options.filename, diagnostics: [], count: 0 };
}

function findLocalizePositions(
  ast: ParseResult,
  options: InlineOptions,
  utils: LocalizeUtilityModule,
): LocalizePosition[] {
  const positions: LocalizePosition[] = [];

  // Workaround to ensure a path hub is present for traversal
  const { File } = require('@babel/core');
  const file = new File({}, { code: options.code, ast });

  traverse(file.ast, {
    TaggedTemplateExpression(path) {
      if (types.isIdentifier(path.node.tag) && path.node.tag.name === localizeName) {
        const [messageParts, expressions] = unwrapTemplateLiteral(path, utils);
        positions.push({
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          start: path.node.start!,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          end: path.node.end!,
          messageParts,
          expressions,
        });
      }
    },
  });

  return positions;
}

function unwrapTemplateLiteral(
  path: NodePath<types.TaggedTemplateExpression>,
  utils: LocalizeUtilityModule,
): [TemplateStringsArray, types.Expression[]] {
  const [messageParts] = utils.unwrapMessagePartsFromTemplateLiteral(
    path.get('quasi').get('quasis'),
  );
  const [expressions] = utils.unwrapExpressionsFromTemplateLiteral(path.get('quasi'));

  return [messageParts, expressions];
}

async function loadLocaleData(path: string, optimize: boolean): Promise<string> {
  // The path is validated during option processing before the build starts
  const content = await fs.readFile(path, 'utf8');

  // Downlevel and optimize the data
  const transformResult = await transformAsync(content, {
    filename: path,
    // The types do not include the false option even though it is valid
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inputSourceMap: false as any,
    babelrc: false,
    configFile: false,
    presets: [
      [
        require.resolve('@babel/preset-env'),
        {
          bugfixes: true,
          targets: { esmodules: true },
        },
      ],
    ],
    minified: allowMinify && optimize,
    compact: !shouldBeautify && optimize,
    comments: !optimize,
  });

  if (!transformResult || !transformResult.code) {
    throw new Error(`Unknown error occurred processing bundle for "${path}".`);
  }

  return transformResult.code;
}
