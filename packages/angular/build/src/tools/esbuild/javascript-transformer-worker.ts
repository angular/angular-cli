/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { type PluginItem, transformAsync } from '@babel/core';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import Piscina from 'piscina';
import { removeSourceMappingURL } from '../../utils/source-map';

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
 * Cached instance of the compiler-cli linker's createEs2015LinkerPlugin function.
 */
let linkerPluginCreator:
  typeof import('@angular/compiler-cli/linker/babel').createEs2015LinkerPlugin | undefined;

async function transformJavaScriptImpl(
  filename: string,
  data: string,
  options: Omit<JavaScriptTransformRequest, 'filename' | 'data'>,
): Promise<string> {
  const shouldLink = !options.skipLinker && (await requiresLinking(filename, data));
  const useInputSourcemap =
    options.sourcemap &&
    (!!options.thirdPartySourcemaps || !/[\\/]node_modules[\\/]/.test(filename));

  const babelPlugins: PluginItem[] = [];

  if (options.instrumentForCoverage) {
    try {
      let resolvedPath = 'istanbul-lib-instrument';
      try {
        const requireFn = createRequire(filename);
        resolvedPath = requireFn.resolve('istanbul-lib-instrument');
      } catch {
        // Fallback to pool worker import traversal
      }

      const istanbul = await import(resolvedPath);
      const programVisitor = istanbul.programVisitor ?? istanbul.default?.programVisitor;

      if (!programVisitor) {
        throw new Error('programVisitor is not available in istanbul-lib-instrument.');
      }

      const { default: coveragePluginFactory } =
        await import('../babel/plugins/add-code-coverage.js');
      babelPlugins.push(coveragePluginFactory(programVisitor) as unknown as PluginItem);
    } catch (error) {
      throw new Error(
        `The 'istanbul-lib-instrument' package is required for code coverage but was not found. Please install the package.`,
        { cause: error },
      );
    }
  }

  if (shouldLink) {
    // Lazy load the linker plugin only when linking is required
    const linkerPlugin = await createLinkerPlugin(options);
    babelPlugins.push(linkerPlugin as unknown as PluginItem);
  }

  let code = data;

  // If Babel is needed, run it first
  if (babelPlugins.length > 0) {
    const result = await transformAsync(code, {
      filename,
      inputSourceMap: (useInputSourcemap ? undefined : false) as undefined,
      sourceMaps: useInputSourcemap ? 'inline' : false,
      compact: false,
      configFile: false,
      babelrc: false,
      browserslistConfigFile: false,
      plugins: babelPlugins,
    });
    code = result?.code ?? code;
  }

  // Run advanced optimizations using our fast oxc-transform
  if (options.advancedOptimizations) {
    const { transform } = await import('../babel/plugins/oxc-transform.js');
    const sideEffectFree = options.sideEffects === false;
    const safeAngularPackage =
      sideEffectFree && /[\\/]node_modules[\\/]@angular[\\/]/.test(filename);
    const topLevelSafeMode = !safeAngularPackage;

    const result = transform(filename, code, {
      sourcemap: useInputSourcemap,
      sideEffects: options.sideEffects,
      jit: options.jit,
      topLevelSafeMode,
    });
    code = result.code;

    if (useInputSourcemap && result.map) {
      // Strip old source map comment if Babel added one
      code = removeSourceMappingURL(code);
      const base64Map = Buffer.from(result.map).toString('base64');
      code += `\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,${base64Map}`;
    }
  }

  // Strip sourcemaps if they should not be used
  return useInputSourcemap ? code : removeSourceMappingURL(code);
}

async function requiresLinking(path: string, source: string): Promise<boolean> {
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

async function createLinkerPlugin(options: Omit<JavaScriptTransformRequest, 'filename' | 'data'>) {
  linkerPluginCreator ??= (await import('@angular/compiler-cli/linker/babel'))
    .createEs2015LinkerPlugin;

  const linkerPlugin = linkerPluginCreator({
    linkerJitMode: options.jit,
    // This is a workaround until https://github.com/angular/angular/issues/42769 is fixed.
    sourceMapping: false,
    logger: {
      level: 1, // Info level
      debug(...args: string[]) {
        // eslint-disable-next-line no-console
        console.debug(args);
      },
      info(...args: string[]) {
        // eslint-disable-next-line no-console
        console.info(args);
      },
      warn(...args: string[]) {
        // eslint-disable-next-line no-console
        console.warn(args);
      },
      error(...args: string[]) {
        // eslint-disable-next-line no-console
        console.error(args);
      },
    },
    fileSystem: {
      resolve: path.resolve,
      exists: fs.existsSync,
      dirname: path.dirname,
      relative: path.relative,
      readFile: fs.readFileSync,
      // Node.JS types don't overlap the Compiler types.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  });

  return linkerPlugin;
}
