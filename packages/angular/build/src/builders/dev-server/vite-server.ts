/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { ɵdestroyAngularServerApp as destroyAngularServerApp } from '@angular/ssr';
import type { BuilderContext } from '@angular-devkit/architect';
import type { Plugin } from 'esbuild';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { builtinModules } from 'node:module';
import { join } from 'node:path';
import type { Connect, DepOptimizationConfig, InlineConfig, ViteDevServer } from 'vite';
import { createAngularMemoryPlugin } from '../../tools/vite/angular-memory-plugin';
import { createAngularLocaleDataPlugin } from '../../tools/vite/i18n-locale-plugin';
import { createRemoveIdPrefixPlugin } from '../../tools/vite/id-prefix-plugin';
import { loadProxyConfiguration, normalizeSourceMaps } from '../../utils';
import { loadEsmModule } from '../../utils/load-esm';
import { Result, ResultFile, ResultKind } from '../application/results';
import {
  type ApplicationBuilderInternalOptions,
  BuildOutputFileType,
  type ExternalResultMetadata,
  JavaScriptTransformer,
  getFeatureSupport,
  getSupportedBrowsers,
  isZonelessApp,
  transformSupportedBrowsersToTargets,
} from './internal';
import type { NormalizedDevServerOptions } from './options';
import type { DevServerBuilderOutput } from './output';

interface OutputFileRecord {
  contents: Uint8Array;
  size: number;
  hash?: string;
  updated: boolean;
  servable: boolean;
  type: BuildOutputFileType;
}

export type BuilderAction = (
  options: ApplicationBuilderInternalOptions,
  context: BuilderContext,
  plugins?: Plugin[],
) => AsyncIterable<Result>;

/**
 * Build options that are also present on the dev server but are only passed
 * to the build.
 */
const CONVENIENCE_BUILD_OPTIONS = ['watch', 'poll', 'verbose'] as const;

// eslint-disable-next-line max-lines-per-function
export async function* serveWithVite(
  serverOptions: NormalizedDevServerOptions,
  builderName: string,
  builderAction: BuilderAction,
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
  const rawBrowserOptions = await context.getTargetOptions(serverOptions.buildTarget);

  // Deploy url is not used in the dev-server.
  delete rawBrowserOptions.deployUrl;

  // Copy convenience options to build
  for (const optionName of CONVENIENCE_BUILD_OPTIONS) {
    const optionValue = serverOptions[optionName];
    if (optionValue !== undefined) {
      rawBrowserOptions[optionName] = optionValue;
    }
  }

  // TODO: Adjust architect to not force a JsonObject derived return type
  const browserOptions = (await context.validateOptions(
    rawBrowserOptions,
    builderName,
  )) as unknown as ApplicationBuilderInternalOptions;

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
  browserOptions.externalPackages = serverOptions.prebundle;

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

  // The index HTML path will be updated from the build results if provided by the builder
  let htmlIndexPath = 'index.html';

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

  // TODO: Switch this to an architect schedule call when infrastructure settings are supported
  for await (const result of builderAction(browserOptions, context, extensions?.buildPlugins)) {
    switch (result.kind) {
      case ResultKind.Failure:
        if (result.errors.length && server) {
          hadError = true;
          server.hot.send({
            type: 'error',
            err: {
              message: result.errors[0].text,
              stack: '',
              loc: result.errors[0].location ?? undefined,
            },
          });
        }
        continue;
      case ResultKind.Full:
        if (result.detail?.['htmlIndexPath']) {
          htmlIndexPath = result.detail['htmlIndexPath'] as string;
        }
        if (serverOptions.servePath === undefined && result.detail?.['htmlBaseHref']) {
          const baseHref = result.detail['htmlBaseHref'] as string;
          // Remove trailing slash
          serverOptions.servePath =
            baseHref !== './' && baseHref[baseHref.length - 1] === '/'
              ? baseHref.slice(0, -1)
              : baseHref;
        }

        assetFiles.clear();
        for (const [outputPath, file] of Object.entries(result.files)) {
          if (file.origin === 'disk') {
            assetFiles.set('/' + normalizePath(outputPath), normalizePath(file.inputPath));
          }
        }
        // Analyze result files for changes
        analyzeResultFiles(normalizePath, htmlIndexPath, result.files, generatedFiles);
        break;
      case ResultKind.Incremental:
        assert(server, 'Builder must provide an initial full build before incremental results.');
        // TODO: Implement support -- application builder currently does not use
        break;
      case ResultKind.ComponentUpdate:
        assert(serverOptions.hmr, 'Component updates are only supported with HMR enabled.');
        // TODO: Implement support -- application builder currently does not use
        break;
      default:
        context.logger.warn(`Unknown result kind [${(result as Result).kind}] provided by build.`);
        continue;
    }

    // Clear existing error overlay on successful result
    if (hadError && server) {
      hadError = false;
      // Send an empty update to clear the error overlay
      server.hot.send({
        'type': 'update',
        updates: [],
      });
    }

    // To avoid disconnecting the array objects from the option, these arrays need to be mutated instead of replaced.
    let requiresServerRestart = false;
    if (result.detail?.['externalMetadata']) {
      const { implicitBrowser, implicitServer, explicit } = result.detail[
        'externalMetadata'
      ] as ExternalResultMetadata;
      const implicitServerFiltered = implicitServer.filter(
        (m) => removeNodeJsBuiltinModules(m) && removeAbsoluteUrls(m),
      );
      const implicitBrowserFiltered = implicitBrowser.filter(removeAbsoluteUrls);

      if (browserOptions.ssr && serverOptions.prebundle !== false) {
        const previousImplicitServer = new Set(externalMetadata.implicitServer);
        // Restart the server to force SSR dep re-optimization when a dependency has been added.
        // This is a workaround for: https://github.com/vitejs/vite/issues/14896
        requiresServerRestart = implicitServerFiltered.some(
          (dep) => !previousImplicitServer.has(dep),
        );
      }

      // Empty Arrays to avoid growing unlimited with every re-build.
      externalMetadata.explicit.length = 0;
      externalMetadata.implicitServer.length = 0;
      externalMetadata.implicitBrowser.length = 0;

      externalMetadata.explicit.push(...explicit);
      externalMetadata.implicitServer.push(...implicitServerFiltered);
      externalMetadata.implicitBrowser.push(...implicitBrowserFiltered);

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

      if (requiresServerRestart) {
        // Restart the server to force SSR dep re-optimization when a dependency has been added.
        // This is a workaround for: https://github.com/vitejs/vite/issues/14896
        await server.restart();
      } else {
        await handleUpdate(normalizePath, generatedFiles, server, serverOptions, context.logger);
      }
    } else {
      const projectName = context.target?.project;
      if (!projectName) {
        throw new Error('The builder requires a target.');
      }

      context.logger.info(
        'NOTE: Raw file sizes do not reflect development server per-request transformations.',
      );

      if (browserOptions.ssr && serverOptions.inspect) {
        const { host, port } = serverOptions.inspect as { host?: string; port?: number };
        const { default: inspector } = await import('node:inspector');
        inspector.open(port, host, true);
        context.addTeardown(() => inspector.close());
      }

      const { root = '' } = await context.getProjectMetadata(projectName);
      const projectRoot = join(context.workspaceRoot, root as string);
      const browsers = getSupportedBrowsers(projectRoot, context.logger);

      const target = transformSupportedBrowsersToTargets(browsers);
      // Needed for browser-esbuild as polyfills can be a string.
      const polyfills = Array.isArray((browserOptions.polyfills ??= []))
        ? browserOptions.polyfills
        : [browserOptions.polyfills];

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
        isZonelessApp(polyfills),
        browserOptions.loader as EsbuildLoaderOption | undefined,
        extensions?.middleware,
        transformers?.indexHtml,
        thirdPartySourcemaps,
      );

      server = await createServer(serverConfiguration);
      await server.listen();

      if (browserOptions.ssr && serverOptions.prebundle !== false) {
        // Warm up the SSR request and begin optimizing dependencies.
        // Without this, Vite will only start optimizing SSR modules when the first request is made.
        void server.warmupRequest('./main.server.mjs', { ssr: true });
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
              server.hot.send({
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

async function handleUpdate(
  normalizePath: (id: string) => string,
  generatedFiles: Map<string, OutputFileRecord>,
  server: ViteDevServer,
  serverOptions: NormalizedDevServerOptions,
  logger: BuilderContext['logger'],
): Promise<void> {
  const updatedFiles: string[] = [];
  let isServerFileUpdated = false;

  // Invalidate any updated files
  for (const [file, record] of generatedFiles) {
    if (record.updated) {
      updatedFiles.push(file);
      isServerFileUpdated ||= record.type === BuildOutputFileType.Server;

      const updatedModules = server.moduleGraph.getModulesByFile(
        normalizePath(join(server.config.root, file)),
      );
      updatedModules?.forEach((m) => server?.moduleGraph.invalidateModule(m));
    }
  }

  if (!updatedFiles.length) {
    return;
  }

  // clean server apps cache
  if (isServerFileUpdated) {
    const { ɵdestroyAngularServerApp } = (await server.ssrLoadModule('/main.server.mjs')) as {
      ɵdestroyAngularServerApp: typeof destroyAngularServerApp;
    };

    ɵdestroyAngularServerApp();
  }

  if (serverOptions.liveReload || serverOptions.hmr) {
    if (updatedFiles.every((f) => f.endsWith('.css'))) {
      const timestamp = Date.now();
      server.hot.send({
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
    server.hot.send({
      type: 'full-reload',
      path: '*',
    });

    logger.info('Page reload sent to client(s).');
  }
}

function analyzeResultFiles(
  normalizePath: (id: string) => string,
  htmlIndexPath: string,
  resultFiles: Record<string, ResultFile>,
  generatedFiles: Map<string, OutputFileRecord>,
) {
  const seen = new Set<string>(['/index.html']);
  for (const [outputPath, file] of Object.entries(resultFiles)) {
    if (file.origin === 'disk') {
      continue;
    }
    let filePath;
    if (outputPath === htmlIndexPath) {
      // Convert custom index output path to standard index path for dev-server usage.
      // This mimics the Webpack dev-server behavior.
      filePath = '/index.html';
    } else {
      filePath = '/' + normalizePath(outputPath);
    }

    seen.add(filePath);

    const servable =
      file.type === BuildOutputFileType.Browser || file.type === BuildOutputFileType.Media;

    // Skip analysis of sourcemaps
    if (filePath.endsWith('.map')) {
      generatedFiles.set(filePath, {
        contents: file.contents,
        servable,
        size: file.contents.byteLength,
        type: file.type,
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
      type: file.type,
      servable,
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
  zoneless: boolean,
  prebundleLoaderExtensions: EsbuildLoaderOption | undefined,
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
    server: {
      port: serverOptions.port,
      strictPort: true,
      host: serverOptions.host,
      open: serverOptions.open,
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
      external: externalMetadata.explicit,
      optimizeDeps: getDepOptimizationConfig({
        // Only enable with caching since it causes prebundle dependencies to be cached
        disabled: serverOptions.prebundle === false,
        // Exclude any explicitly defined dependencies (currently build defined externals and node.js built-ins)
        exclude: externalMetadata.explicit,
        // Include all implict dependencies from the external packages internal option
        include: externalMetadata.implicitServer,
        ssr: true,
        prebundleTransformer,
        zoneless,
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
        external: externalMetadata.explicit,
        indexHtmlTransformer,
        extensionMiddleware,
        normalizePath,
      }),
      createRemoveIdPrefixPlugin(externalMetadata.explicit),
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
      zoneless,
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
      resolveExtensions: ['.mjs', '.js', '.cjs'],
    },
  };
}

const nodeJsBuiltinModules = new Set(builtinModules);
/** Remove any Node.js builtin modules to avoid Vite's prebundling from processing them as files. */
function removeNodeJsBuiltinModules(value: string): boolean {
  return !nodeJsBuiltinModules.has(value);
}

/** Remove any absolute URLs (http://, https://, //) to avoid Vite's prebundling from processing them as files. */
function removeAbsoluteUrls(value: string): boolean {
  return !/^(?:https?:)?\/\//.test(value);
}
