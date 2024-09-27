/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { type PluginItem, transformAsync } from '@babel/core';
import fs from 'node:fs';
import path from 'node:path';
import Piscina from 'piscina';
import { loadEsmModule } from '../../utils/load-esm';

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

export default async function transformJavaScript(
  request: JavaScriptTransformRequest,
): Promise<unknown> {
  const { filename, data, ...options } = request;
  const textData = typeof data === 'string' ? data : textDecoder.decode(data);

  const transformedData = await transformWithBabel(filename, textData, options);

  // Transfer the data via `move` instead of cloning
  return Piscina.move(textEncoder.encode(transformedData));
}

/**
 * Cached instance of the compiler-cli linker's createEs2015LinkerPlugin function.
 */
let linkerPluginCreator:
  | typeof import('@angular/compiler-cli/linker/babel').createEs2015LinkerPlugin
  | undefined;

/**
 * Cached instance of the compiler-cli linker's needsLinking function.
 */
let needsLinking: typeof import('@angular/compiler-cli/linker').needsLinking | undefined;

async function transformWithBabel(
  filename: string,
  data: string,
  options: Omit<JavaScriptTransformRequest, 'filename' | 'data'>,
): Promise<string> {
  const shouldLink = !options.skipLinker && (await requiresLinking(filename, data));
  const useInputSourcemap =
    options.sourcemap &&
    (!!options.thirdPartySourcemaps || !/[\\/]node_modules[\\/]/.test(filename));

  // @ts-expect-error Import attribute syntax plugin does not currently have type definitions
  const { default: importAttributePlugin } = await import('@babel/plugin-syntax-import-attributes');
  const plugins: PluginItem[] = [importAttributePlugin];

  if (options.instrumentForCoverage) {
    const { default: coveragePlugin } = await import('../babel/plugins/add-code-coverage.js');
    plugins.push(coveragePlugin);
  }

  if (shouldLink) {
    // Lazy load the linker plugin only when linking is required
    const linkerPlugin = await createLinkerPlugin(options);
    plugins.push(linkerPlugin);
  }

  if (options.advancedOptimizations) {
    const sideEffectFree = options.sideEffects === false;
    const safeAngularPackage =
      sideEffectFree && /[\\/]node_modules[\\/]@angular[\\/]/.test(filename);

    const { adjustStaticMembers, adjustTypeScriptEnums, elideAngularMetadata, markTopLevelPure } =
      await import('../babel/plugins');

    if (safeAngularPackage) {
      plugins.push(markTopLevelPure);
    }

    plugins.push(elideAngularMetadata, adjustTypeScriptEnums, [
      adjustStaticMembers,
      { wrapDecorators: sideEffectFree },
    ]);
  }

  // If no additional transformations are needed, return the data directly
  if (plugins.length === 0) {
    // Strip sourcemaps if they should not be used
    return useInputSourcemap ? data : data.replace(/^\/\/# sourceMappingURL=[^\r\n]*/gm, '');
  }

  const result = await transformAsync(data, {
    filename,
    inputSourceMap: (useInputSourcemap ? undefined : false) as undefined,
    sourceMaps: useInputSourcemap ? 'inline' : false,
    compact: false,
    configFile: false,
    babelrc: false,
    browserslistConfigFile: false,
    plugins,
  });

  const outputCode = result?.code ?? data;

  // Strip sourcemaps if they should not be used.
  // Babel will keep the original comments even if sourcemaps are disabled.
  return useInputSourcemap
    ? outputCode
    : outputCode.replace(/^\/\/# sourceMappingURL=[^\r\n]*/gm, '');
}

async function requiresLinking(path: string, source: string): Promise<boolean> {
  // @angular/core and @angular/compiler will cause false positives
  // Also, TypeScript files do not require linking
  if (/[\\/]@angular[\\/](?:compiler|core)|\.tsx?$/.test(path)) {
    return false;
  }

  if (!needsLinking) {
    // Load ESM `@angular/compiler-cli/linker` using the TypeScript dynamic import workaround.
    // Once TypeScript provides support for keeping the dynamic import this workaround can be
    // changed to a direct dynamic import.
    const linkerModule = await loadEsmModule<typeof import('@angular/compiler-cli/linker')>(
      '@angular/compiler-cli/linker',
    );
    needsLinking = linkerModule.needsLinking;
  }

  return needsLinking(path, source);
}

async function createLinkerPlugin(options: Omit<JavaScriptTransformRequest, 'filename' | 'data'>) {
  linkerPluginCreator ??= (
    await loadEsmModule<typeof import('@angular/compiler-cli/linker/babel')>(
      '@angular/compiler-cli/linker/babel',
    )
  ).createEs2015LinkerPlugin;

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
