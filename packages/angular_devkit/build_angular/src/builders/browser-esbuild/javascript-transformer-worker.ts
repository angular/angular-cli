/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { transformAsync } from '@babel/core';
import { readFile } from 'node:fs/promises';
import angularApplicationPreset from '../../babel/presets/application';
import { requiresLinking } from '../../babel/webpack-loader';
import { loadEsmModule } from '../../utils/load-esm';

interface JavaScriptTransformRequest {
  filename: string;
  data: string;
  sourcemap: boolean;
  thirdPartySourcemaps: boolean;
  advancedOptimizations: boolean;
  forceAsyncTransformation?: boolean;
  skipLinker: boolean;
  jit: boolean;
}

export default async function transformJavaScript(
  request: JavaScriptTransformRequest,
): Promise<Uint8Array> {
  request.data ??= await readFile(request.filename, 'utf-8');
  const transformedData = await transformWithBabel(request);

  return Buffer.from(transformedData, 'utf-8');
}

let linkerPluginCreator:
  | typeof import('@angular/compiler-cli/linker/babel').createEs2015LinkerPlugin
  | undefined;

async function transformWithBabel({
  filename,
  data,
  ...options
}: JavaScriptTransformRequest): Promise<string> {
  const forceAsyncTransformation =
    options.forceAsyncTransformation ??
    (!/[\\/][_f]?esm2015[\\/]/.test(filename) && /async(?:\s+function)?\s*\*/.test(data));
  const shouldLink = !options.skipLinker && (await requiresLinking(filename, data));
  const useInputSourcemap =
    options.sourcemap &&
    (!!options.thirdPartySourcemaps || !/[\\/]node_modules[\\/]/.test(filename));

  // If no additional transformations are needed, return the data directly
  if (!forceAsyncTransformation && !options.advancedOptimizations && !shouldLink) {
    // Strip sourcemaps if they should not be used
    return useInputSourcemap ? data : data.replace(/^\/\/# sourceMappingURL=[^\r\n]*/gm, '');
  }

  // @angular/platform-server/init entry-point has side-effects.
  const safeAngularPackage =
    /[\\/]node_modules[\\/]@angular[\\/]/.test(filename) &&
    !/@angular[\\/]platform-server[\\/]f?esm2022[\\/]init/.test(filename);

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
          forceAsyncTransformation,
          optimize: options.advancedOptimizations && {
            pureTopLevel: safeAngularPackage,
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
