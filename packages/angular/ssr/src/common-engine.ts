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
import { InlineCriticalCssProcessor } from './inline-css-processor';

const SSG_MARKER_REGEXP = /ng-server-context=["']\w*\|?ssg\|?\w*["']/;

export interface CommonEngineRenderOptions {
  bootstrap?: Type<{}> | (() => Promise<ApplicationRef>);
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
 * A common rendering engine utility. This abstracts the logic
 * for handling the platformServer compiler, the module cache, and
 * the document loader
 */
export class CommonEngine {
  private readonly templateCache = new Map<string, string>();
  private readonly inlineCriticalCssProcessor: InlineCriticalCssProcessor;
  private readonly pageIsSSG = new Map<string, boolean>();

  constructor(
    private bootstrap?: Type<{}> | (() => Promise<ApplicationRef>),
    private providers: StaticProvider[] = [],
  ) {
    this.inlineCriticalCssProcessor = new InlineCriticalCssProcessor({
      minify: false,
    });
  }

  /**
   * Render an HTML document for a specific URL with specified
   * render options
   */
  async render(opts: CommonEngineRenderOptions): Promise<string> {
    const { inlineCriticalCss = true, url } = opts;

    if (opts.publicPath && opts.documentFilePath && url !== undefined) {
      const pathname = canParseUrl(url) ? new URL(url).pathname : url;
      // Remove leading forward slash.
      const pagePath = resolve(opts.publicPath, pathname.substring(1), 'index.html');

      if (pagePath !== resolve(opts.documentFilePath)) {
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
    }

    // if opts.document dosen't exist then opts.documentFilePath must
    const extraProviders: StaticProvider[] = [
      { provide: ɵSERVER_CONTEXT, useValue: 'ssr' },
      ...(opts.providers ?? []),
      ...this.providers,
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

    const moduleOrFactory = this.bootstrap || opts.bootstrap;
    if (!moduleOrFactory) {
      throw new Error('A module or bootstrap option must be provided.');
    }

    const html = await (isBootstrapFn(moduleOrFactory)
      ? renderApplication(moduleOrFactory, { platformProviders: extraProviders })
      : renderModule(moduleOrFactory, { extraProviders }));

    if (!inlineCriticalCss) {
      return html;
    }

    const { content, errors, warnings } = await this.inlineCriticalCssProcessor.process(html, {
      outputPath: opts.publicPath ?? (opts.documentFilePath ? dirname(opts.documentFilePath) : ''),
    });

    // eslint-disable-next-line no-console
    warnings?.forEach((m) => console.warn(m));
    // eslint-disable-next-line no-console
    errors?.forEach((m) => console.error(m));

    return content;
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
