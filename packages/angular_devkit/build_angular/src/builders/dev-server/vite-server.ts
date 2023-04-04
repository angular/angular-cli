/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { BuilderContext } from '@angular-devkit/architect';
import type { json } from '@angular-devkit/core';
import assert from 'node:assert';
import { BinaryLike, createHash } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { InlineConfig, ViteDevServer, createServer, normalizePath } from 'vite';
import { buildEsbuildBrowser } from '../browser-esbuild';
import type { Schema as BrowserBuilderOptions } from '../browser-esbuild/schema';
import { loadProxyConfiguration } from './load-proxy-config';
import type { NormalizedDevServerOptions } from './options';
import type { DevServerBuilderOutput } from './webpack-server';

interface OutputFileRecord {
  text: string;
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
  )) as json.JsonObject & BrowserBuilderOptions;

  let server: ViteDevServer | undefined;
  let listeningAddress: AddressInfo | undefined;
  const outputFiles = new Map<string, OutputFileRecord>();
  const assets = new Map<string, string>();
  // TODO: Switch this to an architect schedule call when infrastructure settings are supported
  for await (const result of buildEsbuildBrowser(browserOptions, context, { write: false })) {
    assert(result.outputFiles, 'Builder did not provide result files.');

    // Analyze result files for changes
    const seen = new Set<string>(['/index.html']);
    for (const file of result.outputFiles) {
      const filePath = '/' + normalizePath(file.path);
      seen.add(filePath);

      // Skip analysis of sourcemaps
      if (filePath.endsWith('.map')) {
        outputFiles.set(filePath, {
          text: file.text,
          size: file.contents.byteLength,
          updated: false,
        });

        continue;
      }

      let fileHash: Buffer | undefined;
      const existingRecord = outputFiles.get(filePath);
      if (existingRecord && existingRecord.size === file.contents.byteLength) {
        // Only hash existing file when needed
        if (existingRecord.hash === undefined) {
          existingRecord.hash = hashContent(existingRecord.text);
        }

        // Compare against latest result output
        fileHash = hashContent(file.contents);
        if (fileHash.equals(existingRecord.hash)) {
          // Same file
          existingRecord.updated = false;
          continue;
        }
      }

      outputFiles.set(filePath, {
        text: file.text,
        size: file.contents.byteLength,
        hash: fileHash,
        updated: true,
      });
    }

    // Clear stale output files
    for (const file of outputFiles.keys()) {
      if (!seen.has(file)) {
        outputFiles.delete(file);
      }
    }

    assets.clear();
    if (result.assetFiles) {
      for (const asset of result.assetFiles) {
        assets.set('/' + normalizePath(asset.destination), asset.source);
      }
    }

    if (server) {
      // Invalidate any updated files
      for (const [file, record] of outputFiles) {
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
      server = await setupServer(serverOptions, outputFiles, assets);

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

async function setupServer(
  serverOptions: NormalizedDevServerOptions,
  outputFiles: Map<string, OutputFileRecord>,
  assets: Map<string, string>,
): Promise<ViteDevServer> {
  const proxy = await loadProxyConfiguration(
    serverOptions.workspaceRoot,
    serverOptions.proxyConfig,
  );

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
    server: {
      port: serverOptions.port,
      strictPort: true,
      host: serverOptions.host,
      open: serverOptions.open,
      headers: serverOptions.headers,
      https: serverOptions.ssl,
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
          const code = outputFiles.get(file)?.text;

          return (
            code && {
              code,
              map: outputFiles.get(file + '.map')?.text,
            }
          );
        },
        configureServer(server) {
          // Assets get handled first
          server.middlewares.use(function angularAssetsMiddleware(req, res, next) {
            if (req.url) {
              // Rewrite all build assets to a vite raw fs URL
              const assetSource = assets.get(req.url);
              if (assetSource !== undefined) {
                req.url = `/@fs/${assetSource}`;
              }
            }
            next();
          });

          // Returning a function, installs middleware after the main transform middleware but
          // before the built-in HTML middleware
          return () =>
            server.middlewares.use(function angularIndexMiddleware(req, res, next) {
              if (req.url === '/' || req.url === `/index.html`) {
                const rawHtml = outputFiles.get('/index.html')?.text;
                if (rawHtml) {
                  server
                    .transformIndexHtml(req.url, rawHtml, req.originalUrl)
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
      // TODO: Consider enabling for known safe dependencies (@angular/* ?)
      disabled: true,
    },
  };

  const server = await createServer(configuration);

  return server;
}
