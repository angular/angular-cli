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
import { lookup as lookupMimeType } from 'mrmime';
import assert from 'node:assert';
import { BinaryLike, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import path, { posix } from 'node:path';
import type { Connect, InlineConfig, ViteDevServer } from 'vite';
import { BuildOutputFile, BuildOutputFileType } from '../../tools/esbuild/bundler-context';
import { JavaScriptTransformer } from '../../tools/esbuild/javascript-transformer';
import { getFeatureSupport, transformSupportedBrowsersToTargets } from '../../tools/esbuild/utils';
import { createAngularLocaleDataPlugin } from '../../tools/vite/i18n-locale-plugin';
import { RenderOptions, renderPage } from '../../utils/server-rendering/render-page';
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
  hash?: Buffer;
  updated: boolean;
  servable: boolean;
}

const SSG_MARKER_REGEXP = /ng-server-context=["']\w*\|?ssg\|?\w*["']/;

function hashContent(contents: BinaryLike): Buffer {
  // TODO: Consider xxhash
  return createHash('sha256').update(contents).digest();
}

export async function* serveWithVite(
  serverOptions: NormalizedDevServerOptions,
  builderName: string,
  context: BuilderContext,
  plugins?: Plugin[],
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

  if (browserOptions.prerender) {
    // Disable prerendering if enabled and force SSR.
    // This is so instead of prerendering all the routes for every change, the page is "prerendered" when it is requested.
    browserOptions.ssr = true;
    browserOptions.prerender = false;
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

  // Setup the prebundling transformer that will be shared across Vite prebundling requests
  const prebundleTransformer = new JavaScriptTransformer(
    // Always enable JIT linking to support applications built with and without AOT.
    // In a development environment the additional scope information does not
    // have a negative effect unlike production where final output size is relevant.
    { sourcemap: true, jit: true },
    1,
  );

  // Extract output index from options
  // TODO: Provide this info from the build results
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const htmlIndexPath = getIndexOutputFile(browserOptions.index as any);

  // dynamically import Vite for ESM compatibility
  const { createServer, normalizePath } = await import('vite');

  let server: ViteDevServer | undefined;
  let listeningAddress: AddressInfo | undefined;
  const generatedFiles = new Map<string, OutputFileRecord>();
  const assetFiles = new Map<string, string>();
  const build =
    builderName === '@angular-devkit/build-angular:application'
      ? buildApplicationInternal
      : buildEsbuildBrowser;

  // TODO: Switch this to an architect schedule call when infrastructure settings are supported
  for await (const result of build(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    browserOptions as any,
    context,
    {
      write: false,
    },
    plugins,
  )) {
    assert(result.outputFiles, 'Builder did not provide result files.');

    // Analyze result files for changes
    analyzeResultFiles(normalizePath, htmlIndexPath, result.outputFiles, generatedFiles);

    assetFiles.clear();
    if (result.assetFiles) {
      for (const asset of result.assetFiles) {
        assetFiles.set('/' + normalizePath(asset.destination), asset.source);
      }
    }

    if (server) {
      handleUpdate(generatedFiles, server, serverOptions, context.logger);
    } else {
      const projectName = context.target?.project;
      if (!projectName) {
        throw new Error('The builder requires a target.');
      }

      const { root = '' } = await context.getProjectMetadata(projectName);
      const projectRoot = path.join(context.workspaceRoot, root as string);
      const browsers = getSupportedBrowsers(projectRoot, context.logger);
      const target = transformSupportedBrowsersToTargets(browsers);

      // Setup server and start listening
      const serverConfiguration = await setupServer(
        serverOptions,
        generatedFiles,
        assetFiles,
        browserOptions.preserveSymlinks,
        browserOptions.externalDependencies,
        !!browserOptions.ssr,
        prebundleTransformer,
        target,
      );

      server = await createServer(serverConfiguration);

      await server.listen();
      listeningAddress = server.httpServer?.address() as AddressInfo;

      // log connection information
      server.printUrls();
    }

    // TODO: adjust output typings to reflect both development servers
    yield { success: true, port: listeningAddress?.port } as unknown as DevServerBuilderOutput;
  }

  // Add cleanup logic via a builder teardown
  let deferred: () => void;
  context.addTeardown(async () => {
    await server?.close();
    await prebundleTransformer.close();
    deferred?.();
  });
  await new Promise<void>((resolve) => (deferred = resolve));
}

function handleUpdate(
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
      const updatedModules = server.moduleGraph.getModulesByFile(file);
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
        updates: updatedFiles.map((f) => {
          const filePath = f.slice(1); // Remove leading slash.

          return {
            type: 'css-update',
            timestamp,
            path: filePath,
            acceptedPath: filePath,
          };
        }),
      });

      logger.info('HMR update sent to client(s)...');

      return;
    }
  }

  // Send reload command to clients
  if (serverOptions.liveReload) {
    logger.info('Reloading client(s)...');

    server.ws.send({
      type: 'full-reload',
      path: '*',
    });
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

    let fileHash: Buffer | undefined;
    const existingRecord = generatedFiles.get(filePath);
    if (existingRecord && existingRecord.size === file.contents.byteLength) {
      // Only hash existing file when needed
      if (existingRecord.hash === undefined) {
        existingRecord.hash = hashContent(existingRecord.contents);
      }

      // Compare against latest result output
      fileHash = hashContent(file.contents);
      if (fileHash.equals(existingRecord.hash)) {
        // Same file
        existingRecord.updated = false;
        continue;
      }
    }

    generatedFiles.set(filePath, {
      contents: file.contents,
      size: file.contents.byteLength,
      hash: fileHash,
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
  prebundleExclude: string[] | undefined,
  ssr: boolean,
  prebundleTransformer: JavaScriptTransformer,
  target: string[],
): Promise<InlineConfig> {
  const proxy = await loadProxyConfiguration(
    serverOptions.workspaceRoot,
    serverOptions.proxyConfig,
    true,
  );

  // dynamically import Vite for ESM compatibility
  const { normalizePath } = await import('vite');

  const configuration: InlineConfig = {
    configFile: false,
    envFile: false,
    cacheDir: path.join(serverOptions.cacheOptions.path, 'vite'),
    root: serverOptions.workspaceRoot,
    publicDir: false,
    esbuild: false,
    mode: 'development',
    appType: 'spa',
    css: {
      devSourcemap: true,
    },
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
      // Currently does not appear to be a way to disable file watching directly so ignore all files
      watch: {
        ignored: ['**/*'],
      },
    },
    ssr: {
      // Exclude any provided dependencies (currently build defined externals)
      external: prebundleExclude,
    },
    plugins: [
      createAngularLocaleDataPlugin(),
      {
        name: 'vite:angular-memory',
        // Ensures plugin hooks run before built-in Vite hooks
        enforce: 'pre',
        async resolveId(source, importer) {
          if (importer && source.startsWith('.')) {
            // Remove query if present
            const [importerFile] = importer.split('?', 1);

            source = normalizePath(path.join(path.dirname(importerFile), source));
          }

          const [file] = source.split('?', 1);
          if (outputFiles.has(file)) {
            return source;
          }
        },
        load(id) {
          const [file] = id.split('?', 1);
          const codeContents = outputFiles.get(file)?.contents;
          if (codeContents === undefined) {
            return;
          }

          const code = Buffer.from(codeContents).toString('utf-8');
          const mapContents = outputFiles.get(file + '.map')?.contents;

          return {
            // Remove source map URL comments from the code if a sourcemap is present.
            // Vite will inline and add an additional sourcemap URL for the sourcemap.
            code: mapContents ? code.replace(/^\/\/# sourceMappingURL=[^\r\n]*/gm, '') : code,
            map: mapContents && Buffer.from(mapContents).toString('utf-8'),
          };
        },
        configureServer(server) {
          // Assets and resources get handled first
          server.middlewares.use(function angularAssetsMiddleware(req, res, next) {
            if (req.url === undefined || res.writableEnded) {
              return;
            }

            // Parse the incoming request.
            // The base of the URL is unused but required to parse the URL.
            const pathname = pathnameWithoutServePath(req.url, serverOptions);
            const extension = path.extname(pathname);

            // Rewrite all build assets to a vite raw fs URL
            const assetSourcePath = assets.get(pathname);
            if (assetSourcePath !== undefined) {
              // The encoding needs to match what happens in the vite static middleware.
              // ref: https://github.com/vitejs/vite/blob/d4f13bd81468961c8c926438e815ab6b1c82735e/packages/vite/src/node/server/middlewares/static.ts#L163
              req.url = `/@fs/${encodeURI(assetSourcePath)}`;
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

          // Returning a function, installs middleware after the main transform middleware but
          // before the built-in HTML middleware
          return () => {
            function angularSSRMiddleware(
              req: Connect.IncomingMessage,
              res: ServerResponse,
              next: Connect.NextFunction,
            ) {
              const url = req.originalUrl;
              if (!url || url.endsWith('.html')) {
                next();

                return;
              }

              const potentialPrerendered = outputFiles.get(posix.join(url, 'index.html'))?.contents;
              if (potentialPrerendered) {
                const content = Buffer.from(potentialPrerendered).toString('utf-8');
                if (SSG_MARKER_REGEXP.test(content)) {
                  transformIndexHtmlAndAddHeaders(url, potentialPrerendered, res, next);

                  return;
                }
              }

              const rawHtml = outputFiles.get('/index.server.html')?.contents;
              if (!rawHtml) {
                next();

                return;
              }

              transformIndexHtmlAndAddHeaders(url, rawHtml, res, next, async (html) => {
                const { content } = await renderPage({
                  document: html,
                  route: pathnameWithoutServePath(url, serverOptions),
                  serverContext: 'ssr',
                  loadBundle: (path: string) =>
                    server.ssrLoadModule(path.slice(1)) as ReturnType<
                      NonNullable<RenderOptions['loadBundle']>
                    >,
                  // Files here are only needed for critical CSS inlining.
                  outputFiles: {},
                  // TODO: add support for critical css inlining.
                  inlineCriticalCss: false,
                });

                return content;
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
              const pathname = pathnameWithoutServePath(req.url, serverOptions);

              if (pathname === '/' || pathname === `/index.html`) {
                const rawHtml = outputFiles.get('/index.html')?.contents;
                if (rawHtml) {
                  transformIndexHtmlAndAddHeaders(req.url, rawHtml, res, next);

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
    optimizeDeps: {
      // Only enable with caching since it causes prebundle dependencies to be cached
      disabled: !serverOptions.cacheOptions.enabled,
      // Exclude any provided dependencies (currently build defined externals)
      exclude: prebundleExclude,
      // Skip automatic file-based entry point discovery
      entries: [],
      // Add an esbuild plugin to run the Angular linker on dependencies
      esbuildOptions: {
        // Set esbuild supported targets.
        target,
        supported: getFeatureSupport(target),
        plugins: [
          {
            name: 'angular-vite-optimize-deps',
            setup(build) {
              build.onLoad({ filter: /\.[cm]?js$/ }, async (args) => {
                return {
                  contents: await prebundleTransformer.transformFile(args.path),
                  loader: 'js',
                };
              });
            },
          },
        ],
      },
    },
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

function pathnameWithoutServePath(url: string, serverOptions: NormalizedDevServerOptions): string {
  const parsedUrl = new URL(url, 'http://localhost');
  let pathname = decodeURIComponent(parsedUrl.pathname);
  if (serverOptions.servePath && pathname.startsWith(serverOptions.servePath)) {
    pathname = pathname.slice(serverOptions.servePath.length);
    if (pathname[0] !== '/') {
      pathname = '/' + pathname;
    }
  }

  return pathname;
}
