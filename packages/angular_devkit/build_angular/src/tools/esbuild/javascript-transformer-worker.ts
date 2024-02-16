/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { transformAsync } from '@babel/core';
import Piscina from 'piscina';
import angularApplicationPreset, { requiresLinking } from '../../tools/babel/presets/application';
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

let linkerPluginCreator:
  | typeof import('@angular/compiler-cli/linker/babel').createEs2015LinkerPlugin
  | undefined;

async function transformWithBabel(
  filename: string,
  data: string,
  options: Omit<JavaScriptTransformRequest, 'filename' | 'data'>,
): Promise<string> {
  const shouldLink = !options.skipLinker && (await requiresLinking(filename, data));
  const useInputSourcemap =
    options.sourcemap &&
    (!!options.thirdPartySourcemaps || !/[\\/]node_modules[\\/]/.test(filename));

  // If no additional transformations are needed, return the data directly
  if (!options.advancedOptimizations && !shouldLink) {
    // Strip sourcemaps if they should not be used
    return useInputSourcemap ? data : data.replace(/^\/\/# sourceMappingURL=[^\r\n]*/gm, '');
  }

  const sideEffectFree = options.sideEffects === false;
  const safeAngularPackage = sideEffectFree && /[\\/]node_modules[\\/]@angular[\\/]/.test(filename);

  // Lazy load the linker plugin only when linking is required
  if (shouldLink) {
    linkerPluginCreator ??= (
      await loadEsmModule<typeof import('@angular/compiler-cli/linker/babel')>(
        '@angular/compiler-cli/linker/babel',
      )
    ).createEs2015LinkerPlugin;
  }

  const result = await transformAsync(data, {
    filename,
    inputSourceMap: (useInputSourcemap ? undefined : false) as undefined,
    sourceMaps: useInputSourcemap ? 'inline' : false,
    compact: false,
    configFile: false,
    babelrc: false,
    browserslistConfigFile: false,
    plugins: [],
    presets: [
      [
        angularApplicationPreset,
        {
          angularLinker: linkerPluginCreator && {
            shouldLink,
            jitMode: options.jit,
            linkerPluginCreator,
          },
          optimize: options.advancedOptimizations && {
            pureTopLevel: safeAngularPackage,
            wrapDecorators: sideEffectFree,
          },
        },
      ],
    ],
  });

  const outputCode = result?.code ?? data;

  // Strip sourcemaps if they should not be used.
  // Babel will keep the original comments even if sourcemaps are disabled.
  return useInputSourcemap
    ? outputCode
    : outputCode.replace(/^\/\/# sourceMappingURL=[^\r\n]*/gm, '');
}
