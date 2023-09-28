/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ApplicationRef, StaticProvider, Type } from '@angular/core';
import {
  INITIAL_CONFIG,
  renderApplication,
  renderModule,
  ɵSERVER_CONTEXT,
} from '@angular/platform-server';
import * as fs from 'node:fs';
import { dirname, resolve } from 'node:path';
import { URL } from 'node:url';
import { InlineCriticalCssProcessor, InlineCriticalCssResult } from './inline-css-processor';
import {
  noopRunMethodAndMeasurePerf,
  printPerformanceLogs,
  runMethodAndMeasurePerf,
} from './peformance-profiler';

const SSG_MARKER_REGEXP = /ng-server-context=["']\w*\|?ssg\|?\w*["']/;

export interface CommonEngineOptions {
  /** A method that when invoked returns a promise that returns an `ApplicationRef` instance once resolved or an NgModule. */
  bootstrap?: Type<{}> | (() => Promise<ApplicationRef>);
  /** A set of platform level providers for all requests. */
  providers?: StaticProvider[];
  /** Enable request performance profiling data collection and printing the results in the server console. */
  enablePeformanceProfiler?: boolean;
}

export interface CommonEngineRenderOptions {
  /** A method that when invoked returns a promise that returns an `ApplicationRef` instance once resolved or an NgModule. */
  bootstrap?: Type<{}> | (() => Promise<ApplicationRef>);
  /** A set of platform level providers for the current request. */
  providers?: StaticProvider[];
  url?: string;
  document?: string;
  documentFilePath?: string;
  /**
   * Reduce render blocking requests by inlining critical CSS.
   * Defaults to true.
   */
  inlineCriticalCss?: boolean;
  /**
   * Base path location of index file.
   * Defaults to the 'documentFilePath' dirname when not provided.
   */
  publicPath?: string;
}

/**
 * A common engine to use to server render an application.
 */

export class CommonEngine {
  private readonly templateCache = new Map<string, string>();
  private readonly inlineCriticalCssProcessor: InlineCriticalCssProcessor;
  private readonly pageIsSSG = new Map<string, boolean>();

  constructor(private options?: CommonEngineOptions) {
    this.inlineCriticalCssProcessor = new InlineCriticalCssProcessor({
      minify: false,
    });
  }

  /**
   * Render an HTML document for a specific URL with specified
   * render options
   */
  async render(opts: CommonEngineRenderOptions): Promise<string> {
    const enablePeformanceProfiler = this.options?.enablePeformanceProfiler;

    const runMethod = enablePeformanceProfiler
      ? runMethodAndMeasurePerf
      : noopRunMethodAndMeasurePerf;

    let html = await runMethod('Retrieve SSG Page', () => this.retrieveSSGPage(opts));

    if (html === undefined) {
      html = await runMethod('Render Page', () => this.renderApplication(opts));

      if (opts.inlineCriticalCss !== false) {
        const { content, errors, warnings } = await runMethod('Inline Critical CSS', () =>
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.inlineCriticalCss(html!, opts),
        );

        html = content;

        // eslint-disable-next-line no-console
        warnings?.forEach((m) => console.warn(m));
        // eslint-disable-next-line no-console
        errors?.forEach((m) => console.error(m));
      }
    }

    if (enablePeformanceProfiler) {
      printPerformanceLogs();
    }

    return html;
  }

  private inlineCriticalCss(
    html: string,
    opts: CommonEngineRenderOptions,
  ): Promise<InlineCriticalCssResult> {
    return this.inlineCriticalCssProcessor.process(html, {
      outputPath: opts.publicPath ?? (opts.documentFilePath ? dirname(opts.documentFilePath) : ''),
    });
  }

  private async retrieveSSGPage(opts: CommonEngineRenderOptions): Promise<string | undefined> {
    const { publicPath, documentFilePath, url } = opts;
    if (!publicPath || !documentFilePath || url === undefined) {
      return undefined;
    }

    const pathname = canParseUrl(url) ? new URL(url).pathname : url;
    // Remove leading forward slash.
    const pagePath = resolve(publicPath, pathname.substring(1), 'index.html');

    if (pagePath !== resolve(documentFilePath)) {
      // View path doesn't match with prerender path.
      const pageIsSSG = this.pageIsSSG.get(pagePath);
      if (pageIsSSG === undefined) {
        if (await exists(pagePath)) {
          const content = await fs.promises.readFile(pagePath, 'utf-8');
          const isSSG = SSG_MARKER_REGEXP.test(content);
          this.pageIsSSG.set(pagePath, isSSG);

          if (isSSG) {
            return content;
          }
        } else {
          this.pageIsSSG.set(pagePath, false);
        }
      } else if (pageIsSSG) {
        // Serve pre-rendered page.
        return fs.promises.readFile(pagePath, 'utf-8');
      }
    }

    return undefined;
  }

  private async renderApplication(opts: CommonEngineRenderOptions): Promise<string> {
    const extraProviders: StaticProvider[] = [
      { provide: ɵSERVER_CONTEXT, useValue: 'ssr' },
      ...(opts.providers ?? []),
      ...(this.options?.providers ?? []),
    ];

    let document = opts.document;
    if (!document && opts.documentFilePath) {
      document = await this.getDocument(opts.documentFilePath);
    }

    if (document) {
      extraProviders.push({
        provide: INITIAL_CONFIG,
        useValue: {
          document,
          url: opts.url,
        },
      });
    }

    const moduleOrFactory = this.options?.bootstrap ?? opts.bootstrap;
    if (!moduleOrFactory) {
      throw new Error('A module or bootstrap option must be provided.');
    }

    return isBootstrapFn(moduleOrFactory)
      ? renderApplication(moduleOrFactory, { platformProviders: extraProviders })
      : renderModule(moduleOrFactory, { extraProviders });
  }

  /** Retrieve the document from the cache or the filesystem */
  private async getDocument(filePath: string): Promise<string> {
    let doc = this.templateCache.get(filePath);

    if (!doc) {
      doc = await fs.promises.readFile(filePath, 'utf-8');
      this.templateCache.set(filePath, doc);
    }

    return doc;
  }
}

async function exists(path: fs.PathLike): Promise<boolean> {
  try {
    await fs.promises.access(path, fs.constants.F_OK);

    return true;
  } catch {
    return false;
  }
}

function isBootstrapFn(value: unknown): value is () => Promise<ApplicationRef> {
  // We can differentiate between a module and a bootstrap function by reading compiler-generated `ɵmod` static property:
  return typeof value === 'function' && !('ɵmod' in value);
}

// The below can be removed in favor of URL.canParse() when Node.js 18 is dropped
function canParseUrl(url: string): boolean {
  try {
    return !!new URL(url);
  } catch {
    return false;
  }
}
