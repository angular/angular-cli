/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { transformAsync } from '@babel/core';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { RawSourceMap, SourceMapConsumer, SourceMapGenerator } from 'source-map';
import { minify } from 'terser';
import { manglingDisabled } from './mangle-options';

const cacache = require('cacache');

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

export function setup(options: { cachePath: string }): void {
  cachePath = options.cachePath;
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
  const downlevelFilename = filename.replace(/\-es20\d{2}/, '-es5');
  const downlevel = !options.optimizeOnly;

  // if code size is larger than 1 MB, manually handle sourcemaps with newer source-map package.
  const codeSize = Buffer.byteLength(options.code);
  const mapSize = options.map ? Buffer.byteLength(options.map) : 0;
  const manualSourceMaps = codeSize >= 500 * 1024 || mapSize >= 500 * 1024;
  const sourceCode = options.code;
  const sourceMap = options.map ? JSON.parse(options.map) : undefined;

  let downlevelCode;
  let downlevelMap;
  if (downlevel) {
    // Downlevel the bundle
    const transformResult = await transformAsync(sourceCode, {
      filename: options.filename,
      inputSourceMap: manualSourceMaps ? undefined : sourceMap,
      babelrc: false,
      presets: [
        [
          require.resolve('@babel/preset-env'),
          {
            // modules aren't needed since the bundles use webpack's custom module loading
            modules: false,
            // 'transform-typeof-symbol' generates slower code
            exclude: ['transform-typeof-symbol'],
          },
        ],
      ],
      minified: options.optimize,
      // `false` ensures it is disabled and prevents large file warnings
      compact: options.optimize || false,
      sourceMaps: !!sourceMap,
    });

    if (!transformResult || !transformResult.code) {
      throw new Error(`Unknown error occurred processing bundle for "${options.filename}".`);
    }
    downlevelCode = transformResult.code;

    if (manualSourceMaps && sourceMap && transformResult.map) {
      downlevelMap = await mergeSourcemaps(sourceMap, transformResult.map);
    } else {
      // undefined is needed here to normalize the property type
      downlevelMap = transformResult.map || undefined;
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

async function mergeSourcemaps(first: RawSourceMap, second: RawSourceMap) {
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

  if (optimize) {
    result = terserMangle(code, {
      filename,
      map: rawMap,
      compress: !isOriginal, // We only compress bundles which are downlevelled.
      ecma: isOriginal ? 6 : 5,
    });
  } else {
    if (rawMap) {
      rawMap.file = filename;
    }

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

function terserMangle(
  code: string,
  options: { filename?: string; map?: RawSourceMap; compress?: boolean; ecma?: 5 | 6 } = {},
) {
  // Note: Investigate converting the AST instead of re-parsing
  // estree -> terser is already supported; need babel -> estree/terser

  // Mangle downlevel code
  const minifyOutput = minify(code, {
    compress: options.compress || false,
    ecma: options.ecma || 5,
    mangle: !manglingDisabled,
    safari10: true,
    output: {
      ascii_only: true,
      webkit: true,
    },
    sourceMap:
      !!options.map &&
      ({
        filename: options.filename,
        // terser uses an old version of the sourcemap typings
        // tslint:disable-next-line: no-any
        content: options.map as any,
        asObject: true,
        // typings don't include asObject option
        // tslint:disable-next-line: no-any
      } as any),
  });

  if (minifyOutput.error) {
    throw minifyOutput.error;
  }

  // tslint:disable-next-line: no-non-null-assertion
  return { code: minifyOutput.code!, map: minifyOutput.map as RawSourceMap | undefined };
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
  downlevelCode = downlevelCode.replace(/"\-es20\d{2}\./, '   "-es5.');

  return {
    original: await processBundle({
      ...options,
      code: originalCode,
      isOriginal: true,
    }),
    downlevel: await processBundle({
      ...options,
      code: downlevelCode,
      filename: options.filename.replace(/\-es20\d{2}/, '-es5'),
      isOriginal: false,
    }),
  };
}
