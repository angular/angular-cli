/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import remapping, { type DecodedSourceMap, type EncodedSourceMap } from '@ampproject/remapping';
import { type PluginItem, transformAsync } from '@babel/core';
import { createRequire } from 'node:module';
import Piscina from 'piscina';
import { useBabelLinker } from '../../utils/environment-options.js';
import { loadInputSourceMap, removeSourceMappingURL } from '../../utils/source-map';

interface JavaScriptTransformRequest {
  filename: string;
  data: string | Uint8Array;
  sourcemap: boolean;
  thirdPartySourcemaps: boolean;
  advancedOptimizations: boolean;
  skipLinker?: boolean;
  sideEffects?: boolean;
  jit: boolean;
  instrumentForCoverage?: boolean;
}

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

/**
 * The function name prefix for all Angular partial compilation functions.
 * Used to determine if linking of a JavaScript file is required.
 * If any additional declarations are added or otherwise changed in the linker,
 * the names MUST begin with this prefix.
 */
const LINKER_DECLARATION_PREFIX = 'ɵɵngDeclare';

async function instrumentCoverage(
  filename: string,
  data: string,
  useInputSourcemap: boolean,
): Promise<{ code: string; map?: EncodedSourceMap }> {
  try {
    let resolvedPath = 'istanbul-lib-instrument';
    try {
      const requireFn = createRequire(filename);
      resolvedPath = requireFn.resolve('istanbul-lib-instrument');
    } catch {
      // Fallback to pool worker import traversal
    }

    const { createInstrumenter } = (await import(
      resolvedPath
    )) as typeof import('istanbul-lib-instrument');
    const instrumenter = createInstrumenter({
      produceSourceMap: useInputSourcemap,
      esModules: true,
    });

    const inputSourceMap = useInputSourcemap ? loadInputSourceMap(filename, data) : undefined;
    const instrumentedCode = instrumenter.instrumentSync(
      data,
      filename,
      inputSourceMap as Parameters<typeof instrumenter.instrumentSync>[2],
    );
    const lastMap = useInputSourcemap
      ? (instrumenter.lastSourceMap() as EncodedSourceMap)
      : undefined;

    return {
      code: instrumentedCode,
      map: lastMap ?? undefined,
    };
  } catch (error) {
    throw new Error(
      `The 'istanbul-lib-instrument' package is required for code coverage but was not found. Please install the package.`,
      { cause: error },
    );
  }
}

export default async function transformJavaScript(
  request: JavaScriptTransformRequest,
): Promise<unknown> {
  const { filename, data, ...options } = request;
  const textData = typeof data === 'string' ? data : textDecoder.decode(data);

  const transformedData = await transformJavaScriptImpl(filename, textData, options);

  // Transfer the data via `move` instead of cloning
  return Piscina.move(textEncoder.encode(transformedData));
}

/**
 * Cached instance of the OXC linker module.
 */
let oxcLinkerModule: typeof import('../angular/linker/oxc-linker.js') | undefined;

/**
 * Cached instance of the OXC transform module.
 */
let oxcTransformModule: typeof import('../oxc/oxc-transform.js') | undefined;

async function transformJavaScriptImpl(
  filename: string,
  data: string,
  options: Omit<JavaScriptTransformRequest, 'filename' | 'data'>,
): Promise<string> {
  const shouldLink = !options.skipLinker && requiresLinking(filename, data);
  const useInputSourcemap =
    options.sourcemap &&
    (!!options.thirdPartySourcemaps || !/[\\/]node_modules[\\/]/.test(filename));

  let code = data;
  const maps: (DecodedSourceMap | EncodedSourceMap)[] = [];
  let coverageMap: EncodedSourceMap | undefined;

  if (options.instrumentForCoverage) {
    const result = await instrumentCoverage(filename, code, useInputSourcemap);
    code = result.code;
    coverageMap = result.map;
  }

  if (shouldLink) {
    if (useBabelLinker) {
      const { createEs2015LinkerPlugin } = await import('@angular/compiler-cli/linker/babel');
      const { ConsoleLogger, LogLevel } = await import('@angular/compiler-cli');

      const result = await transformAsync(code, {
        filename,
        inputSourceMap: false,
        sourceMaps: !!useInputSourcemap,
        compact: false,
        configFile: false,
        babelrc: false,
        browserslistConfigFile: false,
        plugins: [
          createEs2015LinkerPlugin({
            fileSystem: {
              exists: () => false,
              readFile: () => '',
              resolve: (...paths: string[]) => paths.join('/'),
              dirname: (path: string) => path.split('/').slice(0, -1).join('/'),
              relative: (_from: string, to: string) => to,
            } as never,
            logger: new ConsoleLogger(LogLevel.info),
            linkerJitMode: options.jit,
            // This is a workaround until https://github.com/angular/angular/issues/42769 is fixed.
            sourceMapping: false,
          }) as PluginItem,
        ],
      });

      code = result?.code ?? code;
      if (result?.map) {
        maps.push(result.map as EncodedSourceMap);
      }
    } else {
      oxcLinkerModule ??= await import('../angular/linker/oxc-linker.js');
      const result = oxcLinkerModule.linkWithOxc(filename, code, {
        sourcemap: useInputSourcemap,
        jit: options.jit,
        skipCheck: true,
      });
      code = result.code;
      if (result.map) {
        maps.push(result.map);
      }
    }
  }

  // Run advanced optimizations using our fast oxc-transform
  if (options.advancedOptimizations) {
    oxcTransformModule ??= await import('../oxc/oxc-transform.js');
    const sideEffectFree = options.sideEffects === false;
    const safeAngularPackage =
      sideEffectFree && /[\\/]node_modules[\\/]@angular[\\/]/.test(filename);
    const topLevelSafeMode = !safeAngularPackage;

    const result = oxcTransformModule.transform(filename, code, {
      sourcemap: useInputSourcemap,
      sideEffects: options.sideEffects,
      topLevelSafeMode,
    });
    code = result.code;
    if (result.map) {
      maps.push(result.map);
    }
  }

  if (useInputSourcemap) {
    const baseMap = coverageMap ?? loadInputSourceMap(filename, data);
    if (maps.length > 0 || coverageMap) {
      code = removeSourceMappingURL(code);
      const remappingChain: (DecodedSourceMap | EncodedSourceMap)[] = maps.reverse();
      if (baseMap) {
        remappingChain.push(baseMap);
      }

      if (remappingChain.length > 0) {
        const finalMap = remapping(remappingChain, () => null).toString();
        const base64Map = Buffer.from(finalMap).toString('base64');
        code += `\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,${base64Map}`;
      }
    }

    return code;
  }

  // Strip sourcemaps if they should not be used
  return removeSourceMappingURL(code);
}

function requiresLinking(path: string, source: string): boolean {
  // @angular/core and @angular/compiler will cause false positives
  // Also, TypeScript files do not require linking
  if (/[\\/]@angular[\\/](?:compiler|core)|\.tsx?$/.test(path)) {
    return false;
  }

  // Check if the source code includes one of the declaration functions.
  // There is a low chance of a false positive but the names are fairly unique
  // and the result would be an unnecessary no-op additional plugin pass.
  return source.includes(LINKER_DECLARATION_PREFIX);
}
