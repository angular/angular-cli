/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
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
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { RawSourceMap, SourceMapConsumer, SourceMapGenerator } from 'source-map';
import { minify } from 'terser';
import * as v8 from 'v8';
import {
  ConcatSource,
  OriginalSource,
  ReplaceSource,
  Source,
  SourceMapSource,
} from 'webpack-sources';
import { allowMangle, allowMinify, shouldBeautify } from './environment-options';
import { I18nOptions } from './i18n-options';

const cacache = require('cacache');
const deserialize = ((v8 as unknown) as { deserialize(buffer: Buffer): unknown }).deserialize;

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
  map?: {
    filename: string;
    size: number;
  };
}

export const enum CacheKey {
  OriginalCode = 0,
  OriginalMap = 1,
  DownlevelCode = 2,
  DownlevelMap = 3,
}

let cachePath: string | undefined;
let i18n: I18nOptions | undefined;

export function setup(data: number[] | { cachePath: string; i18n: I18nOptions }): void {
  const options = Array.isArray(data)
    ? (deserialize(Buffer.from(data)) as { cachePath: string; i18n: I18nOptions })
    : data;
  cachePath = options.cachePath;
  i18n = options.i18n;
}

async function cachePut(content: string, key: string | undefined, integrity?: string): Promise<void> {
  if (cachePath && key) {
    await cacache.put(cachePath, key || null, content, {
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
  const sourceMap = options.map ? JSON.parse(options.map) : undefined;

  let downlevelCode;
  let downlevelMap;
  if (downlevel) {
    const {supportedBrowsers: targets = []} = options;

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
      // tslint:disable-next-line: no-any
      inputSourceMap: false as any,
      babelrc: false,
      configFile: false,
      presets: [[
        require.resolve('@babel/preset-env'),
        {
          // browserslist-compatible query or object of minimum environment versions to support
          targets,
          // modules aren't needed since the bundles use webpack's custom module loading
          modules: false,
          // 'transform-typeof-symbol' generates slower code
          exclude: ['transform-typeof-symbol'],
        },
      ]],
      plugins: options.replacements ? [createReplacePlugin(options.replacements)] : [],
      minified: allowMinify && !!options.optimize,
      compact: !shouldBeautify && !!options.optimize,
      sourceMaps: !!sourceMap,
    });

    if (!transformResult || !transformResult.code) {
      throw new Error(`Unknown error occurred processing bundle for "${options.filename}".`);
    }
    downlevelCode = transformResult.code;

    if (sourceMap && transformResult.map) {
      // String length is used as an estimate for byte length
      const fastSourceMaps = sourceCode.length > FAST_SOURCEMAP_THRESHOLD;

      downlevelMap = await mergeSourceMaps(
        sourceCode,
        sourceMap,
        downlevelCode,
        transformResult.map,
        filename,
        // When not optimizing, the sourcemaps are significantly less complex
        // and can use the higher fidelity merge
        !!options.optimize && fastSourceMaps,
      );
    }
  }

  if (downlevelCode) {
    result.downlevel = await processBundle({
      ...options,
      code: downlevelCode,
      map: downlevelMap,
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

async function mergeSourceMaps(
  inputCode: string,
  inputSourceMap: RawSourceMap,
  resultCode: string,
  resultSourceMap: RawSourceMap,
  filename: string,
  fast = false,
): Promise<RawSourceMap> {
  if (fast) {
    return mergeSourceMapsFast(inputSourceMap, resultSourceMap);
  }

  // SourceMapSource produces high-quality sourcemaps
  // The last argument is not yet in the typings
  // tslint:disable-next-line: no-any
  return new (SourceMapSource as any)(
    resultCode,
    filename,
    resultSourceMap,
    inputCode,
    inputSourceMap,
    true,
  ).map();
}

async function mergeSourceMapsFast(first: RawSourceMap, second: RawSourceMap) {
  const sourceRoot = first.sourceRoot;
  const generator = new SourceMapGenerator();

  // sourcemap package adds the sourceRoot to all position source paths if not removed
  delete first.sourceRoot;

  await SourceMapConsumer.with(first, null, originalConsumer => {
    return SourceMapConsumer.with(second, null, newConsumer => {
      newConsumer.eachMapping(mapping => {
        if (mapping.originalLine === null) {
          return;
        }
        const originalPosition = originalConsumer.originalPositionFor({
          line: mapping.originalLine,
          column: mapping.originalColumn,
        });
        if (
          originalPosition.line === null ||
          originalPosition.column === null ||
          originalPosition.source === null
        ) {
          return;
        }
        generator.addMapping({
          generated: {
            line: mapping.generatedLine,
            column: mapping.generatedColumn,
          },
          name: originalPosition.name || undefined,
          original: {
            line: originalPosition.line,
            column: originalPosition.column,
          },
          source: originalPosition.source,
        });
      });
    });
  });

  const map = generator.toJSON();
  map.file = second.file;
  map.sourceRoot = sourceRoot;

  // Add source content if present
  if (first.sourcesContent) {
    // Source content array is based on index of sources
    const sourceContentMap = new Map<string, number>();
    for (let i = 0; i < first.sources.length; i++) {
      // make paths "absolute" so they can be compared (`./a.js` and `a.js` are equivalent)
      sourceContentMap.set(path.resolve('/', first.sources[i]), i);
    }
    map.sourcesContent = [];
    for (let i = 0; i < map.sources.length; i++) {
      const contentIndex = sourceContentMap.get(path.resolve('/', map.sources[i]));
      if (contentIndex === undefined) {
        map.sourcesContent.push('');
      } else {
        map.sourcesContent.push(first.sourcesContent[contentIndex]);
      }
    }
  }

  // Put the sourceRoot back
  if (sourceRoot) {
    first.sourceRoot = sourceRoot;
  }

  return map;
}

async function processBundle(
  options: Omit<ProcessBundleOptions, 'map'> & { isOriginal: boolean; map?: string | RawSourceMap },
): Promise<ProcessBundleFile> {
  const {
    optimize,
    isOriginal,
    code,
    map,
    filename: filepath,
    hiddenSourceMaps,
    cacheKeys = [],
    integrityAlgorithm,
   } = options;

  const rawMap = typeof map === 'string' ? JSON.parse(map) as RawSourceMap : map;
  const filename = path.basename(filepath);

  let result: {
    code: string,
    map: RawSourceMap | undefined,
  };

  if (rawMap) {
    rawMap.file = filename;
  }

  if (optimize) {
    result = await terserMangle(code, {
      filename,
      map: rawMap,
      compress: !isOriginal, // We only compress bundles which are downlevelled.
      ecma: isOriginal ? 6 : 5,
    });
  } else {
    result = {
      map: rawMap,
      code,
    };
  }

  let mapContent: string | undefined;
  if (result.map) {
    if (!hiddenSourceMaps) {
      result.code += `\n//# sourceMappingURL=${filename}.map`;
    }

    mapContent = JSON.stringify(result.map);

    await cachePut(
      mapContent,
      cacheKeys[isOriginal ? CacheKey.OriginalMap : CacheKey.DownlevelMap],
    );
    fs.writeFileSync(filepath + '.map', mapContent);
  }

  const fileResult = createFileEntry(
    filepath,
    result.code,
    mapContent,
    integrityAlgorithm,
  );

  await cachePut(
    result.code,
    cacheKeys[isOriginal ? CacheKey.OriginalCode : CacheKey.DownlevelCode],
    fileResult.integrity,
  );
  fs.writeFileSync(filepath, result.code);

  return fileResult;
}

async function terserMangle(
  code: string,
  options: { filename?: string; map?: RawSourceMap; compress?: boolean; ecma?: 5 | 6 } = {},
) {
  // Note: Investigate converting the AST instead of re-parsing
  // estree -> terser is already supported; need babel -> estree/terser

  // Mangle downlevel code
  const minifyOutput = minify(options.filename ? { [options.filename]: code } : code, {
    compress: allowMinify && !!options.compress,
    ecma: options.ecma || 5,
    mangle: allowMangle,
    safari10: true,
    output: {
      ascii_only: true,
      webkit: true,
      beautify: shouldBeautify,
    },
    sourceMap:
      !!options.map &&
      ({
        asObject: true,
        // typings don't include asObject option
        // tslint:disable-next-line: no-any
      } as any),
  });

  if (minifyOutput.error) {
    throw minifyOutput.error;
  }

  // tslint:disable-next-line: no-non-null-assertion
  const outputCode = minifyOutput.code!;

  let outputMap;
  if (options.map && minifyOutput.map) {
    outputMap = await mergeSourceMaps(
      code,
      options.map,
      outputCode,
      minifyOutput.map as unknown as RawSourceMap,
      options.filename || '0',
      code.length > FAST_SOURCEMAP_THRESHOLD,
    );
  }

  return { code: outputCode, map: outputMap };
}

function createFileEntry(
  filename: string,
  code: string,
  map: string | undefined,
  integrityAlgorithm?: string,
): ProcessBundleFile {
  return {
    filename: filename,
    size: Buffer.byteLength(code),
    integrity: integrityAlgorithm && generateIntegrityValue(integrityAlgorithm, code),
    map: !map
      ? undefined
      : {
          filename: filename + '.map',
          size: Buffer.byteLength(map),
        },
  };
}

function generateIntegrityValue(hashAlgorithm: string, code: string) {
  return (
    hashAlgorithm +
    '-' +
    createHash(hashAlgorithm)
      .update(code)
      .digest('base64')
  );
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

const USE_LOCALIZE_PLUGINS = false;

async function createI18nPlugins(
  locale: string,
  translation: unknown | undefined,
  missingTranslation: 'error' | 'warning' | 'ignore',
  localeDataContent: string | undefined,
) {
  const plugins = [];
  // tslint:disable-next-line: no-implicit-dependencies
  const localizeDiag = await import('@angular/localize/src/tools/src/diagnostics');

  const diagnostics = new localizeDiag.Diagnostics();

  const es2015 = await import(
    // tslint:disable-next-line: trailing-comma no-implicit-dependencies
    '@angular/localize/src/tools/src/translate/source_files/es2015_translate_plugin'
  );
  plugins.push(
    // tslint:disable-next-line: no-any
    es2015.makeEs2015TranslatePlugin(diagnostics, (translation || {}) as any, {
      missingTranslation: translation === undefined ? 'ignore' : missingTranslation,
    }),
  );

  const es5 = await import(
    // tslint:disable-next-line: trailing-comma no-implicit-dependencies
    '@angular/localize/src/tools/src/translate/source_files/es5_translate_plugin'
  );
  plugins.push(
    // tslint:disable-next-line: no-any
    es5.makeEs5TranslatePlugin(diagnostics, (translation || {}) as any, {
      missingTranslation: translation === undefined ? 'ignore' : missingTranslation,
    }),
  );

  const inlineLocale = await import(
    // tslint:disable-next-line: trailing-comma no-implicit-dependencies
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
  const inputMap = options.map && (JSON.parse(options.map) as RawSourceMap);
  for (const locale of i18n.inlineLocales) {
    const isSourceLocale = locale === i18n.sourceLocale;
    // tslint:disable-next-line: no-any
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
      localeDataContent,
    );
    const transformResult = await transformFromAstSync(ast, options.code, {
      filename: options.filename,
      // using false ensures that babel will NOT search and process sourcemap comments (large memory usage)
      // The types do not include the false option even though it is valid
      // tslint:disable-next-line: no-any
      inputSourceMap: false as any,
      babelrc: false,
      configFile: false,
      plugins,
      compact: !shouldBeautify,
      sourceMaps: !!inputMap,
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

    if (inputMap && transformResult.map) {
      const outputMap = await mergeSourceMaps(
        options.code,
        inputMap,
        transformResult.code,
        transformResult.map,
        options.filename,
        options.code.length > FAST_SOURCEMAP_THRESHOLD,
      );

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
  const utils = await import(
    // tslint:disable-next-line: trailing-comma no-implicit-dependencies
    '@angular/localize/src/tools/src/translate/source_files/source_file_utils'
  );
  // tslint:disable-next-line: no-implicit-dependencies
  const localizeDiag = await import('@angular/localize/src/tools/src/diagnostics');

  const diagnostics = new localizeDiag.Diagnostics();

  const positions = findLocalizePositions(ast, options, utils);
  if (positions.length === 0 && !options.setLocale) {
    return inlineCopyOnly(options);
  }

  const inputMap = options.map && (JSON.parse(options.map) as RawSourceMap);
  // Cleanup source root otherwise it will be added to each source entry
  const mapSourceRoot = inputMap && inputMap.sourceRoot;
  if (inputMap) {
    delete inputMap.sourceRoot;
  }

  for (const locale of i18n.inlineLocales) {
    const content = new ReplaceSource(
      inputMap
        ? // tslint:disable-next-line: no-any
          new SourceMapSource(options.code, options.filename, inputMap as any)
        : new OriginalSource(options.code, options.filename),
    );

    const isSourceLocale = locale === i18n.sourceLocale;
    // tslint:disable-next-line: no-any
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

    let outputSource: Source = content;
    if (options.setLocale) {
      const setLocaleText = `var $localize=Object.assign(void 0===$localize?{}:$localize,{locale:"${locale}"});\n`;

      // If locale data is provided, load it and prepend to file
      let localeDataSource: Source | null = null;
      const localeDataPath = i18n.locales[locale] && i18n.locales[locale].dataPath;
      if (localeDataPath) {
        const localeDataContent = await loadLocaleData(localeDataPath, true);
        localeDataSource = new OriginalSource(localeDataContent, path.basename(localeDataPath));
      }

      outputSource = localeDataSource
        // The semicolon ensures that there is no syntax error between statements
        ? new ConcatSource(setLocaleText, localeDataSource, ';\n', content)
        : new ConcatSource(setLocaleText, content);
    }

    const { source: outputCode, map: outputMap } = outputSource.sourceAndMap();
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
  // tslint:disable-next-line: no-implicit-dependencies
  utils: typeof import('@angular/localize/src/tools/src/translate/source_files/source_file_utils'),
): LocalizePosition[] {
  const positions: LocalizePosition[] = [];
  if (options.es5) {
    traverse(ast, {
      CallExpression(path: NodePath<types.CallExpression>) {
        const callee = path.get('callee');
        if (
          callee.isIdentifier() &&
          callee.node.name === localizeName &&
          utils.isGlobalIdentifier(callee)
        ) {
          const messageParts = utils.unwrapMessagePartsFromLocalizeCall(path);
          const expressions = utils.unwrapSubstitutionsFromLocalizeCall(path.node);
          positions.push({
            // tslint:disable-next-line: no-non-null-assertion
            start: path.node.start!,
            // tslint:disable-next-line: no-non-null-assertion
            end: path.node.end!,
            messageParts,
            expressions,
          });
        }
      },
    });
  } else {
    const traverseFast = ((types as unknown) as {
      traverseFast: (node: types.Node, enter: (node: types.Node) => void) => void;
    }).traverseFast;

    traverseFast(ast, node => {
      if (
        node.type === 'TaggedTemplateExpression' &&
        types.isIdentifier(node.tag) &&
        node.tag.name === localizeName
      ) {
        const messageParts = utils.unwrapMessagePartsFromTemplateLiteral(node.quasi.quasis);
        positions.push({
          // tslint:disable-next-line: no-non-null-assertion
          start: node.start!,
          // tslint:disable-next-line: no-non-null-assertion
          end: node.end!,
          messageParts,
          expressions: node.quasi.expressions,
        });
      }
    });
  }

  return positions;
}

async function loadLocaleData(path: string, optimize: boolean): Promise<string> {
  // The path is validated during option processing before the build starts
  const content = fs.readFileSync(path, 'utf8');

  // NOTE: This can be removed once the locale data files are preprocessed in the framework
  if (optimize) {
    const result = await terserMangle(content, {
      compress: true,
      ecma: 5,
    });

    return result.code;
  }

  return content;
}
