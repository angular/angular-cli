/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { ApplicationRef, StaticProvider } from '@angular/core';
import type { BootstrapContext } from '@angular/platform-browser';
import assert from 'node:assert';
import { basename } from 'node:path';
import { loadEsmModuleFromMemory } from './load-esm-from-memory';
import { MainServerBundleExports, RenderUtilsServerBundleExports } from './main-bundle-exports';

export interface RenderOptions {
  route: string;
  serverContext: ServerContext;
  outputFiles: Record<string, string>;
  document: string;
  inlineCriticalCss?: boolean;
  loadBundle?: ((path: './main.server.mjs') => Promise<MainServerBundleExports>) &
    ((path: './render-utils.server.mjs') => Promise<RenderUtilsServerBundleExports>);
}

export interface RenderResult {
  errors?: string[];
  warnings?: string[];
  content?: string;
}

export type ServerContext = 'app-shell' | 'ssg' | 'ssr';

/**
 * Renders each route in routes and writes them to <outputPath>/<route>/index.html.
 */
export async function renderPage({
  route,
  serverContext,
  document,
  inlineCriticalCss,
  outputFiles,
  loadBundle = loadEsmModuleFromMemory,
}: RenderOptions): Promise<RenderResult> {
  const { default: bootstrapAppFnOrModule } = await loadBundle('./main.server.mjs');
  const { ɵSERVER_CONTEXT, renderModule, renderApplication, ɵresetCompiledComponents, ɵConsole } =
    await loadBundle('./render-utils.server.mjs');

  // Need to clean up GENERATED_COMP_IDS map in `@angular/core`.
  // Otherwise an incorrect component ID generation collision detected warning will be displayed in development.
  // See: https://github.com/angular/angular-cli/issues/25924
  ɵresetCompiledComponents?.();

  const platformProviders: StaticProvider[] = [
    {
      provide: ɵSERVER_CONTEXT,
      useValue: serverContext,
    },
    {
      provide: ɵConsole,
      /** An Angular Console Provider that does not print a set of predefined logs. */
      useFactory: () => {
        class Console extends ɵConsole {
          private readonly ignoredLogs = new Set(['Angular is running in development mode.']);
          override log(message: string): void {
            if (!this.ignoredLogs.has(message)) {
              super.log(message);
            }
          }
        }

        return new Console();
      },
    },
  ];

  assert(
    bootstrapAppFnOrModule,
    'The file "./main.server.mjs" does not have a default export for an AppServerModule or a bootstrapping function.',
  );

  let renderAppPromise: Promise<string>;
  if (isBootstrapFn(bootstrapAppFnOrModule)) {
    renderAppPromise = renderApplication(bootstrapAppFnOrModule, {
      document,
      url: route,
      platformProviders,
    });
  } else {
    renderAppPromise = renderModule(bootstrapAppFnOrModule, {
      document,
      url: route,
      extraProviders: platformProviders,
    });
  }

  // The below should really handled by the framework!!!.
  // See: https://github.com/angular/angular/issues/51549
  let timer: NodeJS.Timeout;
  const renderingTimeout = new Promise<never>(
    (_, reject) =>
      (timer = setTimeout(
        () =>
          reject(
            new Error(
              `Page ${new URL(route, 'resolve://').pathname} did not render in 30 seconds.`,
            ),
          ),
        30_000,
      )),
  );

  const html = await Promise.race([renderAppPromise, renderingTimeout]).finally(() =>
    clearTimeout(timer),
  );

  if (inlineCriticalCss) {
    const { InlineCriticalCssProcessor } = await import(
      '../../utils/index-file/inline-critical-css'
    );

    const inlineCriticalCssProcessor = new InlineCriticalCssProcessor({
      minify: false, // CSS has already been minified during the build.
      readAsset: async (filePath) => {
        filePath = basename(filePath);
        const content = outputFiles[filePath];
        if (content === undefined) {
          throw new Error(`Output file does not exist: ${filePath}`);
        }

        return content;
      },
    });

    return inlineCriticalCssProcessor.process(html, { outputPath: '' });
  }

  return {
    content: html,
  };
}

function isBootstrapFn(
  value: unknown,
): value is (context: BootstrapContext) => Promise<ApplicationRef> {
  // We can differentiate between a module and a bootstrap function by reading compiler-generated `ɵmod` static property:
  return typeof value === 'function' && !('ɵmod' in value);
}
