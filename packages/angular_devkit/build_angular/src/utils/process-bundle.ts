/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
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
  sourceMaps?: boolean;
  hiddenSourceMaps?: boolean;
  vendorSourceMaps?: boolean;
  runtime?: boolean;
  optimize: boolean;
  optimizeOnly?: boolean;
  ignoreOriginal?: boolean;
  cacheKeys?: (string | null)[];
  cachePath?: string;
}

export const enum CacheKey {
  OriginalCode = 0,
  OriginalMap = 1,
  DownlevelCode = 2,
  DownlevelMap = 3,
}

export function process(
  options: ProcessBundleOptions,
  callback: (error: Error | null, result?: {}) => void,
): void {
  processWorker(options).then(() => callback(null, {}), error => callback(error));
}

async function processWorker(options: ProcessBundleOptions): Promise<void> {
  if (!options.cacheKeys) {
    options.cacheKeys = [];
  }

  // If no downlevelling required than just mangle code and return
  if (options.optimizeOnly) {
    return mangleOriginal(options);
  }

  // if code size is larger than 500kB, manually handle sourcemaps with newer source-map package.
  // babel currently uses an older version that still supports sync calls
  const codeSize = Buffer.byteLength(options.code, 'utf8');
  const manualSourceMaps = codeSize >= 500 * 1024;

  // downlevel the bundle
  let { code, map } = await transformAsync(options.code, {
    filename: options.filename,
    inputSourceMap: !manualSourceMaps && options.map !== undefined && JSON.parse(options.map),
    babelrc: false,
    // modules aren't needed since the bundles use webpacks custom module loading
    // loose generates more ES5-like code but does not strictly adhere to the ES2015 spec (Typescript is loose)
    // 'transform-typeof-symbol' generates slower code
    presets: [
      ['@babel/preset-env', { modules: false, loose: true, exclude: ['transform-typeof-symbol'] }],
    ],
    minified: true,
    sourceMaps: options.sourceMaps,
  });

  const newFilePath = options.filename.replace('es2015', 'es5');

  // Adjust lazy loaded scripts to point to the proper variant
  // Extra spacing is intentional to align source line positions
  if (options.runtime) {
    code = code.replace('"-es2015.', '   "-es5.');
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

  if (options.optimize) {
    // Note: Investigate converting the AST instead of re-parsing
    // estree -> terser is already supported; need babel -> estree/terser

    // Mangle downlevel code
    const result = minify(code, {
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

    if (result.error) {
      throw result.error;
    }

    code = result.code;
    map = result.map;

    // Mangle original code
    if (!options.ignoreOriginal) {
      await mangleOriginal(options);
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

  if (options.cachePath && options.cacheKeys[CacheKey.DownlevelCode]) {
    await cacache.put(options.cachePath, options.cacheKeys[CacheKey.DownlevelCode], code);
  }
  fs.writeFileSync(newFilePath, code);
}

async function mangleOriginal(options: ProcessBundleOptions): Promise<void> {
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

  if (options.cachePath && options.cacheKeys && options.cacheKeys[CacheKey.OriginalCode]) {
    await cacache.put(
      options.cachePath,
      options.cacheKeys[CacheKey.OriginalCode],
      resultOriginal.code,
    );
  }

  fs.writeFileSync(options.filename, resultOriginal.code);
}
