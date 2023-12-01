/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import remapping, { SourceMapInput } from '@ampproject/remapping';
import type { BuilderContext } from '@angular-devkit/architect';
import type { json, logging } from '@angular-devkit/core';
import type { Plugin } from 'esbuild';
import { lookup as lookupMimeType } from 'mrmime';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { ServerResponse } from 'node:http';
import { dirname, extname, join, relative } from 'node:path';
import type { Connect, DepOptimizationConfig, InlineConfig, ViteDevServer } from 'vite';
import { BuildOutputFile, BuildOutputFileType } from '../../tools/esbuild/bundler-context';
import { ExternalResultMetadata } from '../../tools/esbuild/bundler-execution-result';
import { JavaScriptTransformer } from '../../tools/esbuild/javascript-transformer';
import { createRxjsEsmResolutionPlugin } from '../../tools/esbuild/rxjs-esm-resolution-plugin';
import { getFeatureSupport, transformSupportedBrowsersToTargets } from '../../tools/esbuild/utils';
import { createAngularLocaleDataPlugin } from '../../tools/vite/i18n-locale-plugin';
import { normalizeSourceMaps } from '../../utils';
import { loadEsmModule } from '../../utils/load-esm';
import { renderPage } from '../../utils/server-rendering/render-page';
import { getSupportedBrowsers } from '../../utils/supported-browsers';
import { getIndexOutputFile } from '../../utils/webpack-browser-config';
import { buildApplicationInternal } from '../application';
import { buildEsbuildBrowser } from '../browser-esbuild';
import { Schema as BrowserBuilderOptions } from '../browser-esbuild/schema';
import { loadProxyConfiguration } from './load-proxy-config';
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process as any).setSourceMapsEnabled(true);
  }

  // Set all packages as external to support Vite's prebundle caching
  browserOptions.externalPackages = serverOptions.cacheOptions.enabled;

  if (serverOptions.servePath === undefined && browserOptions.baseHref !== undefined) {
    serverOptions.servePath = browserOptions.baseHref;
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
    true,
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
      ? buildEsbuildBrowser
      : buildApplicationInternal;

  // TODO: Switch this to an architect schedule call when infrastructure settings are supported
  for await (const result of build(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    browserOptions as any,
    context,
    {
      write: false,
    },
    extensions?.buildPlugins,
  )) {
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
      externalMetadata.implicitServer.push(...implicitServer);
      externalMetadata.implicitBrowser.push(...implicitBrowser);

      // The below needs to be sorted as Vite uses these options are part of the hashing invalidation algorithm.
      // See: https://github.com/vitejs/vite/blob/0873bae0cfe0f0718ad2f5743dd34a17e4ab563d/packages/vite/src/node/optimizer/index.ts#L1203-L1239
      externalMetadata.explicit.sort();
      externalMetadata.implicitServer.sort();
      externalMetadata.implicitBrowser.sort();
    }

    if (server) {
      // Update fs allow list to include any new assets from the build option.
      server.config.server.fs.allow = [
        ...new Set(...server.config.server.fs.allow, ...assetFiles.values()),
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

// eslint-disable-next-line max-lines-per-function
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
    appType: 'spa',
    css: {
      devSourcemap: true,
    },
    // Vite will normalize the `base` option by adding a leading and trailing forward slash.
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
      // File watching is handled by the build directly. `null` disables file watching for Vite.
      watch: null,
      fs: {
        // Ensure cache directory, node modules, and all assets are accessible by the client.
        // The first two are required for Vite to function in prebundling mode (the default) and to load
        // the Vite client-side code for browser reloading. These would be available by default but when
        // the `allow` option is explicitly configured, they must be included manually.
        allow: [cacheDir, join(serverOptions.workspaceRoot, 'node_modules'), ...assets.values()],
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
        disabled: true, // !serverOptions.cacheOptions.enabled,
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
      {
        name: 'vite:angular-memory',
        // Ensures plugin hooks run before built-in Vite hooks
        enforce: 'pre',
        async resolveId(source, importer) {
          // Prevent vite from resolving an explicit external dependency (`externalDependencies` option)
          if (externalMetadata.explicit.includes(source)) {
            // This is still not ideal since Vite will still transform the import specifier to
            // `/@id/${source}` but is currently closer to a raw external than a resolved file path.
            return source;
          }

          if (importer && source[0] === '.' && importer.startsWith(virtualProjectRoot)) {
            // Remove query if present
            const [importerFile] = importer.split('?', 1);

            source =
              '/' +
              normalizePath(join(dirname(relative(virtualProjectRoot, importerFile)), source));
          }

          const [file] = source.split('?', 1);
          if (outputFiles.has(file)) {
            return join(virtualProjectRoot, source);
          }
        },
        load(id) {
          const [file] = id.split('?', 1);
          const relativeFile = '/' + normalizePath(relative(virtualProjectRoot, file));
          const codeContents = outputFiles.get(relativeFile)?.contents;
          if (codeContents === undefined) {
            if (relativeFile.endsWith('/node_modules/vite/dist/client/client.mjs')) {
              return loadViteClientCode(file);
            }

            return;
          }

          const code = Buffer.from(codeContents).toString('utf-8');
          const mapContents = outputFiles.get(relativeFile + '.map')?.contents;

          return {
            // Remove source map URL comments from the code if a sourcemap is present.
            // Vite will inline and add an additional sourcemap URL for the sourcemap.
            code: mapContents ? code.replace(/^\/\/# sourceMappingURL=[^\r\n]*/gm, '') : code,
            map: mapContents && Buffer.from(mapContents).toString('utf-8'),
          };
        },
        configureServer(server) {
          const originalssrTransform = server.ssrTransform;
          server.ssrTransform = async (code, map, url, originalCode) => {
            const result = await originalssrTransform(code, null, url, originalCode);
            if (!result || !result.map || !map) {
              return result;
            }

            const remappedMap = remapping(
              [result.map as SourceMapInput, map as SourceMapInput],
              () => null,
            );

            // Set the sourcemap root to the workspace root. This is needed since we set a virtual path as root.
            remappedMap.sourceRoot = normalizePath(serverOptions.workspaceRoot) + '/';

            return {
              ...result,
              map: remappedMap as (typeof result)['map'],
            };
          };

          // Assets and resources get handled first
          server.middlewares.use(function angularAssetsMiddleware(req, res, next) {
            if (req.url === undefined || res.writableEnded) {
              return;
            }

            // Parse the incoming request.
            // The base of the URL is unused but required to parse the URL.
            const pathname = pathnameWithoutBasePath(req.url, server.config.base);
            const extension = extname(pathname);

            // Rewrite all build assets to a vite raw fs URL
            const assetSourcePath = assets.get(pathname);
            if (assetSourcePath !== undefined) {
              // The encoding needs to match what happens in the vite static middleware.
              // ref: https://github.com/vitejs/vite/blob/d4f13bd81468961c8c926438e815ab6b1c82735e/packages/vite/src/node/server/middlewares/static.ts#L163
              req.url = `${server.config.base}@fs/${encodeURI(assetSourcePath)}`;
              next();

              return;
            }

            // Resource files are handled directly.
            // Global stylesheets (CSS files) are currently considered resources to workaround
            // dev server sourcemap issues with stylesheets.
            if (extension !== '.js' && extension !== '.html') {
              const outputFile = outputFiles.get(pathname);
              if (outputFile?.servable) {
                const mimeType = lookupMimeType(extension);
                if (mimeType) {
                  res.setHeader('Content-Type', mimeType);
                }
                res.setHeader('Cache-Control', 'no-cache');
                if (serverOptions.headers) {
                  Object.entries(serverOptions.headers).forEach(([name, value]) =>
                    res.setHeader(name, value),
                  );
                }
                res.end(outputFile.contents);

                return;
              }
            }

            next();
          });

          if (extensionMiddleware?.length) {
            extensionMiddleware.forEach((middleware) => server.middlewares.use(middleware));
          }

          // Returning a function, installs middleware after the main transform middleware but
          // before the built-in HTML middleware
          return () => {
            function angularSSRMiddleware(
              req: Connect.IncomingMessage,
              res: ServerResponse,
              next: Connect.NextFunction,
            ) {
              const url = req.originalUrl;
              if (
                // Skip if path is not defined.
                !url ||
                // Skip if path is like a file.
                // NOTE: We use a regexp to mitigate against matching requests like: /browse/pl.0ef59752c0cd457dbf1391f08cbd936f
                /^\.[a-z]{2,4}$/i.test(extname(url.split('?')[0]))
              ) {
                next();

                return;
              }

              const rawHtml = outputFiles.get('/index.server.html')?.contents;
              if (!rawHtml) {
                next();

                return;
              }

              transformIndexHtmlAndAddHeaders(url, rawHtml, res, next, async (html) => {
                const protocol = serverOptions.ssl ? 'https' : 'http';
                const route = `${protocol}://${req.headers.host}${req.originalUrl}`;
                const { content } = await renderPage({
                  document: html,
                  route,
                  serverContext: 'ssr',
                  loadBundle: (uri: string) =>
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    server.ssrLoadModule(uri.slice(1)) as any,
                  // Files here are only needed for critical CSS inlining.
                  outputFiles: {},
                  // TODO: add support for critical css inlining.
                  inlineCriticalCss: false,
                });

                return indexHtmlTransformer && content
                  ? await indexHtmlTransformer(content)
                  : content;
              });
            }

            if (ssr) {
              server.middlewares.use(angularSSRMiddleware);
            }

            server.middlewares.use(function angularIndexMiddleware(req, res, next) {
              if (!req.url) {
                next();

                return;
              }

              // Parse the incoming request.
              // The base of the URL is unused but required to parse the URL.
              const pathname = pathnameWithoutBasePath(req.url, server.config.base);

              if (pathname === '/' || pathname === `/index.html`) {
                const rawHtml = outputFiles.get('/index.html')?.contents;
                if (rawHtml) {
                  transformIndexHtmlAndAddHeaders(
                    req.url,
                    rawHtml,
                    res,
                    next,
                    indexHtmlTransformer,
                  );

                  return;
                }
              }

              next();
            });
          };

          function transformIndexHtmlAndAddHeaders(
            url: string,
            rawHtml: Uint8Array,
            res: ServerResponse<import('http').IncomingMessage>,
            next: Connect.NextFunction,
            additionalTransformer?: (html: string) => Promise<string | undefined>,
          ) {
            server
              .transformIndexHtml(url, Buffer.from(rawHtml).toString('utf-8'))
              .then(async (processedHtml) => {
                if (additionalTransformer) {
                  const content = await additionalTransformer(processedHtml);
                  if (!content) {
                    next();

                    return;
                  }

                  processedHtml = content;
                }

                res.setHeader('Content-Type', 'text/html');
                res.setHeader('Cache-Control', 'no-cache');
                if (serverOptions.headers) {
                  Object.entries(serverOptions.headers).forEach(([name, value]) =>
                    res.setHeader(name, value),
                  );
                }
                res.end(processedHtml);
              })
              .catch((error) => next(error));
          }
        },
      },
    ],
    // Browser only optimizeDeps. (This does not run for SSR dependencies).
    optimizeDeps: getDepOptimizationConfig({
      // Only enable with caching since it causes prebundle dependencies to be cached
      disabled: !serverOptions.cacheOptions.enabled,
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
      configuration.plugins ??= [];
      configuration.plugins.push(basicSslPlugin());
    }
  }

  return configuration;
}

/**
 * Reads the resolved Vite client code from disk and updates the content to remove
 * an unactionable suggestion to update the Vite configuration file to disable the
 * error overlay. The Vite configuration file is not present when used in the Angular
 * CLI.
 * @param file The absolute path to the Vite client code.
 * @returns
 */
async function loadViteClientCode(file: string) {
  const originalContents = await readFile(file, 'utf-8');
  let contents = originalContents.replace('You can also disable this overlay by setting', '');
  contents = contents.replace(
    // eslint-disable-next-line max-len
    '<code part="config-option-name">server.hmr.overlay</code> to <code part="config-option-value">false</code> in <code part="config-file-name">vite.config.js.</code>',
    '',
  );

  assert(originalContents !== contents, 'Failed to update Vite client error overlay text.');

  return contents;
}

function pathnameWithoutBasePath(url: string, basePath: string): string {
  const parsedUrl = new URL(url, 'http://localhost');
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // slice(basePath.length - 1) to retain the trailing slash
  return basePath !== '/' && pathname.startsWith(basePath)
    ? pathname.slice(basePath.length - 1)
    : pathname;
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
    // Only enable with caching since it causes prebundle dependencies to be cached
    disabled,
    // Exclude any explicitly defined dependencies (currently build defined externals)
    exclude,
    // Include all implict dependencies from the external packages internal option
    include,
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
