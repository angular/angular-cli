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
import { workerData } from 'node:worker_threads';
import Piscina from 'piscina';
import { useBabelLinker } from '../../utils/environment-options.js';
import {
  findTrailingSourceMapComment,
  isTrailingSourceMapComment,
  loadInputSourceMap,
  loadInputSourceMapFromUrl,
  removeSourceMappingURL,
} from '../../utils/source-map';
import { transform as transformWithOxc } from '../oxc/oxc-transform.js';
import {
  JavaScriptTransformFlags,
  type JavaScriptTransformerOptions,
} from './javascript-transformer';

export interface JavaScriptTransformRequest {
  filename: string;
  data: string | Uint8Array;
  flags?: JavaScriptTransformFlags | number;
  skipLinker?: boolean;
  sideEffects?: boolean;
  instrumentForCoverage?: boolean;
  sourcemap?: boolean;
  thirdPartySourcemaps?: boolean;
  advancedOptimizations?: boolean;
  jit?: boolean;
}

interface TransformOptions extends Omit<JavaScriptTransformRequest, 'filename' | 'data'> {
  inputSourceMap?: EncodedSourceMap;
  isAlreadyStripped?: boolean;
}

const {
  sourcemap = false,
  thirdPartySourcemaps = false,
  advancedOptimizations = false,
  jit = false,
} = (workerData || {}) as Partial<JavaScriptTransformerOptions>;

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

function maybeMove<T>(value: T): T {
  return process.versions.pnp ? value : (Piscina.move(value as never) as T);
}

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
  const { filename, data, flags } = request;

  let reqSourcemap: boolean;
  let reqThirdPartySourcemaps: boolean;
  let reqAdvancedOptimizations: boolean;
  let reqJit: boolean;
  let reqSkipLinker: boolean;
  let reqInstrumentForCoverage: boolean;
  let reqSideEffects: boolean | undefined;

  if (flags !== undefined) {
    reqSourcemap = (flags & JavaScriptTransformFlags.Sourcemap) !== 0;
    reqThirdPartySourcemaps = (flags & JavaScriptTransformFlags.ThirdPartySourcemaps) !== 0;
    reqAdvancedOptimizations = (flags & JavaScriptTransformFlags.AdvancedOptimizations) !== 0;
    reqJit = (flags & JavaScriptTransformFlags.Jit) !== 0;
    reqSkipLinker = (flags & JavaScriptTransformFlags.SkipLinker) !== 0;
    reqInstrumentForCoverage = (flags & JavaScriptTransformFlags.InstrumentForCoverage) !== 0;
    reqSideEffects =
      (flags & JavaScriptTransformFlags.SideEffectsSet) !== 0
        ? (flags & JavaScriptTransformFlags.SideEffectsValue) !== 0
        : undefined;
  } else {
    reqSourcemap = request.sourcemap ?? sourcemap;
    reqThirdPartySourcemaps = request.thirdPartySourcemaps ?? thirdPartySourcemaps;
    reqAdvancedOptimizations = request.advancedOptimizations ?? advancedOptimizations;
    reqJit = request.jit ?? jit;
    reqSkipLinker = request.skipLinker ?? false;
    reqInstrumentForCoverage = request.instrumentForCoverage ?? false;
    reqSideEffects = request.sideEffects;
  }

  const useInputSourcemap =
    reqSourcemap && (!!reqThirdPartySourcemaps || !/[\\/]node_modules[\\/]/.test(filename));

  let textData: string;
  let inputSourceMap: EncodedSourceMap | undefined;
  let isAlreadyStripped = false;
  let trailing: ReturnType<typeof findTrailingSourceMapComment> = null;

  if (typeof data !== 'string') {
    trailing = findTrailingSourceMapComment(data);
    if (trailing === null) {
      // 0 comments: fast path, no sourcemap to load or strip
      textData = textDecoder.decode(data);
      isAlreadyStripped = true;
    } else if (trailing !== undefined) {
      if (useInputSourcemap) {
        inputSourceMap = loadInputSourceMapFromUrl(filename, trailing.urlLine);
        if (inputSourceMap !== undefined) {
          // Valid trailing sourcemap comment confirmed: safe to slice code buffer for transformation passes.
          // Note: If no passes modify the code, the untouched original `data` buffer is returned below.
          textData = textDecoder.decode(trailing.code);
          isAlreadyStripped = true;
        } else {
          // Not a valid trailing sourcemap (e.g. inside template literal): fallback to full decode
          textData = textDecoder.decode(data);
        }
      } else if (isTrailingSourceMapComment(trailing.urlLine)) {
        // Valid trailing sourcemap comment confirmed: safe to slice code buffer
        textData = textDecoder.decode(trailing.code);
        isAlreadyStripped = true;
      } else {
        // Fallback to full decode and state-machine stripping
        textData = textDecoder.decode(data);
      }
    } else {
      // Multiple comments or comment not at line start: fall back to full decode and string parser
      textData = textDecoder.decode(data);
    }
  } else {
    textData = data;
  }

  const transformedData = await transformJavaScriptImpl(filename, textData, {
    skipLinker: reqSkipLinker,
    sideEffects: reqSideEffects,
    instrumentForCoverage: reqInstrumentForCoverage,
    sourcemap: reqSourcemap,
    thirdPartySourcemaps: reqThirdPartySourcemaps,
    advancedOptimizations: reqAdvancedOptimizations,
    jit: reqJit,
    inputSourceMap,
    isAlreadyStripped,
  });

  // If no transformations modified the code, return the original untouched data buffer via `move`
  // only if no sourcemap comment needed to be stripped (i.e. comment was absent or sourcemaps are preserved).
  const canReturnOriginal = trailing === null || useInputSourcemap;
  if (transformedData === textData && typeof data !== 'string' && canReturnOriginal) {
    return maybeMove(data);
  }

  return maybeMove(textEncoder.encode(transformedData));
}

async function transformJavaScriptImpl(
  filename: string,
  data: string,
  options: TransformOptions,
): Promise<string> {
  const shouldLink = !options.skipLinker;
  const optSourcemap = !!options.sourcemap;
  const optThirdPartySourcemaps = !!options.thirdPartySourcemaps;
  const optAdvancedOptimizations = !!options.advancedOptimizations;
  const optJit = !!options.jit;

  const useInputSourcemap =
    optSourcemap && (!!optThirdPartySourcemaps || !/[\\/]node_modules[\\/]/.test(filename));

  let code = data;
  const maps: (DecodedSourceMap | EncodedSourceMap)[] = [];
  let coverageMap: EncodedSourceMap | undefined;

  if (options.instrumentForCoverage) {
    const result = await instrumentCoverage(filename, code, useInputSourcemap);
    code = result.code;
    coverageMap = result.map;
  }

  if (shouldLink && useBabelLinker) {
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
          linkerJitMode: optJit,
          // This is a workaround until https://github.com/angular/angular/issues/42769 is fixed.
          sourceMapping: false,
        }) as PluginItem,
      ],
    });

    code = result?.code ?? code;
    if (result?.map) {
      maps.push(result.map as EncodedSourceMap);
    }
  }

  // Run Oxc linking and/or advanced optimizations in a single unified AST traversal pass
  const oxcLink = shouldLink && !useBabelLinker;
  if (oxcLink || optAdvancedOptimizations) {
    const sideEffectFree = options.sideEffects === false;
    const safeAngularPackage =
      sideEffectFree && /[\\/]node_modules[\\/]@angular[\\/]/.test(filename);
    const topLevelSafeMode = !safeAngularPackage;

    const result = transformWithOxc(filename, code, {
      link: oxcLink,
      jit: optJit,
      advancedOptimizations: optAdvancedOptimizations,
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
    const baseMap = coverageMap ?? options.inputSourceMap ?? loadInputSourceMap(filename, data);
    if (maps.length > 0 || coverageMap) {
      if (!options.isAlreadyStripped) {
        code = removeSourceMappingURL(code);
      }
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
  return options.isAlreadyStripped ? code : removeSourceMappingURL(code);
}
