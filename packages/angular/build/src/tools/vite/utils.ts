/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { lookup as lookupMimeType } from 'mrmime';
import { builtinModules, isBuiltin } from 'node:module';
import { extname } from 'node:path';
import type { DepOptimizationConfig } from 'vite' with {
  'resolution-mode': 'import',
};
import type { ExternalResultMetadata } from '../esbuild/bundler-execution-result';
import { JavaScriptTransformer } from '../esbuild/javascript-transformer';

export type AngularMemoryOutputFiles = Map<
  string,
  { contents: Uint8Array; hash: string; servable: boolean }
>;

export type AngularOutputAssets = Map<string, { source: string }>;

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

export type RolldownLoaderOption = Exclude<
  DepOptimizationConfig['rolldownOptions'],
  undefined
>['moduleTypes'];

export function getDepOptimizationConfig({
  disabled,
  exclude,
  include,
  prebundleTransformer,
  loader,
  thirdPartySourcemaps,
  define = {},
}: {
  disabled: boolean;
  exclude: string[];
  include: string[];
  prebundleTransformer: JavaScriptTransformer;
  loader?: RolldownLoaderOption;
  thirdPartySourcemaps: boolean;
  define: Record<string, string> | undefined;
}): DepOptimizationConfig {
  const config: DepOptimizationConfig = {
    // Exclude any explicitly defined dependencies (currently build defined externals)
    exclude,
    // NB: to disable the deps optimizer, set optimizeDeps.noDiscovery to true and optimizeDeps.include as undefined.
    // Include all implict dependencies from the external packages internal option
    include: disabled ? undefined : include,
    noDiscovery: disabled,
    rolldownOptions: {
      transform: {
        define,
      },
      moduleTypes: loader,
      resolve: {
        extensions: ['.mjs', '.js', '.cjs'],
      },
      plugins: [
        {
          name: `angular-vite-optimize-deps${thirdPartySourcemaps ? '-vendor-sourcemap' : ''}`,
          load: {
            filter: { id: /\.[cm]?js$/ },
            async handler(id: string) {
              const code = await prebundleTransformer.transformFile(id);

              return { code: Buffer.from(code).toString('utf-8') };
            },
          },
        },
      ],
    },
  };

  return config;
}

export interface DevServerExternalResultMetadata {
  implicitBrowser: string[];
  implicitServer: string[];
  explicitBrowser: string[];
  explicitServer: string[];
}

export function isAbsoluteUrl(url: string): boolean {
  try {
    new URL(url);

    return true;
  } catch {
    return false;
  }
}

export function updateExternalMetadata(
  result: { detail?: { externalMetadata?: ExternalResultMetadata } },
  externalMetadata: DevServerExternalResultMetadata,
  externalDependencies: string[] | undefined,
  explicitPackagesOnly: boolean = false,
): void {
  if (!result.detail?.['externalMetadata']) {
    return;
  }

  const { implicitBrowser, implicitServer, explicit } = result.detail['externalMetadata'];
  const implicitServerFiltered = implicitServer.filter(
    (m) => !isBuiltin(m) && !isAbsoluteUrl(m) && !m.endsWith('.json'),
  );
  const implicitBrowserFiltered = implicitBrowser.filter(
    (m) => !isAbsoluteUrl(m) && !m.endsWith('.json'),
  );
  const explicitBrowserFiltered = explicitPackagesOnly
    ? explicit.filter((m) => !isAbsoluteUrl(m))
    : explicit;

  // Empty Arrays to avoid growing unlimited with every re-build.
  externalMetadata.explicitBrowser.length = 0;
  externalMetadata.explicitServer.length = 0;
  externalMetadata.implicitServer.length = 0;
  externalMetadata.implicitBrowser.length = 0;

  const externalDeps = externalDependencies ?? [];
  externalMetadata.explicitBrowser.push(...explicitBrowserFiltered, ...externalDeps);
  externalMetadata.explicitServer.push(
    ...explicitBrowserFiltered,
    ...externalDeps,
    ...builtinModules,
  );
  externalMetadata.implicitServer.push(...implicitServerFiltered);
  externalMetadata.implicitBrowser.push(...implicitBrowserFiltered);

  // The below needs to be sorted as Vite uses these options as part of the hashing invalidation algorithm.
  // See: https://github.com/vitejs/vite/blob/0873bae0cfe0f0718ad2f5743dd34a17e4ab563d/packages/vite/src/node/optimizer/index.ts#L1203-L1239
  externalMetadata.explicitBrowser.sort();
  externalMetadata.explicitServer.sort();
  externalMetadata.implicitServer.sort();
  externalMetadata.implicitBrowser.sort();
}
