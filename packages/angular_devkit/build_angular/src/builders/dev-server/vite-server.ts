/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { BuilderContext } from '@angular-devkit/architect';
import type { json } from '@angular-devkit/core';
import type { OutputFile } from 'esbuild';
import { lookup as lookupMimeType } from 'mrmime';
import assert from 'node:assert';
import { BinaryLike, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { InlineConfig, ViteDevServer, createServer, normalizePath } from 'vite';
import { buildEsbuildBrowserInternal } from '../browser-esbuild';
import { JavaScriptTransformer } from '../browser-esbuild/javascript-transformer';
import { BrowserEsbuildOptions } from '../browser-esbuild/options';
import type { Schema as BrowserBuilderOptions } from '../browser-esbuild/schema';
import { loadProxyConfiguration, normalizeProxyConfiguration } from './load-proxy-config';
import type { NormalizedDevServerOptions } from './options';
import type { DevServerBuilderOutput } from './webpack-server';

interface OutputFileRecord {
  contents: Uint8Array;
  size: number;
  hash?: Buffer;
  updated: boolean;
}

function hashContent(contents: BinaryLike): Buffer {
  // TODO: Consider xxhash
  return createHash('sha256').update(contents).digest();
}

export async function* serveWithVite(
  serverOptions: NormalizedDevServerOptions,
  builderName: string,
  context: BuilderContext,
): AsyncIterableIterator<DevServerBuilderOutput> {
  // Get the browser configuration from the target name.
  const rawBrowserOptions = (await context.getTargetOptions(
    serverOptions.browserTarget,
  )) as json.JsonObject & BrowserBuilderOptions;

  const browserOptions = (await context.validateOptions(
    {
      ...rawBrowserOptions,
      watch: serverOptions.watch,
      poll: serverOptions.poll,
      verbose: serverOptions.verbose,
    } as json.JsonObject & BrowserBuilderOptions,
    builderName,
  )) as json.JsonObject & BrowserEsbuildOptions;
  // Set all packages as external to support Vite's prebundle caching
  browserOptions.externalPackages = serverOptions.cacheOptions.enabled;

  if (serverOptions.servePath === undefined && browserOptions.baseHref !== undefined) {
    serverOptions.servePath = browserOptions.baseHref;
  }

  let server: ViteDevServer | undefined;
  let listeningAddress: AddressInfo | undefined;
  const generatedFiles = new Map<string, OutputFileRecord>();
  const assetFiles = new Map<string, string>();
  // TODO: Switch this to an architect schedule call when infrastructure settings are supported
  for await (const result of buildEsbuildBrowserInternal(browserOptions, context, {
    write: false,
  })) {
    assert(result.outputFiles, 'Builder did not provide result files.');

    // Analyze result files for changes
    analyzeResultFiles(result.outputFiles, generatedFiles);

    assetFiles.clear();
    if (result.assetFiles) {
      for (const asset of result.assetFiles) {
        assetFiles.set('/' + normalizePath(asset.destination), asset.source);
      }
    }

    if (server) {
      // Invalidate any updated files
      for (const [file, record] of generatedFiles) {
        if (record.updated) {
          const updatedModules = server.moduleGraph.getModulesByFile(file);
          updatedModules?.forEach((m) => server?.moduleGraph.invalidateModule(m));
        }
      }

      // Send reload command to clients
      if (serverOptions.liveReload) {
        context.logger.info('Reloading client(s)...');

        server.ws.send({
          type: 'full-reload',
          path: '*',
        });
      }
    } else {
      // Setup server and start listening
      const serverConfiguration = await setupServer(
        serverOptions,
        generatedFiles,
        assetFiles,
        browserOptions.preserveSymlinks,
        browserOptions.externalDependencies,
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

  if (server) {
    let deferred: () => void;
    context.addTeardown(async () => {
      await server?.close();
      deferred?.();
    });
    await new Promise<void>((resolve) => (deferred = resolve));
  }
}

function analyzeResultFiles(
  resultFiles: OutputFile[],
  generatedFiles: Map<string, OutputFileRecord>,
) {
  const seen = new Set<string>(['/index.html']);
  for (const file of resultFiles) {
    const filePath = '/' + normalizePath(file.path);
    seen.add(filePath);

    // Skip analysis of sourcemaps
    if (filePath.endsWith('.map')) {
      generatedFiles.set(filePath, {
        contents: file.contents,
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
): Promise<InlineConfig> {
  const proxy = await loadProxyConfiguration(
    serverOptions.workspaceRoot,
    serverOptions.proxyConfig,
  );
  if (proxy) {
    normalizeProxyConfiguration(proxy);
  }

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
    plugins: [
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
            const parsedUrl = new URL(req.url, 'http://localhost');
            let pathname = decodeURIComponent(parsedUrl.pathname);
            if (serverOptions.servePath && pathname.startsWith(serverOptions.servePath)) {
              pathname = pathname.slice(serverOptions.servePath.length);
              if (pathname[0] !== '/') {
                pathname = '/' + pathname;
              }
            }
            const extension = path.extname(pathname);

            // Rewrite all build assets to a vite raw fs URL
            const assetSourcePath = assets.get(pathname);
            if (assetSourcePath !== undefined) {
              req.url = `/@fs/${encodeURIComponent(assetSourcePath)}`;
              next();

              return;
            }

            // Resource files are handled directly.
            // Global stylesheets (CSS files) are currently considered resources to workaround
            // dev server sourcemap issues with stylesheets.
            if (extension !== '.js' && extension !== '.html') {
              const outputFile = outputFiles.get(pathname);
              if (outputFile) {
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
          return () =>
            server.middlewares.use(function angularIndexMiddleware(req, res, next) {
              if (!req.url) {
                next();

                return;
              }

              // Parse the incoming request.
              // The base of the URL is unused but required to parse the URL.
              const parsedUrl = new URL(req.url, 'http://localhost');
              let pathname = parsedUrl.pathname;
              if (serverOptions.servePath && pathname.startsWith(serverOptions.servePath)) {
                pathname = pathname.slice(serverOptions.servePath.length);
                if (pathname[0] !== '/') {
                  pathname = '/' + pathname;
                }
              }
              if (pathname === '/' || pathname === `/index.html`) {
                const rawHtml = outputFiles.get('/index.html')?.contents;
                if (rawHtml) {
                  server
                    .transformIndexHtml(req.url, Buffer.from(rawHtml).toString('utf-8'))
                    .then((processedHtml) => {
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

                  return;
                }
              }

              next();
            });
        },
      },
    ],
    optimizeDeps: {
      // Only enable with caching since it causes prebundle dependencies to be cached
      disabled: !serverOptions.cacheOptions.enabled,
      // Exclude any provided dependencies (currently build defined externals)
      exclude: prebundleExclude,
      // Skip automatic file-based entry point discovery
      include: [],
      // Add an esbuild plugin to run the Angular linker on dependencies
      esbuildOptions: {
        plugins: [
          {
            name: 'angular-vite-optimize-deps',
            setup(build) {
              const transformer = new JavaScriptTransformer(
                { sourcemap: !!build.initialOptions.sourcemap },
                1,
              );

              build.onLoad({ filter: /\.[cm]?js$/ }, async (args) => {
                return {
                  contents: await transformer.transformFile(args.path),
                  loader: 'js',
                };
              });
              build.onEnd(() => transformer.close());
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
