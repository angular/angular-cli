/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import remapping from '@ampproject/remapping';
import {
  NodePath,
  ParseResult,
  parseSync,
  transformAsync,
  transformFromAstSync,
  traverse,
  types,
} from '@babel/core';
import templateBuilder from '@babel/template';
import * as fs from 'fs';
import * as path from 'path';
import { workerData } from 'worker_threads';
import { allowMinify, shouldBeautify } from './environment-options';
import { I18nOptions } from './i18n-options';

type LocalizeUtilities = typeof import('@angular/localize/src/tools/src/source_file_utils');

// Extract Sourcemap input type from the remapping function since it is not currently exported
type SourceMapInput = Exclude<Parameters<typeof remapping>[0], unknown[]>;

// Lazy loaded webpack-sources object
// Webpack is only imported if needed during the processing
let webpackSources: typeof import('webpack').sources | undefined;

const { i18n } = (workerData || {}) as { i18n?: I18nOptions };

const USE_LOCALIZE_PLUGINS = false;

export async function createI18nPlugins(
  locale: string,
  translation: unknown | undefined,
  missingTranslation: 'error' | 'warning' | 'ignore',
  shouldInline: boolean,
  localeDataContent?: string,
) {
  const plugins = [];
  const localizeDiag = await import('@angular/localize/src/tools/src/diagnostics');

  const diagnostics = new localizeDiag.Diagnostics();

  if (shouldInline) {
    const es2015 = await import(
      '@angular/localize/src/tools/src/translate/source_files/es2015_translate_plugin'
    );
    plugins.push(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      es2015.makeEs2015TranslatePlugin(diagnostics, (translation || {}) as any, {
        missingTranslation: translation === undefined ? 'ignore' : missingTranslation,
      }),
    );

    const es5 = await import(
      '@angular/localize/src/tools/src/translate/source_files/es5_translate_plugin'
    );
    plugins.push(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      es5.makeEs5TranslatePlugin(diagnostics, (translation || {}) as any, {
        missingTranslation: translation === undefined ? 'ignore' : missingTranslation,
      }),
    );
  }

  const inlineLocale = await import(
    '@angular/localize/src/tools/src/translate/source_files/locale_plugin'
  );
  plugins.push(inlineLocale.makeLocalePlugin(locale));

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

export interface InlineOptions {
  filename: string;
  code: string;
  map?: string;
  es5: boolean;
  outputPath: string;
  missingTranslation?: 'warning' | 'error' | 'ignore';
  setLocale?: boolean;
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

  let ast: ParseResult | undefined | null;
  try {
    ast = parseSync(options.code, {
      babelrc: false,
      configFile: false,
      sourceType: 'script',
      filename: options.filename,
    });
  } catch (error) {
    if (error.message) {
      // Make the error more readable.
      // Same errors will contain the full content of the file as the error message
      // Which makes it hard to find the actual error message.
      const index = error.message.indexOf(')\n');
      const msg = index !== -1 ? error.message.substr(0, index + 1) : error.message;
      throw new Error(`${msg}\nAn error occurred inlining file "${options.filename}"`);
    }
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
        localeDataContent = await loadLocaleData(localeDataPath, true, options.es5);
      }
    }

    const { diagnostics: localeDiagnostics, plugins } = await createI18nPlugins(
      locale,
      translations,
      isSourceLocale ? 'ignore' : options.missingTranslation || 'warning',
      true,
      localeDataContent,
    );
    const transformResult = await transformFromAstSync(ast, options.code, {
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
    fs.writeFileSync(outputPath, transformResult.code);

    if (options.map && transformResult.map) {
      const outputMap = remapping([transformResult.map as SourceMapInput, options.map], () => null);

      fs.writeFileSync(outputPath + '.map', JSON.stringify(outputMap));
    }
  }

  return { file: options.filename, diagnostics };
}

async function inlineLocalesDirect(ast: ParseResult, options: InlineOptions) {
  if (!i18n || i18n.inlineLocales.size === 0) {
    return { file: options.filename, diagnostics: [], count: 0 };
  }

  const { default: generate } = await import('@babel/generator');

  const utils = await import('@angular/localize/src/tools/src/source_file_utils');
  const localizeDiag = await import('@angular/localize/src/tools/src/diagnostics');

  const diagnostics = new localizeDiag.Diagnostics();

  const positions = findLocalizePositions(ast, options, utils);
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
      const translated = utils.translate(
        diagnostics,
        translations,
        position.messageParts,
        position.expressions,
        isSourceLocale ? 'ignore' : options.missingTranslation || 'warning',
      );

      const expression = utils.buildLocalizeReplacement(translated[0], translated[1]);
      const { code } = generate(expression);

      content.replace(position.start, position.end - 1, code);
    }

    let outputSource: import('webpack').sources.Source = content;
    if (options.setLocale) {
      const setLocaleText = `var $localize=Object.assign(void 0===$localize?{}:$localize,{locale:"${locale}"});\n`;

      // If locale data is provided, load it and prepend to file
      let localeDataSource;
      const localeDataPath = i18n.locales[locale] && i18n.locales[locale].dataPath;
      if (localeDataPath) {
        const localeDataContent = await loadLocaleData(localeDataPath, true, options.es5);
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
    fs.writeFileSync(outputPath, outputCode);

    if (inputMap && outputMap) {
      outputMap.file = options.filename;
      if (mapSourceRoot) {
        outputMap.sourceRoot = mapSourceRoot;
      }
      fs.writeFileSync(outputPath + '.map', JSON.stringify(outputMap));
    }
  }

  return { file: options.filename, diagnostics: diagnostics.messages, count: positions.length };
}

function inlineCopyOnly(options: InlineOptions) {
  if (!i18n) {
    throw new Error('i18n options are missing');
  }

  for (const locale of i18n.inlineLocales) {
    const outputPath = path.join(
      options.outputPath,
      i18n.flatOutput ? '' : locale,
      options.filename,
    );
    fs.writeFileSync(outputPath, options.code);
    if (options.map) {
      fs.writeFileSync(outputPath + '.map', options.map);
    }
  }

  return { file: options.filename, diagnostics: [], count: 0 };
}

function findLocalizePositions(
  ast: ParseResult,
  options: InlineOptions,
  utils: LocalizeUtilities,
): LocalizePosition[] {
  const positions: LocalizePosition[] = [];

  // Workaround to ensure a path hub is present for traversal
  const { File } = require('@babel/core');
  const file = new File({}, { code: options.code, ast });

  if (options.es5) {
    traverse(file.ast, {
      CallExpression(path) {
        const callee = path.get('callee');
        if (
          callee.isIdentifier() &&
          callee.node.name === localizeName &&
          utils.isGlobalIdentifier(callee)
        ) {
          const [messageParts, expressions] = unwrapLocalizeCall(path, utils);
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
  } else {
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
  }

  return positions;
}

function unwrapTemplateLiteral(
  path: NodePath<types.TaggedTemplateExpression>,
  utils: LocalizeUtilities,
): [TemplateStringsArray, types.Expression[]] {
  const [messageParts] = utils.unwrapMessagePartsFromTemplateLiteral(
    path.get('quasi').get('quasis'),
  );
  const [expressions] = utils.unwrapExpressionsFromTemplateLiteral(path.get('quasi'));

  return [messageParts, expressions];
}

function unwrapLocalizeCall(
  path: NodePath<types.CallExpression>,
  utils: LocalizeUtilities,
): [TemplateStringsArray, types.Expression[]] {
  const [messageParts] = utils.unwrapMessagePartsFromLocalizeCall(path);
  const [expressions] = utils.unwrapSubstitutionsFromLocalizeCall(path);

  return [messageParts, expressions];
}

async function loadLocaleData(path: string, optimize: boolean, es5: boolean): Promise<string> {
  // The path is validated during option processing before the build starts
  const content = fs.readFileSync(path, 'utf8');

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
          // IE 11 is the oldest supported browser
          targets: es5 ? { ie: '11' } : { esmodules: true },
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
