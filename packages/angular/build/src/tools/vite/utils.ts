/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { lookup as lookupMimeType } from 'mrmime';
import { isBuiltin } from 'node:module';
import { extname } from 'node:path';
import type { DepOptimizationConfig } from 'vite';
import { JavaScriptTransformer } from '../esbuild/javascript-transformer';
import { getFeatureSupport } from '../esbuild/utils';

export type AngularMemoryOutputFiles = Map<
  string,
  { contents: Uint8Array; hash: string; servable: boolean }
>;

export function pathnameWithoutBasePath(url: string, basePath: string): string {
  const parsedUrl = new URL(url, 'http://localhost');
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // slice(basePath.length - 1) to retain the trailing slash
  return basePath !== '/' && pathname.startsWith(basePath)
    ? pathname.slice(basePath.length - 1)
    : pathname;
}

export function lookupMimeTypeFromRequest(url: string): string | undefined {
  const extension = extname(url.split('?')[0]);

  if (extension === '.ico') {
    return 'image/x-icon';
  }

  return extension && lookupMimeType(extension);
}

type ViteEsBuildPlugin = NonNullable<
  NonNullable<DepOptimizationConfig['esbuildOptions']>['plugins']
>[0];

export type EsbuildLoaderOption = Exclude<
  DepOptimizationConfig['esbuildOptions'],
  undefined
>['loader'];

export function getDepOptimizationConfig({
  disabled,
  exclude,
  include,
  target,
  zoneless,
  prebundleTransformer,
  ssr,
  loader,
  thirdPartySourcemaps,
}: {
  disabled: boolean;
  exclude: string[];
  include: string[];
  target: string[];
  prebundleTransformer: JavaScriptTransformer;
  ssr: boolean;
  zoneless: boolean;
  loader?: EsbuildLoaderOption;
  thirdPartySourcemaps: boolean;
}): DepOptimizationConfig {
  const plugins: ViteEsBuildPlugin[] = [
    {
      name: `angular-vite-optimize-deps${ssr ? '-ssr' : ''}${
        thirdPartySourcemaps ? '-vendor-sourcemap' : ''
      }`,
      setup(build) {
        build.onLoad({ filter: /\.[cm]?js$/ }, async (args) => {
          return {
            contents: await prebundleTransformer.transformFile(args.path),
            loader: 'js',
          };
        });
      },
    },
  ];

  return {
    // Exclude any explicitly defined dependencies (currently build defined externals)
    exclude,
    // NB: to disable the deps optimizer, set optimizeDeps.noDiscovery to true and optimizeDeps.include as undefined.
    // Include all implict dependencies from the external packages internal option
    include: disabled ? undefined : include,
    noDiscovery: disabled,
    // Add an esbuild plugin to run the Angular linker on dependencies
    esbuildOptions: {
      // Set esbuild supported targets.
      target,
      supported: getFeatureSupport(target, zoneless),
      plugins,
      loader,
      define: {
        'ngServerMode': `${ssr}`,
      },
      resolveExtensions: ['.mjs', '.js', '.cjs'],
    },
  };
}
