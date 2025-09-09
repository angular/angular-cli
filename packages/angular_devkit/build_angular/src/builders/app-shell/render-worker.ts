/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { ApplicationRef, StaticProvider, Type } from '@angular/core';
import type { BootstrapContext } from '@angular/platform-browser';
import type { renderApplication, renderModule, ɵSERVER_CONTEXT } from '@angular/platform-server';
import assert from 'node:assert';
import { workerData } from 'node:worker_threads';

/**
 * The fully resolved path to the zone.js package that will be loaded during worker initialization.
 * This is passed as workerData when setting up the worker via the `piscina` package.
 */
const { zonePackage } = workerData as {
  zonePackage: string;
};

interface ServerBundleExports {
  /** An internal token that allows providing extra information about the server context. */
  ɵSERVER_CONTEXT?: typeof ɵSERVER_CONTEXT;

  /** Render an NgModule application. */
  renderModule?: typeof renderModule;

  /** NgModule to render. */
  AppServerModule?: Type<unknown>;

  /** Method to render a standalone application. */
  renderApplication?: typeof renderApplication;

  /** Standalone application bootstrapping function. */
  default?: (context: BootstrapContext) => Promise<ApplicationRef>;
}

/**
 * A request to render a Server bundle generate by the universal server builder.
 */
interface RenderRequest {
  /**
   * The path to the server bundle that should be loaded and rendered.
   */
  serverBundlePath: string;

  /**
   * The existing HTML document as a string that will be augmented with the rendered application.
   */
  document: string;

  /**
   * An optional URL path that represents the Angular route that should be rendered.
   */
  url: string;
}

/**
 * Renders an application based on a provided server bundle path, initial document, and optional URL route.
 * @param param0 A request to render a server bundle.
 * @returns A promise that resolves to the render HTML document for the application.
 */
async function render({ serverBundlePath, document, url }: RenderRequest): Promise<string> {
  const {
    ɵSERVER_CONTEXT,
    AppServerModule,
    renderModule,
    renderApplication,
    default: bootstrapAppFn,
  } = (await import(serverBundlePath)) as ServerBundleExports;

  assert(ɵSERVER_CONTEXT, `ɵSERVER_CONTEXT was not exported from: ${serverBundlePath}.`);

  const platformProviders: StaticProvider[] = [
    {
      provide: ɵSERVER_CONTEXT,
      useValue: 'app-shell',
    },
  ];

  let renderAppPromise: Promise<string>;
  // Render platform server module
  if (isBootstrapFn(bootstrapAppFn)) {
    assert(renderApplication, `renderApplication was not exported from: ${serverBundlePath}.`);

    renderAppPromise = renderApplication(bootstrapAppFn, {
      document,
      url,
      platformProviders,
    });
  } else {
    assert(renderModule, `renderModule was not exported from: ${serverBundlePath}.`);
    const moduleClass = bootstrapAppFn || AppServerModule;
    assert(
      moduleClass,
      `Neither an AppServerModule nor a bootstrapping function was exported from: ${serverBundlePath}.`,
    );

    renderAppPromise = renderModule(moduleClass, {
      document,
      url,
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
            new Error(`Page ${new URL(url, 'resolve://').pathname} did not render in 30 seconds.`),
          ),
        30_000,
      )),
  );

  return Promise.race([renderAppPromise, renderingTimeout]).finally(() => clearTimeout(timer));
}

function isBootstrapFn(
  value: unknown,
): value is (context: BootstrapContext) => Promise<ApplicationRef> {
  // We can differentiate between a module and a bootstrap function by reading compiler-generated `ɵmod` static property:
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

  // Return the render function for use
  return render;
}

/**
 * The default export will be the promise returned by the initialize function.
 * This is awaited by piscina prior to using the Worker.
 */
export default initialize();
