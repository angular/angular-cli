/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Connect, InlineConfig } from 'vite';
import type { ComponentStyleRecord } from '../../../tools/vite/middlewares';
import {
  ServerSsrMode,
  createAngularLocaleDataPlugin,
  createAngularMemoryPlugin,
  createAngularSetupMiddlewaresPlugin,
  createAngularSsrTransformPlugin,
  createRemoveIdPrefixPlugin,
} from '../../../tools/vite/plugins';
import { EsbuildLoaderOption, getDepOptimizationConfig } from '../../../tools/vite/utils';
import { loadProxyConfiguration } from '../../../utils';
import { loadEsmModule } from '../../../utils/load-esm';
import { type ApplicationBuilderInternalOptions, JavaScriptTransformer } from '../internal';
import type { NormalizedDevServerOptions } from '../options';
import { DevServerExternalResultMetadata, OutputAssetRecord, OutputFileRecord } from './utils';

// eslint-disable-next-line max-lines-per-function
export async function setupServer(
  serverOptions: NormalizedDevServerOptions,
  outputFiles: Map<string, OutputFileRecord>,
  assets: Map<string, OutputAssetRecord>,
  preserveSymlinks: boolean | undefined,
  externalMetadata: DevServerExternalResultMetadata,
  ssrMode: ServerSsrMode,
  prebundleTransformer: JavaScriptTransformer,
  target: string[],
  zoneless: boolean,
  componentStyles: Map<string, ComponentStyleRecord>,
  templateUpdates: Map<string, string>,
  prebundleLoaderExtensions: EsbuildLoaderOption | undefined,
  define: ApplicationBuilderInternalOptions['define'],
  extensionMiddleware?: Connect.NextHandleFunction[],
  indexHtmlTransformer?: (content: string) => Promise<string>,
  thirdPartySourcemaps = false,
): Promise<InlineConfig> {
  const proxy = await loadProxyConfiguration(
    serverOptions.workspaceRoot,
    serverOptions.proxyConfig,
  );

  // dynamically import Vite for ESM compatibility
  const { normalizePath } = await loadEsmModule<typeof import('vite')>('vite');

  // Path will not exist on disk and only used to provide separate path for Vite requests
  const virtualProjectRoot = normalizePath(
    join(serverOptions.workspaceRoot, `.angular/vite-root`, serverOptions.buildTarget.project),
  );

  // Files used for SSR warmup.
  let ssrFiles: string[] | undefined;
  switch (ssrMode) {
    case ServerSsrMode.InternalSsrMiddleware:
      ssrFiles = ['./main.server.mjs'];
      break;
    case ServerSsrMode.ExternalSsrMiddleware:
      ssrFiles = ['./main.server.mjs', './server.mjs'];
      break;
  }

  /**
   * Required when using `externalDependencies` to prevent Vite load errors.
   *
   * @note Can be removed if Vite introduces native support for externals.
   * @note Vite misresolves browser modules in SSR when accessing URLs with multiple segments
   *       (e.g., 'foo/bar'), as they are not correctly re-based from the base href.
   */
  const preTransformRequests =
    externalMetadata.explicitBrowser.length === 0 && ssrMode === ServerSsrMode.NoSsr;
  const cacheDir = join(serverOptions.cacheOptions.path, serverOptions.buildTarget.project, 'vite');
  const configuration: InlineConfig = {
    configFile: false,
    envFile: false,
    cacheDir,
    root: virtualProjectRoot,
    publicDir: false,
    esbuild: false,
    mode: 'development',
    // We use custom as we do not rely on Vite's htmlFallbackMiddleware and indexHtmlMiddleware.
    appType: 'custom',
    css: {
      devSourcemap: true,
    },
    // Ensure custom 'file' loader build option entries are handled by Vite in application code that
    // reference third-party libraries. Relative usage is handled directly by the build and not Vite.
    // Only 'file' loader entries are currently supported directly by Vite.
    assetsInclude:
      prebundleLoaderExtensions &&
      Object.entries(prebundleLoaderExtensions)
        .filter(([, value]) => value === 'file')
        // Create a file extension glob for each key
        .map(([key]) => '*' + key),
    // Vite will normalize the `base` option by adding a leading slash.
    base: serverOptions.servePath,
    resolve: {
      mainFields: ['es2020', 'browser', 'module', 'main'],
      preserveSymlinks,
    },
    dev: {
      preTransformRequests,
    },
    server: {
      preTransformRequests,
      warmup: {
        ssrFiles,
      },
      port: serverOptions.port,
      strictPort: true,
      host: serverOptions.host,
      open: serverOptions.open,
      allowedHosts: serverOptions.allowedHosts,
      headers: serverOptions.headers,
      // Disable the websocket if live reload is disabled (false/undefined are the only valid values)
      ws: serverOptions.liveReload === false && serverOptions.hmr === false ? false : undefined,
      // When server-side rendering (SSR) is enabled togather with SSL and Express is being used,
      // we must configure Vite to use HTTP/1.1.
      // This is necessary because Express does not support HTTP/2.
      // We achieve this by defining an empty proxy.
      // See: https://github.com/vitejs/vite/blob/c4b532cc900bf988073583511f57bd581755d5e3/packages/vite/src/node/http.ts#L106
      proxy:
        serverOptions.ssl && ssrMode === ServerSsrMode.ExternalSsrMiddleware
          ? (proxy ?? {})
          : proxy,
      cors: {
        // This will add the header `Access-Control-Allow-Origin: http://example.com`,
        // where `http://example.com` is the requesting origin.
        origin: true,
        // Allow preflight requests to be proxied.
        preflightContinue: true,
      },
      // File watching is handled by the build directly. `null` disables file watching for Vite.
      watch: null,
      fs: {
        // Ensure cache directory, node modules, and all assets are accessible by the client.
        // The first two are required for Vite to function in prebundling mode (the default) and to load
        // the Vite client-side code for browser reloading. These would be available by default but when
        // the `allow` option is explicitly configured, they must be included manually.
        allow: [
          cacheDir,
          join(serverOptions.workspaceRoot, 'node_modules'),
          ...[...assets.values()].map(({ source }) => source),
        ],
      },
    },
    ssr: {
      // Note: `true` and `/.*/` have different sematics. When true, the `external` option is ignored.
      noExternal: /.*/,
      // Exclude any Node.js built in module and provided dependencies (currently build defined externals)
      external: externalMetadata.explicitServer,
      optimizeDeps: getDepOptimizationConfig({
        // Only enable with caching since it causes prebundle dependencies to be cached
        disabled: serverOptions.prebundle === false,
        // Exclude any explicitly defined dependencies (currently build defined externals and node.js built-ins)
        exclude: externalMetadata.explicitServer,
        // Include all implict dependencies from the external packages internal option
        include: externalMetadata.implicitServer,
        ssr: true,
        prebundleTransformer,
        zoneless,
        target,
        loader: prebundleLoaderExtensions,
        thirdPartySourcemaps,
        define,
      }),
    },
    plugins: [
      createAngularLocaleDataPlugin(),
      createAngularSetupMiddlewaresPlugin({
        outputFiles,
        assets,
        indexHtmlTransformer,
        extensionMiddleware,
        componentStyles,
        templateUpdates,
        ssrMode,
        resetComponentUpdates: () => templateUpdates.clear(),
        projectRoot: serverOptions.projectRoot,
      }),
      createRemoveIdPrefixPlugin(externalMetadata.explicitBrowser),
      await createAngularSsrTransformPlugin(serverOptions.workspaceRoot),
      await createAngularMemoryPlugin({
        virtualProjectRoot,
        outputFiles,
        templateUpdates,
        external: externalMetadata.explicitBrowser,
        disableViteTransport: !serverOptions.liveReload,
      }),
    ],
    // Browser only optimizeDeps. (This does not run for SSR dependencies).
    optimizeDeps: getDepOptimizationConfig({
      // Only enable with caching since it causes prebundle dependencies to be cached
      disabled: serverOptions.prebundle === false,
      // Exclude any explicitly defined dependencies (currently build defined externals)
      exclude: externalMetadata.explicitBrowser,
      // Include all implict dependencies from the external packages internal option
      include: externalMetadata.implicitBrowser,
      ssr: false,
      prebundleTransformer,
      target,
      zoneless,
      loader: prebundleLoaderExtensions,
      thirdPartySourcemaps,
      define,
    }),
  };

  if (serverOptions.ssl) {
    if (serverOptions.sslCert && serverOptions.sslKey) {
      configuration.server ??= {};
      // server configuration is defined above
      configuration.server.https = {
        cert: await readFile(serverOptions.sslCert),
        key: await readFile(serverOptions.sslKey),
      };
    } else {
      const { default: basicSslPlugin } = await import('@vitejs/plugin-basic-ssl');
      configuration.plugins ??= [];
      configuration.plugins.push(basicSslPlugin());
    }
  }

  return configuration;
}
