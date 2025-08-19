/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { BuilderContext } from '@angular-devkit/architect';
import type { Plugin } from 'esbuild';
import assert from 'node:assert';
import { builtinModules, isBuiltin } from 'node:module';
import { join } from 'node:path';
import type { Connect, ViteDevServer } from 'vite';
import type { ComponentStyleRecord } from '../../../tools/vite/middlewares';
import { ServerSsrMode } from '../../../tools/vite/plugins';
import { EsbuildLoaderOption } from '../../../tools/vite/utils';
import { normalizeSourceMaps } from '../../../utils';
import { useComponentStyleHmr, useComponentTemplateHmr } from '../../../utils/environment-options';
import { loadEsmModule } from '../../../utils/load-esm';
import { Result, ResultKind } from '../../application/results';
import { OutputHashing } from '../../application/schema';
import {
  type ApplicationBuilderInternalOptions,
  type ExternalResultMetadata,
  JavaScriptTransformer,
  getSupportedBrowsers,
  isZonelessApp,
  transformSupportedBrowsersToTargets,
} from '../internal';
import type { NormalizedDevServerOptions } from '../options';
import type { DevServerBuilderOutput } from '../output';
import { handleUpdate, invalidateUpdatedFiles } from './hmr';
import { setupServer } from './server';
import {
  DevServerExternalResultMetadata,
  OutputAssetRecord,
  OutputFileRecord,
  isAbsoluteUrl,
  updateResultRecord,
} from './utils';

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

  if (browserOptions.prerender || (browserOptions.outputMode && browserOptions.server)) {
    // Disable prerendering if enabled and force SSR.
    // This is so instead of prerendering all the routes for every change, the page is "prerendered" when it is requested.
    browserOptions.prerender = undefined;
    browserOptions.ssr ||= true;
  }

  // Disable auto CSP.
  browserOptions.security = {
    autoCsp: false,
  };

  // Disable JSON build stats.
  // These are not accessible with the dev server and can cause HMR fallbacks.
  if (browserOptions.statsJson === true) {
    context.logger.warn(
      'Build JSON statistics output (`statsJson` option) has been disabled.' +
        ' The development server does not support this option.',
    );
  }
  browserOptions.statsJson = false;

  // Set all packages as external to support Vite's prebundle caching
  browserOptions.externalPackages = serverOptions.prebundle;

  // Disable generating a full manifest with routes.
  // This is done during runtime when using the dev-server.
  browserOptions.partialSSRBuild = true;

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

  const { vendor: thirdPartySourcemaps, scripts: scriptsSourcemaps } = normalizeSourceMaps(
    browserOptions.sourceMap ?? false,
  );

  if (scriptsSourcemaps && browserOptions.server) {
    // https://nodejs.org/api/process.html#processsetsourcemapsenabledval
    process.setSourceMapsEnabled(true);
  }

  if (
    serverOptions.hmr &&
    (browserOptions.outputHashing === OutputHashing.All ||
      browserOptions.outputHashing === OutputHashing.Bundles)
  ) {
    serverOptions.hmr = false;

    context.logger.warn(
      `Hot Module Replacement (HMR) is disabled because the 'outputHashing' option is set to '${browserOptions.outputHashing}'. ` +
        'HMR is incompatible with this setting.',
    );
  }

  const componentsHmrCanBeUsed =
    browserOptions.aot && serverOptions.liveReload && serverOptions.hmr;

  // Enable to support link-based component style hot reloading (`NG_HMR_CSTYLES=1` can be used to enable)
  browserOptions.externalRuntimeStyles = componentsHmrCanBeUsed && useComponentStyleHmr;

  // Enable to support component template hot replacement (`NG_HMR_TEMPLATE=0` can be used to disable selectively)
  // This will also replace file-based/inline styles as code if external runtime styles are not enabled.
  browserOptions.templateUpdates = componentsHmrCanBeUsed && useComponentTemplateHmr;
  browserOptions.incrementalResults = true;

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
  const assetFiles = new Map<string, OutputAssetRecord>();
  const externalMetadata: DevServerExternalResultMetadata = {
    implicitBrowser: [],
    implicitServer: [],
    explicitBrowser: [],
    explicitServer: [],
  };
  const componentStyles = new Map<string, ComponentStyleRecord>();
  const templateUpdates = new Map<string, string>();

  // Add cleanup logic via a builder teardown.
  let deferred: () => void;
  context.addTeardown(async () => {
    await server?.close();
    await prebundleTransformer.close();
    deferred?.();
  });

  // TODO: Switch this to an architect schedule call when infrastructure settings are supported
  for await (const result of builderAction(browserOptions, context, extensions?.buildPlugins)) {
    if (result.kind === ResultKind.Failure) {
      if (result.errors.length && server) {
        hadError = true;
        server.ws.send({
          type: 'error',
          err: {
            message: result.errors[0].text,
            stack: '',
            loc: result.errors[0].location ?? undefined,
          },
        });
      }

      yield { baseUrl: '', success: false };
      continue;
    }
    // Clear existing error overlay on successful result
    if (hadError && server) {
      hadError = false;
      // Send an empty update to clear the error overlay
      server.ws.send({
        'type': 'update',
        updates: [],
      });
    }

    let needClientUpdate = true;
    switch (result.kind) {
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
        componentStyles.clear();
        generatedFiles.clear();

        for (const [outputPath, file] of Object.entries(result.files)) {
          updateResultRecord(
            outputPath,
            file,
            normalizePath,
            htmlIndexPath,
            generatedFiles,
            assetFiles,
            componentStyles,
            // The initial build will not yet have a server setup
            !server,
          );
        }

        // Clear stale template updates on code rebuilds
        templateUpdates.clear();

        break;
      case ResultKind.Incremental:
        assert(server, 'Builder must provide an initial full build before incremental results.');

        // Background updates should only update server files/options
        needClientUpdate = !result.background;

        for (const removed of result.removed) {
          const filePath = '/' + normalizePath(removed.path);
          generatedFiles.delete(filePath);
          assetFiles.delete(filePath);
        }

        for (const modified of result.modified) {
          updateResultRecord(
            modified,
            result.files[modified],
            normalizePath,
            htmlIndexPath,
            generatedFiles,
            assetFiles,
            componentStyles,
          );
        }

        for (const added of result.added) {
          updateResultRecord(
            added,
            result.files[added],
            normalizePath,
            htmlIndexPath,
            generatedFiles,
            assetFiles,
            componentStyles,
          );
        }

        break;
      case ResultKind.ComponentUpdate:
        assert(serverOptions.hmr, 'Component updates are only supported with HMR enabled.');
        assert(
          server,
          'Builder must provide an initial full build before component update results.',
        );

        for (const componentUpdate of result.updates) {
          if (componentUpdate.type === 'template') {
            templateUpdates.set(componentUpdate.id, componentUpdate.content);
            server.ws.send('angular:component-update', {
              id: componentUpdate.id,
              timestamp: Date.now(),
            });
          }
        }

        context.logger.info('Component update sent to client(s).');
        continue;
      default:
        context.logger.warn(`Unknown result kind [${(result as Result).kind}] provided by build.`);
        continue;
    }

    // To avoid disconnecting the array objects from the option, these arrays need to be mutated instead of replaced.
    if (result.detail?.['externalMetadata']) {
      const { implicitBrowser, implicitServer, explicit } = result.detail[
        'externalMetadata'
      ] as ExternalResultMetadata;
      const implicitServerFiltered = implicitServer.filter(
        (m) => !isBuiltin(m) && !isAbsoluteUrl(m),
      );
      const implicitBrowserFiltered = implicitBrowser.filter((m) => !isAbsoluteUrl(m));

      // Empty Arrays to avoid growing unlimited with every re-build.
      externalMetadata.explicitBrowser.length = 0;
      externalMetadata.explicitServer.length = 0;
      externalMetadata.implicitServer.length = 0;
      externalMetadata.implicitBrowser.length = 0;

      const externalDeps = browserOptions.externalDependencies ?? [];
      externalMetadata.explicitBrowser.push(...explicit, ...externalDeps);
      externalMetadata.explicitServer.push(...explicit, ...externalDeps, ...builtinModules);
      externalMetadata.implicitServer.push(...implicitServerFiltered);
      externalMetadata.implicitBrowser.push(...implicitBrowserFiltered);

      // The below needs to be sorted as Vite uses these options are part of the hashing invalidation algorithm.
      // See: https://github.com/vitejs/vite/blob/0873bae0cfe0f0718ad2f5743dd34a17e4ab563d/packages/vite/src/node/optimizer/index.ts#L1203-L1239
      externalMetadata.explicitBrowser.sort();
      externalMetadata.explicitServer.sort();
      externalMetadata.implicitServer.sort();
      externalMetadata.implicitBrowser.sort();
    }

    if (server) {
      // Update fs allow list to include any new assets from the build option.
      server.config.server.fs.allow = [
        ...new Set([
          ...server.config.server.fs.allow,
          ...[...assetFiles.values()].map(({ source }) => source),
        ]),
      ];

      const updatedFiles = await invalidateUpdatedFiles(
        normalizePath,
        generatedFiles,
        assetFiles,
        server,
      );

      if (needClientUpdate) {
        handleUpdate(server, serverOptions, context.logger, componentStyles, updatedFiles);
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

      let ssrMode: ServerSsrMode = ServerSsrMode.NoSsr;
      if (
        browserOptions.outputMode &&
        typeof browserOptions.ssr === 'object' &&
        browserOptions.ssr.entry
      ) {
        ssrMode = ServerSsrMode.ExternalSsrMiddleware;
      } else if (browserOptions.ssr) {
        ssrMode = ServerSsrMode.InternalSsrMiddleware;
      }

      if (browserOptions.progress !== false && ssrMode !== ServerSsrMode.NoSsr) {
        // This is a workaround for https://github.com/angular/angular-cli/issues/28336, which is caused by the interaction between `zone.js` and `listr2`.
        process.once('SIGINT', () => {
          process.kill(process.pid);
        });
      }

      // Setup server and start listening
      const serverConfiguration = await setupServer(
        serverOptions,
        generatedFiles,
        assetFiles,
        browserOptions.preserveSymlinks,
        externalMetadata,
        ssrMode,
        prebundleTransformer,
        target,
        isZonelessApp(polyfills),
        componentStyles,
        templateUpdates,
        browserOptions.loader as EsbuildLoaderOption | undefined,
        {
          ...browserOptions.define,
          'ngHmrMode': browserOptions.templateUpdates ? 'true' : 'false',
        },
        extensions?.middleware,
        transformers?.indexHtml,
        thirdPartySourcemaps,
      );

      server = await createServer(serverConfiguration);
      await server.listen();

      // Setup builder context logging for browser clients
      server.hot.on('angular:log', (data: { text: string; kind?: string }) => {
        if (typeof data?.text !== 'string') {
          context.logger.warn('Development server client sent invalid internal log event.');
        }
        switch (data.kind) {
          case 'error':
            context.logger.error(`[CLIENT ERROR]: ${data.text}`);
            break;
          case 'warning':
            context.logger.warn(`[CLIENT WARNING]: ${data.text}`);
            break;
          default:
            context.logger.info(`[CLIENT INFO]: ${data.text}`);
            break;
        }
      });

      // Setup component HMR invalidation
      // Invalidation occurs when the runtime cannot update a component
      server.hot.on(
        'angular:invalidate',
        (data: { id: string; message?: string; error?: boolean }) => {
          if (typeof data?.id !== 'string') {
            context.logger.warn(
              'Development server client sent invalid internal invalidate event.',
            );
          }

          // Clear invalid template update
          templateUpdates.delete(data.id);

          // Some cases are expected unsupported update scenarios but some may be errors.
          // If an error occurred, log the error in addition to the invalidation.
          if (data.error) {
            context.logger.error(
              `Component update failed${data.message ? `: ${data.message}` : '.'}` +
                '\nPlease consider reporting the error at https://github.com/angular/angular-cli/issues',
            );
          } else {
            context.logger.warn(
              `Component update unsupported${data.message ? `: ${data.message}` : '.'}`,
            );
          }

          server?.ws.send({
            type: 'full-reload',
            path: '*',
          });
          context.logger.info('Page reload sent to client(s).');
        },
      );

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
              componentStyles.forEach((record) => record.used?.clear());
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
