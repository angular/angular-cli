/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { BuilderContext } from '@angular-devkit/architect';
import type { json, logging } from '@angular-devkit/core';
import type { Plugin } from 'esbuild';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Connect, DepOptimizationConfig, InlineConfig, ViteDevServer } from 'vite';
import { BuildOutputFile, BuildOutputFileType } from '../../tools/esbuild/bundler-context';
import { ExternalResultMetadata } from '../../tools/esbuild/bundler-execution-result';
import { JavaScriptTransformer } from '../../tools/esbuild/javascript-transformer';
import { createRxjsEsmResolutionPlugin } from '../../tools/esbuild/rxjs-esm-resolution-plugin';
import { getFeatureSupport, transformSupportedBrowsersToTargets } from '../../tools/esbuild/utils';
import { createAngularMemoryPlugin } from '../../tools/vite/angular-memory-plugin';
import { createAngularLocaleDataPlugin } from '../../tools/vite/i18n-locale-plugin';
import { loadProxyConfiguration, normalizeSourceMaps } from '../../utils';
import { loadEsmModule } from '../../utils/load-esm';
import { getSupportedBrowsers } from '../../utils/supported-browsers';
import { getIndexOutputFile } from '../../utils/webpack-browser-config';
import { buildApplicationInternal } from '../application';
import { ApplicationBuilderInternalOptions } from '../application/options';
import { buildEsbuildBrowser } from '../browser-esbuild';
import { Schema as BrowserBuilderOptions } from '../browser-esbuild/schema';
import type { NormalizedDevServerOptions } from './options';
import type { DevServerBuilderOutput } from './webpack-server';

interface OutputFileRecord {
  contents: Uint8Array;
  size: number;
  hash?: string;
  updated: boolean;
  servable: boolean;
}

// eslint-disable-next-line max-lines-per-function
export async function* serveWithVite(
  serverOptions: NormalizedDevServerOptions,
  builderName: string,
  context: BuilderContext,
  transformers?: {
    indexHtml?: (content: string) => Promise<string>;
  },
  extensions?: {
    middleware?: Connect.NextHandleFunction[];
    buildPlugins?: Plugin[];
  },
): AsyncIterableIterator<DevServerBuilderOutput> {
  // Get the browser configuration from the target name.
  const rawBrowserOptions = (await context.getTargetOptions(
    serverOptions.buildTarget,
  )) as json.JsonObject & BrowserBuilderOptions;

  // Deploy url is not used in the dev-server.
  delete rawBrowserOptions.deployUrl;

  const browserOptions = (await context.validateOptions(
    {
      ...rawBrowserOptions,
      watch: serverOptions.watch,
      poll: serverOptions.poll,
      verbose: serverOptions.verbose,
    } as json.JsonObject & BrowserBuilderOptions,
    builderName,
  )) as json.JsonObject & BrowserBuilderOptions;

  if (browserOptions.prerender || browserOptions.ssr) {
    // Disable prerendering if enabled and force SSR.
    // This is so instead of prerendering all the routes for every change, the page is "prerendered" when it is requested.
    browserOptions.prerender = false;

    // Avoid bundling and processing the ssr entry-point as this is not used by the dev-server.
    browserOptions.ssr = true;

    // https://nodejs.org/api/process.html#processsetsourcemapsenabledval
    process.setSourceMapsEnabled(true);
  }

  // Set all packages as external to support Vite's prebundle caching
  browserOptions.externalPackages = serverOptions.prebundle as json.JsonValue;

  const baseHref = browserOptions.baseHref;
  if (serverOptions.servePath === undefined && baseHref !== undefined) {
    // Remove trailing slash
    serverOptions.servePath =
      baseHref !== './' && baseHref[baseHref.length - 1] === '/' ? baseHref.slice(0, -1) : baseHref;
  }

  // The development server currently only supports a single locale when localizing.
  // This matches the behavior of the Webpack-based development server but could be expanded in the future.
  if (
    browserOptions.localize === true ||
    (Array.isArray(browserOptions.localize) && browserOptions.localize.length > 1)
  ) {
    context.logger.warn(
      'Localization (`localize` option) has been disabled. The development server only supports localizing a single locale per build.',
    );
    browserOptions.localize = false;
  } else if (browserOptions.localize) {
    // When localization is enabled with a single locale, force a flat path to maintain behavior with the existing Webpack-based dev server.
    browserOptions.forceI18nFlatOutput = true;
  }

  const { vendor: thirdPartySourcemaps } = normalizeSourceMaps(browserOptions.sourceMap ?? false);

  // Setup the prebundling transformer that will be shared across Vite prebundling requests
  const prebundleTransformer = new JavaScriptTransformer(
    // Always enable JIT linking to support applications built with and without AOT.
    // In a development environment the additional scope information does not
    // have a negative effect unlike production where final output size is relevant.
    { sourcemap: true, jit: true, thirdPartySourcemaps },
    1,
  );

  // Extract output index from options
  // TODO: Provide this info from the build results
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const htmlIndexPath = getIndexOutputFile(browserOptions.index as any);

  // dynamically import Vite for ESM compatibility
  const { createServer, normalizePath } = await loadEsmModule<typeof import('vite')>('vite');

  let server: ViteDevServer | undefined;
  let serverUrl: URL | undefined;
  let hadError = false;
  const generatedFiles = new Map<string, OutputFileRecord>();
  const assetFiles = new Map<string, string>();
  const externalMetadata: ExternalResultMetadata = {
    implicitBrowser: [],
    implicitServer: [],
    explicit: [],
  };

  // Add cleanup logic via a builder teardown.
  let deferred: () => void;
  context.addTeardown(async () => {
    await server?.close();
    await prebundleTransformer.close();
    deferred?.();
  });

  const build =
    builderName === '@angular-devkit/build-angular:browser-esbuild'
      ? buildEsbuildBrowser.bind(
          undefined,
          browserOptions,
          context,
          { write: false },
          extensions?.buildPlugins,
        )
      : buildApplicationInternal.bind(
          undefined,
          browserOptions as ApplicationBuilderInternalOptions,
          context,
          { write: false },
          { codePlugins: extensions?.buildPlugins },
        );

  // TODO: Switch this to an architect schedule call when infrastructure settings are supported
  for await (const result of build()) {
    assert(result.outputFiles, 'Builder did not provide result files.');

    // If build failed, nothing to serve
    if (!result.success) {
      // If server is active, send an error notification
      if (result.errors?.length && server) {
        hadError = true;
        server.ws.send({
          type: 'error',
          err: {
            message: result.errors[0].text,
            stack: '',
            loc: result.errors[0].location,
          },
        });
      }
      continue;
    } else if (hadError && server) {
      hadError = false;
      // Send an empty update to clear the error overlay
      server.ws.send({
        'type': 'update',
        updates: [],
      });
    }

    // Analyze result files for changes
    analyzeResultFiles(normalizePath, htmlIndexPath, result.outputFiles, generatedFiles);

    assetFiles.clear();
    if (result.assetFiles) {
      for (const asset of result.assetFiles) {
        assetFiles.set('/' + normalizePath(asset.destination), normalizePath(asset.source));
      }
    }

    // To avoid disconnecting the array objects from the option, these arrays need to be mutated instead of replaced.
    if (result.externalMetadata) {
      const { implicitBrowser, implicitServer, explicit } = result.externalMetadata;
      // Empty Arrays to avoid growing unlimited with every re-build.
      externalMetadata.explicit.length = 0;
      externalMetadata.implicitServer.length = 0;
      externalMetadata.implicitBrowser.length = 0;

      externalMetadata.explicit.push(...explicit);
      // Remove any absolute URLs (http://, https://, //) to avoid Vite's prebundling from processing them as files
      externalMetadata.implicitServer.push(
        ...(implicitServer as string[]).filter((value) => !/^(?:https?:)?\/\//.test(value)),
      );
      externalMetadata.implicitBrowser.push(
        ...(implicitBrowser as string[]).filter((value) => !/^(?:https?:)?\/\//.test(value)),
      );

      // The below needs to be sorted as Vite uses these options are part of the hashing invalidation algorithm.
      // See: https://github.com/vitejs/vite/blob/0873bae0cfe0f0718ad2f5743dd34a17e4ab563d/packages/vite/src/node/optimizer/index.ts#L1203-L1239
      externalMetadata.explicit.sort();
      externalMetadata.implicitServer.sort();
      externalMetadata.implicitBrowser.sort();
    }

    if (server) {
      // Update fs allow list to include any new assets from the build option.
      server.config.server.fs.allow = [
        ...new Set([...server.config.server.fs.allow, ...assetFiles.values()]),
      ];

      handleUpdate(normalizePath, generatedFiles, server, serverOptions, context.logger);
    } else {
      const projectName = context.target?.project;
      if (!projectName) {
        throw new Error('The builder requires a target.');
      }

      const { root = '' } = await context.getProjectMetadata(projectName);
      const projectRoot = join(context.workspaceRoot, root as string);
      const browsers = getSupportedBrowsers(projectRoot, context.logger);
      const target = transformSupportedBrowsersToTargets(browsers);

      // Setup server and start listening
      const serverConfiguration = await setupServer(
        serverOptions,
        generatedFiles,
        assetFiles,
        browserOptions.preserveSymlinks,
        externalMetadata,
        !!browserOptions.ssr,
        prebundleTransformer,
        target,
        browserOptions.loader as EsbuildLoaderOption | undefined,
        extensions?.middleware,
        transformers?.indexHtml,
        thirdPartySourcemaps,
      );

      server = await createServer(serverConfiguration);
      await server.listen();

      if (serverConfiguration.ssr?.optimizeDeps?.disabled === false) {
        /**
         * Vite will only start dependency optimization of SSR modules when the first request comes in.
         * In some cases, this causes a long waiting time. To mitigate this, we call `ssrLoadModule` to
         * initiate this process before the first request.
         *
         * NOTE: This will intentionally fail from the unknown module, but currently there is no other way
         * to initiate the SSR dep optimizer.
         */
        void server.ssrLoadModule('<deps-caller>').catch(() => {});
      }

      const urls = server.resolvedUrls;
      if (urls && (urls.local.length || urls.network.length)) {
        serverUrl = new URL(urls.local[0] ?? urls.network[0]);
      }

      // log connection information
      server.printUrls();

      server.bindCLIShortcuts({
        print: true,
        customShortcuts: [
          {
            key: 'r',
            description: 'force reload browser',
            action(server) {
              server.ws.send({
                type: 'full-reload',
                path: '*',
              });
            },
          },
        ],
      });
    }

    // TODO: adjust output typings to reflect both development servers
    yield {
      success: true,
      port: serverUrl?.port,
      baseUrl: serverUrl?.href,
    } as unknown as DevServerBuilderOutput;
  }

  await new Promise<void>((resolve) => (deferred = resolve));
}

function handleUpdate(
  normalizePath: (id: string) => string,
  generatedFiles: Map<string, OutputFileRecord>,
  server: ViteDevServer,
  serverOptions: NormalizedDevServerOptions,
  logger: logging.LoggerApi,
): void {
  const updatedFiles: string[] = [];

  // Invalidate any updated files
  for (const [file, record] of generatedFiles) {
    if (record.updated) {
      updatedFiles.push(file);
      const updatedModules = server.moduleGraph.getModulesByFile(
        normalizePath(join(server.config.root, file)),
      );
      updatedModules?.forEach((m) => server?.moduleGraph.invalidateModule(m));
    }
  }

  if (!updatedFiles.length) {
    return;
  }

  if (serverOptions.liveReload || serverOptions.hmr) {
    if (updatedFiles.every((f) => f.endsWith('.css'))) {
      const timestamp = Date.now();
      server.ws.send({
        type: 'update',
        updates: updatedFiles.map((filePath) => {
          return {
            type: 'css-update',
            timestamp,
            path: filePath,
            acceptedPath: filePath,
          };
        }),
      });

      logger.info('HMR update sent to client(s).');

      return;
    }
  }

  // Send reload command to clients
  if (serverOptions.liveReload) {
    server.ws.send({
      type: 'full-reload',
      path: '*',
    });

    logger.info('Page reload sent to client(s).');
  }
}

function analyzeResultFiles(
  normalizePath: (id: string) => string,
  htmlIndexPath: string,
  resultFiles: BuildOutputFile[],
  generatedFiles: Map<string, OutputFileRecord>,
) {
  const seen = new Set<string>(['/index.html']);
  for (const file of resultFiles) {
    let filePath;
    if (file.path === htmlIndexPath) {
      // Convert custom index output path to standard index path for dev-server usage.
      // This mimics the Webpack dev-server behavior.
      filePath = '/index.html';
    } else {
      filePath = '/' + normalizePath(file.path);
    }

    seen.add(filePath);

    // Skip analysis of sourcemaps
    if (filePath.endsWith('.map')) {
      generatedFiles.set(filePath, {
        contents: file.contents,
        servable:
          file.type === BuildOutputFileType.Browser || file.type === BuildOutputFileType.Media,
        size: file.contents.byteLength,
        updated: false,
      });

      continue;
    }

    const existingRecord = generatedFiles.get(filePath);
    if (
      existingRecord &&
      existingRecord.size === file.contents.byteLength &&
      existingRecord.hash === file.hash
    ) {
      // Same file
      existingRecord.updated = false;
      continue;
    }

    // New or updated file
    generatedFiles.set(filePath, {
      contents: file.contents,
      size: file.contents.byteLength,
      hash: file.hash,
      updated: true,
      servable:
        file.type === BuildOutputFileType.Browser || file.type === BuildOutputFileType.Media,
    });
  }

  // Clear stale output files
  for (const file of generatedFiles.keys()) {
    if (!seen.has(file)) {
      generatedFiles.delete(file);
    }
  }
}

export async function setupServer(
  serverOptions: NormalizedDevServerOptions,
  outputFiles: Map<string, OutputFileRecord>,
  assets: Map<string, string>,
  preserveSymlinks: boolean | undefined,
  externalMetadata: ExternalResultMetadata,
  ssr: boolean,
  prebundleTransformer: JavaScriptTransformer,
  target: string[],
  prebundleLoaderExtensions: EsbuildLoaderOption | undefined,
  extensionMiddleware?: Connect.NextHandleFunction[],
  indexHtmlTransformer?: (content: string) => Promise<string>,
  thirdPartySourcemaps = false,
): Promise<InlineConfig> {
  const proxy = await loadProxyConfiguration(
    serverOptions.workspaceRoot,
    serverOptions.proxyConfig,
    true,
  );

  // dynamically import Vite for ESM compatibility
  const { normalizePath } = await loadEsmModule<typeof import('vite')>('vite');

  // Path will not exist on disk and only used to provide separate path for Vite requests
  const virtualProjectRoot = normalizePath(
    join(serverOptions.workspaceRoot, `.angular/vite-root`, serverOptions.buildTarget.project),
  );

  const serverExplicitExternal = [
    ...(await import('node:module')).builtinModules,
    ...externalMetadata.explicit,
  ];

  const cacheDir = join(serverOptions.cacheOptions.path, 'vite');
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
    // Vite will normalize the `base` option by adding a leading slash.
    base: serverOptions.servePath,
    resolve: {
      mainFields: ['es2020', 'browser', 'module', 'main'],
      preserveSymlinks,
    },
    server: {
      port: serverOptions.port,
      strictPort: true,
      host: serverOptions.host,
      open: serverOptions.open,
      allowedHosts: serverOptions.allowedHosts,
      headers: serverOptions.headers,
      proxy,
      cors: {
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
        allow: [cacheDir, join(serverOptions.workspaceRoot, 'node_modules'), ...assets.values()],

        // Temporary disable cached FS checks.
        // This is because we configure `config.base` to a virtual directory which causes `getRealPath` to fail.
        // See: https://github.com/vitejs/vite/blob/b2873ac3936de25ca8784327cb9ef16bd4881805/packages/vite/src/node/fsUtils.ts#L45-L67
        cachedChecks: false,
      },
      // This is needed when `externalDependencies` is used to prevent Vite load errors.
      // NOTE: If Vite adds direct support for externals, this can be removed.
      preTransformRequests: externalMetadata.explicit.length === 0,
    },
    ssr: {
      // Note: `true` and `/.*/` have different sematics. When true, the `external` option is ignored.
      noExternal: /.*/,
      // Exclude any Node.js built in module and provided dependencies (currently build defined externals)
      external: serverExplicitExternal,
      optimizeDeps: getDepOptimizationConfig({
        /**
         * *********************************************
         * NOTE: Temporary disable 'optimizeDeps' for SSR.
         * *********************************************
         *
         * Currently this causes a number of issues.
         * - Deps are re-optimized everytime the server is started.
         * - Added deps after a rebuild are not optimized.
         * - Breaks RxJs (Unless it is added as external). See: https://github.com/angular/angular-cli/issues/26235
         */

        // Only enable with caching since it causes prebundle dependencies to be cached
        disabled: true, // serverOptions.prebundle === false,
        // Exclude any explicitly defined dependencies (currently build defined externals and node.js built-ins)
        exclude: serverExplicitExternal,
        // Include all implict dependencies from the external packages internal option
        include: externalMetadata.implicitServer,
        ssr: true,
        prebundleTransformer,
        target,
        loader: prebundleLoaderExtensions,
        thirdPartySourcemaps,
      }),
    },
    plugins: [
      createAngularLocaleDataPlugin(),
      createAngularMemoryPlugin({
        workspaceRoot: serverOptions.workspaceRoot,
        virtualProjectRoot,
        outputFiles,
        assets,
        ssr,
        extraHeaders: serverOptions.headers,
        external: externalMetadata.explicit,
        indexHtmlTransformer,
        extensionMiddleware,
        normalizePath,
      }),
    ],
    // Browser only optimizeDeps. (This does not run for SSR dependencies).
    optimizeDeps: getDepOptimizationConfig({
      // Only enable with caching since it causes prebundle dependencies to be cached
      disabled: serverOptions.prebundle === false,
      // Exclude any explicitly defined dependencies (currently build defined externals)
      exclude: externalMetadata.explicit,
      // Include all implict dependencies from the external packages internal option
      include: externalMetadata.implicitBrowser,
      ssr: false,
      prebundleTransformer,
      target,
      loader: prebundleLoaderExtensions,
      thirdPartySourcemaps,
    }),
  };

  if (serverOptions.ssl) {
    if (serverOptions.sslCert && serverOptions.sslKey) {
      // server configuration is defined above
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      configuration.server!.https = {
        cert: await readFile(serverOptions.sslCert),
        key: await readFile(serverOptions.sslKey),
      };
    } else {
      const { default: basicSslPlugin } = await import('@vitejs/plugin-basic-ssl');
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      configuration.plugins ??= [];
      configuration.plugins.push(basicSslPlugin());
    }
  }

  return configuration;
}

type ViteEsBuildPlugin = NonNullable<
  NonNullable<DepOptimizationConfig['esbuildOptions']>['plugins']
>[0];

type EsbuildLoaderOption = Exclude<DepOptimizationConfig['esbuildOptions'], undefined>['loader'];

function getDepOptimizationConfig({
  disabled,
  exclude,
  include,
  target,
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

  if (ssr) {
    plugins.unshift(createRxjsEsmResolutionPlugin() as ViteEsBuildPlugin);
  }

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
      supported: getFeatureSupport(target),
      plugins,
      loader,
    },
  };
}
