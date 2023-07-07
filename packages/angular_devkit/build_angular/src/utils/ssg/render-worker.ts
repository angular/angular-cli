/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { ApplicationRef, StaticProvider, Type } from '@angular/core';
import type { renderApplication, renderModule, ɵSERVER_CONTEXT } from '@angular/platform-server';
import assert from 'node:assert';
import { basename } from 'node:path';
import { workerData } from 'node:worker_threads';
import { InlineCriticalCssProcessor } from '../index-file/inline-critical-css';
import { loadEsmModule } from '../load-esm';

export interface RenderOptions {
  route: string;
  serverContext: ServerContext;
}

export interface RenderResult {
  errors?: string[];
  warnings?: string[];
  content?: string;
}

export type ServerContext = 'app-shell' | 'ssg';

export interface WorkerData {
  zonePackage: string;
  outputFiles: Record<string, string>;
  document: string;
  inlineCriticalCss?: boolean;
}

interface BundleExports {
  /** An internal token that allows providing extra information about the server context. */
  ɵSERVER_CONTEXT?: typeof ɵSERVER_CONTEXT;

  /** Render an NgModule application. */
  renderModule?: typeof renderModule;

  /** Method to render a standalone application. */
  renderApplication?: typeof renderApplication;

  /** Standalone application bootstrapping function. */
  default?: (() => Promise<ApplicationRef>) | Type<unknown>;
}

/**
 * The fully resolved path to the zone.js package that will be loaded during worker initialization.
 * This is passed as workerData when setting up the worker via the `piscina` package.
 */
const { zonePackage, outputFiles, document, inlineCriticalCss } = workerData as WorkerData;

/**
 * Renders each route in routes and writes them to <outputPath>/<route>/index.html.
 */
async function render({ route, serverContext }: RenderOptions): Promise<RenderResult> {
  const {
    default: bootstrapAppFnOrModule,
    ɵSERVER_CONTEXT,
    renderModule,
    renderApplication,
  } = await loadEsmModule<BundleExports>('./server.mjs');

  assert(ɵSERVER_CONTEXT, `ɵSERVER_CONTEXT was not exported.`);

  const platformProviders: StaticProvider[] = [
    {
      provide: ɵSERVER_CONTEXT,
      useValue: serverContext,
    },
  ];

  let html: string | undefined;

  if (isBootstrapFn(bootstrapAppFnOrModule)) {
    assert(renderApplication, `renderApplication was not exported.`);
    html = await renderApplication(bootstrapAppFnOrModule, {
      document,
      url: route,
      platformProviders,
    });
  } else {
    assert(renderModule, `renderModule was not exported.`);
    assert(
      bootstrapAppFnOrModule,
      `Neither an AppServerModule nor a bootstrapping function was exported.`,
    );

    html = await renderModule(bootstrapAppFnOrModule, {
      document,
      url: route,
      extraProviders: platformProviders,
    });
  }

  if (inlineCriticalCss) {
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

function isBootstrapFn(value: unknown): value is () => Promise<ApplicationRef> {
  // We can differentiate between a module and a bootstrap function by reading `cmp`:
  return typeof value === 'function' && !('ɵmod' in value);
}

/**
 * Initializes the worker when it is first created by loading the Zone.js package
 * into the worker instance.
 *
 * @returns A promise resolving to the render function of the worker.
 */
async function initialize() {
  // Setup Zone.js
  await import(zonePackage);

  return render;
}

/**
 * The default export will be the promise returned by the initialize function.
 * This is awaited by piscina prior to using the Worker.
 */
export default initialize();
