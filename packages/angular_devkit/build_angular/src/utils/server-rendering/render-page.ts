/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import type { ApplicationRef, StaticProvider, Type } from '@angular/core';
import type { renderApplication, renderModule, ɵSERVER_CONTEXT } from '@angular/platform-server';
import { basename } from 'node:path';
import { InlineCriticalCssProcessor } from '../index-file/inline-critical-css';
import { loadEsmModule } from '../load-esm';

export interface RenderOptions {
  route: string;
  serverContext: ServerContext;
  outputFiles: Record<string, string>;
  document: string;
  inlineCriticalCss?: boolean;
  loadBundle?: (path: string) => Promise<MainServerBundleExports>;
}

export interface RenderResult {
  errors?: string[];
  warnings?: string[];
  content?: string;
}

export type ServerContext = 'app-shell' | 'ssg' | 'ssr';

interface MainServerBundleExports {
  /** An internal token that allows providing extra information about the server context. */
  ɵSERVER_CONTEXT: typeof ɵSERVER_CONTEXT;

  /** Render an NgModule application. */
  renderModule: typeof renderModule;

  /** Method to render a standalone application. */
  renderApplication: typeof renderApplication;

  /** Standalone application bootstrapping function. */
  default: (() => Promise<ApplicationRef>) | Type<unknown>;
}

/**
 * Renders each route in routes and writes them to <outputPath>/<route>/index.html.
 */
export async function renderPage({
  route,
  serverContext,
  document,
  inlineCriticalCss,
  outputFiles,
  loadBundle = loadEsmModule,
}: RenderOptions): Promise<RenderResult> {
  const {
    default: bootstrapAppFnOrModule,
    ɵSERVER_CONTEXT,
    renderModule,
    renderApplication,
  } = await loadBundle('./main.server.mjs');

  const platformProviders: StaticProvider[] = [
    {
      provide: ɵSERVER_CONTEXT,
      useValue: serverContext,
    },
  ];

  let html: string | undefined;

  if (isBootstrapFn(bootstrapAppFnOrModule)) {
    html = await renderApplication(bootstrapAppFnOrModule, {
      document,
      url: route,
      platformProviders,
    });
  } else {
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
