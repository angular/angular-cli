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
  PluginObj,
  parseSync,
  transformAsync,
  transformFromAstSync,
  traverse,
  types,
} from '@babel/core';
import templateBuilder from '@babel/template';
import * as cacache from 'cacache';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { minify } from 'terser';
import { workerData } from 'worker_threads';
import { allowMangle, allowMinify, shouldBeautify } from './environment-options';
import { I18nOptions } from './i18n-options';

type LocalizeUtilities = typeof import('@angular/localize/src/tools/src/source_file_utils');

// Extract Sourcemap input type from the remapping function since it is not currently exported
type SourceMapInput = Exclude<Parameters<typeof remapping>[0], unknown[]>;

// Lazy loaded webpack-sources object
// Webpack is only imported if needed during the processing
let webpackSources: typeof import('webpack').sources | undefined;

// If code size is larger than 500KB, consider lower fidelity but faster sourcemap merge
const FAST_SOURCEMAP_THRESHOLD = 500 * 1024;

export interface ProcessBundleOptions {
  filename: string;
  code: string;
  map?: string;
  name: string;
  sourceMaps?: boolean;
  hiddenSourceMaps?: boolean;
  vendorSourceMaps?: boolean;
  runtime?: boolean;
  optimize?: boolean;
  optimizeOnly?: boolean;
  ignoreOriginal?: boolean;
  cacheKeys?: (string | undefined)[];
  integrityAlgorithm?: 'sha256' | 'sha384' | 'sha512';
  runtimeData?: ProcessBundleResult[];
  replacements?: [string, string][];
  supportedBrowsers?: string[] | Record<string, string>;
  memoryMode?: boolean;
}

export interface ProcessBundleResult {
  name: string;
  integrity?: string;
  original?: ProcessBundleFile;
  downlevel?: ProcessBundleFile;
}

export interface ProcessBundleFile {
  filename: string;
  size: number;
  integrity?: string;
  content?: string;
  map?: {
    filename: string;
    size: number;
    content?: string;
  };
}

export const enum CacheKey {
  OriginalCode = 0,
  OriginalMap = 1,
  DownlevelCode = 2,
  DownlevelMap = 3,
}

const { cachePath, i18n } = (workerData || {}) as { cachePath?: string; i18n?: I18nOptions };

async function cachePut(
  content: string,
  key: string | undefined,
  integrity?: string,
): Promise<void> {
  if (cachePath && key) {
    await cacache.put(cachePath, key, content, {
      metadata: { integrity },
    });
  }
}

export async function process(options: ProcessBundleOptions): Promise<ProcessBundleResult> {
  if (!options.cacheKeys) {
    options.cacheKeys = [];
  }

  const result: ProcessBundleResult = { name: options.name };
  if (options.integrityAlgorithm) {
    // Store unmodified code integrity value -- used for SRI value replacement
    result.integrity = generateIntegrityValue(options.integrityAlgorithm, options.code);
  }

  // Runtime chunk requires specialized handling
  if (options.runtime) {
    return { ...result, ...(await processRuntime(options)) };
  }

  const basePath = path.dirname(options.filename);
  const filename = path.basename(options.filename);
  const downlevelFilename = filename.replace(/\-(es20\d{2}|esnext)/, '-es5');
  const downlevel = !options.optimizeOnly;
  const sourceCode = options.code;

  if (downlevel) {
    const { supportedBrowsers: targets = [] } = options;

    // todo: revisit this in version 10, when we update our defaults browserslist
    // Without this workaround bundles will not be downlevelled because Babel doesn't know handle to 'op_mini all'
    // See: https://github.com/babel/babel/issues/11155
    if (Array.isArray(targets) && targets.includes('op_mini all')) {
      targets.push('ie_mob 11');
    } else if ('op_mini' in targets) {
      targets['ie_mob'] = '11';
    }

    // Downlevel the bundle
    const transformResult = await transformAsync(sourceCode, {
      filename,
      // using false ensures that babel will NOT search and process sourcemap comments (large memory usage)
      // The types do not include the false option even though it is valid
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inputSourceMap: false as any,
      babelrc: false,
      configFile: false,
      presets: [
        [
          require.resolve('@babel/preset-env'),
          {
            // browserslist-compatible query or object of minimum environment versions to support
            targets,
            // modules aren't needed since the bundles use webpack's custom module loading
            modules: false,
            // 'transform-typeof-symbol' generates slower code
            exclude: ['transform-typeof-symbol'],
          },
        ],
      ],
      plugins: [
        createIifeWrapperPlugin(),
        ...(options.replacements ? [createReplacePlugin(options.replacements)] : []),
      ],
      minified: allowMinify && !!options.optimize,
      compact: !shouldBeautify && !!options.optimize,
      sourceMaps: !!options.map,
    });

    if (!transformResult || !transformResult.code) {
      throw new Error(`Unknown error occurred processing bundle for "${options.filename}".`);
    }

    result.downlevel = await processBundle({
      ...options,
      code: transformResult.code,
      downlevelMap: (transformResult.map as SourceMapInput) ?? undefined,
      filename: path.join(basePath, downlevelFilename),
      isOriginal: false,
    });
  }

  if (!result.original && !options.ignoreOriginal) {
    result.original = await processBundle({
      ...options,
      isOriginal: true,
    });
  }

  return result;
}

async function processBundle(
  options: ProcessBundleOptions & {
    isOriginal: boolean;
    downlevelMap?: SourceMapInput;
  },
): Promise<ProcessBundleFile> {
  const {
    optimize,
    isOriginal,
    code,
    map,
    downlevelMap,
    filename: filepath,
    hiddenSourceMaps,
    cacheKeys = [],
    integrityAlgorithm,
    memoryMode,
  } = options;

  const filename = path.basename(filepath);
  let resultCode = code;

  let optimizeResult;
  if (optimize) {
    optimizeResult = await terserMangle(code, {
      filename,
      sourcemap: !!map,
      compress: !isOriginal, // We only compress bundles which are downlevelled.
      ecma: isOriginal ? 2015 : 5,
    });
    resultCode = optimizeResult.code;
  }

  let mapContent: string | undefined;
  if (map) {
    if (!hiddenSourceMaps) {
      resultCode += `\n//# sourceMappingURL=${filename}.map`;
    }

    const partialSourcemaps: SourceMapInput[] = [];
    if (optimizeResult && optimizeResult.map) {
      partialSourcemaps.push(optimizeResult.map);
    }
    if (downlevelMap) {
      partialSourcemaps.push(downlevelMap);
    }

    if (partialSourcemaps.length > 0) {
      partialSourcemaps.push(map);
      const fullSourcemap = remapping(partialSourcemaps, () => null);
      mapContent = JSON.stringify(fullSourcemap);
    } else {
      mapContent = map;
    }

    await cachePut(
      mapContent,
      cacheKeys[isOriginal ? CacheKey.OriginalMap : CacheKey.DownlevelMap],
    );
    if (!memoryMode) {
      fs.writeFileSync(filepath + '.map', mapContent);
    }
  }

  const fileResult = createFileEntry(
    filepath,
    resultCode,
    mapContent,
    memoryMode,
    integrityAlgorithm,
  );

  await cachePut(
    resultCode,
    cacheKeys[isOriginal ? CacheKey.OriginalCode : CacheKey.DownlevelCode],
    fileResult.integrity,
  );
  if (!memoryMode) {
    fs.writeFileSync(filepath, resultCode);
  }

  return fileResult;
}

async function terserMangle(
  code: string,
  options: { filename?: string; sourcemap?: boolean; compress?: boolean; ecma?: 5 | 2015 } = {},
) {
  // Note: Investigate converting the AST instead of re-parsing
  // estree -> terser is already supported; need babel -> estree/terser

  // Mangle downlevel code
  const minifyOutput = await minify(options.filename ? { [options.filename]: code } : code, {
    compress: allowMinify && !!options.compress,
    ecma: options.ecma || 5,
    mangle: allowMangle,
    safari10: true,
    format: {
      ascii_only: true,
      webkit: true,
      beautify: shouldBeautify,
      wrap_func_args: false,
    },
    sourceMap:
      !!options.sourcemap &&
      ({
        asObject: true,
        // typings don't include asObject option
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
  });

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return { code: minifyOutput.code!, map: minifyOutput.map as SourceMapInput | undefined };
}

function createFileEntry(
  filename: string,
  code: string,
  map: string | undefined,
  memoryMode?: boolean,
  integrityAlgorithm?: string,
): ProcessBundleFile {
  return {
    filename: filename,
    size: Buffer.byteLength(code),
    integrity: integrityAlgorithm && generateIntegrityValue(integrityAlgorithm, code),
    content: memoryMode ? code : undefined,
    map: !map
      ? undefined
      : {
          filename: filename + '.map',
          size: Buffer.byteLength(map),
          content: memoryMode ? map : undefined,
        },
  };
}

function generateIntegrityValue(hashAlgorithm: string, code: string) {
  return hashAlgorithm + '-' + createHash(hashAlgorithm).update(code).digest('base64');
}

// The webpack runtime chunk is already ES5.
// However, two variants are still needed due to lazy routing and SRI differences
// NOTE: This should eventually be a babel plugin
async function processRuntime(
  options: ProcessBundleOptions,
): Promise<Partial<ProcessBundleResult>> {
  let originalCode = options.code;
  let downlevelCode = options.code;

  // Replace integrity hashes with updated values
  if (options.integrityAlgorithm && options.runtimeData) {
    for (const data of options.runtimeData) {
      if (!data.integrity) {
        continue;
      }

      if (data.original && data.original.integrity) {
        originalCode = originalCode.replace(data.integrity, data.original.integrity);
      }
      if (data.downlevel && data.downlevel.integrity) {
        downlevelCode = downlevelCode.replace(data.integrity, data.downlevel.integrity);
      }
    }
  }

  // Adjust lazy loaded scripts to point to the proper variant
  // Extra spacing is intentional to align source line positions
  downlevelCode = downlevelCode.replace(/"\-(es20\d{2}|esnext)\./, '   "-es5.');

  return {
    original: await processBundle({
      ...options,
      code: originalCode,
      isOriginal: true,
    }),
    downlevel: await processBundle({
      ...options,
      code: downlevelCode,
      filename: options.filename.replace(/\-(es20\d{2}|esnext)/, '-es5'),
      isOriginal: false,
    }),
  };
}

function createReplacePlugin(replacements: [string, string][]): PluginObj {
  return {
    visitor: {
      StringLiteral(path: NodePath<types.StringLiteral>) {
        for (const replacement of replacements) {
          if (path.node.value === replacement[0]) {
            path.node.value = replacement[1];
          }
        }
      },
    },
  };
}

function createIifeWrapperPlugin(): PluginObj {
  return {
    visitor: {
      Program: {
        exit(path: NodePath<types.Program>) {
          // Save existing body and directives
          const { body, directives } = path.node;

          // Clear out body and directives for wrapper
          path.node.body = [];
          path.node.directives = [];

          // Create the wrapper - "(function() { ... })();"
          const wrapper = types.expressionStatement(
            types.callExpression(
              types.parenthesizedExpression(
                types.functionExpression(undefined, [], types.blockStatement(body, directives)),
              ),
              [],
            ),
          );

          // Insert the wrapper
          path.pushContainer('body', wrapper);
        },
      },
    },
  };
}

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
