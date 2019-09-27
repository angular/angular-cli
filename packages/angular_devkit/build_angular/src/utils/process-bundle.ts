/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { SourceMapConsumer, SourceMapGenerator } from 'source-map';
import { minify } from 'terser';
import { manglingDisabled } from './mangle-options';

const { transformAsync } = require('@babel/core');
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
  cacheKeys?: (string | null)[];
  cachePath?: string;
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

export async function process(options: ProcessBundleOptions): Promise<ProcessBundleResult> {
  if (!options.cacheKeys) {
    options.cacheKeys = [];
  }

  // If no downlevelling required than just mangle code and return
  if (options.optimizeOnly) {
    const result: ProcessBundleResult = { name: options.name };
    if (options.integrityAlgorithm) {
      result.integrity = generateIntegrityValue(options.integrityAlgorithm, options.code);
    }

    // Replace integrity hashes with updated values
    // NOTE: This should eventually be a babel plugin
    if (options.runtime && options.integrityAlgorithm && options.runtimeData) {
      for (const data of options.runtimeData) {
        if (!data.integrity || !data.original || !data.original.integrity) {
          continue;
        }

        options.code = options.code.replace(data.integrity, data.original.integrity);
      }
    }

    result.original = await mangleOriginal(options);

    return result;
  }

  // if code size is larger than 500kB, manually handle sourcemaps with newer source-map package.
  // babel currently uses an older version that still supports sync calls
  const codeSize = Buffer.byteLength(options.code, 'utf8');
  const mapSize = options.map ? Buffer.byteLength(options.map, 'utf8') : 0;
  const manualSourceMaps = codeSize >= 500 * 1024 || mapSize >= 500 * 1024;

  // downlevel the bundle
  let { code, map } = await transformAsync(options.code, {
    filename: options.filename,
    inputSourceMap: !manualSourceMaps && options.map !== undefined && JSON.parse(options.map),
    babelrc: false,
    // modules aren't needed since the bundles use webpack's custom module loading
    // loose generates more ES5-like code but does not strictly adhere to the ES2015 spec (Typescript is loose)
    // 'transform-typeof-symbol' generates slower code
    presets: [
      ['@babel/preset-env', { modules: false, loose: true, exclude: ['transform-typeof-symbol'] }],
    ],
    minified: options.optimize,
    // `false` ensures it is disabled and prevents large file warnings
    compact: options.optimize || false,
    sourceMaps: options.sourceMaps,
  });

  const newFilePath = options.filename.replace('es2015', 'es5');

  // Adjust lazy loaded scripts to point to the proper variant
  // Extra spacing is intentional to align source line positions
  if (options.runtime) {
    code = code.replace('"-es2015.', '   "-es5.');

    // Replace integrity hashes with updated values
    // NOTE: This should eventually be a babel plugin
    if (options.integrityAlgorithm && options.runtimeData) {
      for (const data of options.runtimeData) {
        if (!data.integrity || !data.downlevel || !data.downlevel.integrity) {
          continue;
        }

        code = code.replace(data.integrity, data.downlevel.integrity);
      }
    }
  }

  if (options.sourceMaps && manualSourceMaps && options.map) {
    const generator = new SourceMapGenerator();
    let sourceRoot;
    await SourceMapConsumer.with(options.map, null, originalConsumer => {
      sourceRoot = 'sourceRoot' in originalConsumer ? originalConsumer.sourceRoot : undefined;

      return SourceMapConsumer.with(map, null, newConsumer => {
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

    map = generator.toJSON();
    map.file = path.basename(newFilePath);
    map.sourceRoot = sourceRoot;
  }

  const result: ProcessBundleResult = { name: options.name };

  if (options.optimize) {
    // Note: Investigate converting the AST instead of re-parsing
    // estree -> terser is already supported; need babel -> estree/terser

    // Mangle downlevel code
    const minifyOutput = minify(code, {
      compress: true,
      ecma: 5,
      mangle: !manglingDisabled,
      safari10: true,
      output: {
        ascii_only: true,
        webkit: true,
      },
      sourceMap: options.sourceMaps && {
        filename: path.basename(newFilePath),
        content: map,
      },
    });

    if (minifyOutput.error) {
      throw minifyOutput.error;
    }

    code = minifyOutput.code;
    map = minifyOutput.map;

    // Mangle original code
    if (!options.ignoreOriginal) {
      result.original = await mangleOriginal(options);
    }
  } else if (map) {
    map = JSON.stringify(map);
  }

  if (map) {
    if (!options.hiddenSourceMaps) {
      code += `\n//# sourceMappingURL=${path.basename(newFilePath)}.map`;
    }

    if (options.cachePath && options.cacheKeys[CacheKey.DownlevelMap]) {
      await cacache.put(options.cachePath, options.cacheKeys[CacheKey.DownlevelMap], map);
    }

    fs.writeFileSync(newFilePath + '.map', map);
  }

  result.downlevel = createFileEntry(newFilePath, code, map, options.integrityAlgorithm);

  if (options.cachePath && options.cacheKeys[CacheKey.DownlevelCode]) {
    await cacache.put(options.cachePath, options.cacheKeys[CacheKey.DownlevelCode], code, {
      metadata: { integrity: result.downlevel.integrity },
    });
  }
  fs.writeFileSync(newFilePath, code);

  // If original was not processed, add info
  if (!result.original && !options.ignoreOriginal) {
    result.original = createFileEntry(
      options.filename,
      options.code,
      options.map,
      options.integrityAlgorithm,
    );
  }

  if (options.integrityAlgorithm) {
    result.integrity = generateIntegrityValue(options.integrityAlgorithm, options.code);
  }

  return result;
}

async function mangleOriginal(options: ProcessBundleOptions): Promise<ProcessBundleFile> {
  const resultOriginal = minify(options.code, {
    compress: false,
    ecma: 6,
    mangle: !manglingDisabled,
    safari10: true,
    output: {
      ascii_only: true,
      webkit: true,
    },
    sourceMap: options.sourceMaps &&
      options.map !== undefined && {
        filename: path.basename(options.filename),
        content: JSON.parse(options.map),
      },
  });

  if (resultOriginal.error) {
    throw resultOriginal.error;
  }

  if (resultOriginal.map) {
    if (!options.hiddenSourceMaps) {
      resultOriginal.code += `\n//# sourceMappingURL=${path.basename(options.filename)}.map`;
    }

    if (options.cachePath && options.cacheKeys && options.cacheKeys[CacheKey.OriginalMap]) {
      await cacache.put(
        options.cachePath,
        options.cacheKeys[CacheKey.OriginalMap],
        resultOriginal.map,
      );
    }

    fs.writeFileSync(options.filename + '.map', resultOriginal.map);
  }

  const fileResult = createFileEntry(
    options.filename,
    // tslint:disable-next-line: no-non-null-assertion
    resultOriginal.code!,
    resultOriginal.map as string,
    options.integrityAlgorithm,
  );

  if (options.cachePath && options.cacheKeys && options.cacheKeys[CacheKey.OriginalCode]) {
    await cacache.put(
      options.cachePath,
      options.cacheKeys[CacheKey.OriginalCode],
      resultOriginal.code,
      {
        metadata: { integrity: fileResult.integrity },
      },
    );
  }

  fs.writeFileSync(options.filename, resultOriginal.code);

  return fileResult;
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
