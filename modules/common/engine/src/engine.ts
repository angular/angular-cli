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
import { ɵInlineCriticalCssProcessor as InlineCriticalCssProcessor } from '@nguniversal/common/tools';
import * as fs from 'fs';
import { dirname, resolve } from 'path';
import { URL } from 'url';

export interface RenderOptions {
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
  private readonly pageExists = new Map<string, boolean>();

  constructor(
    private bootstrap?: Type<{}> | (() => Promise<ApplicationRef>),
    private providers: StaticProvider[] = [],
  ) {
    this.inlineCriticalCssProcessor = new InlineCriticalCssProcessor({
      minify: true,
    });
  }

  /**
   * Render an HTML document for a specific URL with specified
   * render options
   */
  async render(opts: RenderOptions): Promise<string> {
    const { inlineCriticalCss = true } = opts;

    if (opts.publicPath && opts.documentFilePath && opts.url !== undefined) {
      const url = new URL(opts.url);
      // Remove leading forward slash.
      const pathname = url.pathname.substring(1);
      const pagePath = resolve(opts.publicPath, pathname, 'index.html');

      if (pagePath !== resolve(opts.documentFilePath)) {
        // View path doesn't match with prerender path.
        let pageExists = this.pageExists.get(pagePath);
        if (pageExists === undefined) {
          pageExists = await exists(pagePath);
          this.pageExists.set(pagePath, pageExists);
        }

        if (pageExists) {
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

    let doc = opts.document;
    if (!doc && opts.documentFilePath) {
      doc = await this.getDocument(opts.documentFilePath);
    }

    if (doc) {
      extraProviders.push({
        provide: INITIAL_CONFIG,
        useValue: {
          document: inlineCriticalCss
            ? // Workaround for https://github.com/GoogleChromeLabs/critters/issues/64
              doc.replace(
                / media="print" onload="this\.media='.+?'"(?: ngCspMedia=".+")?><noscript><link .+?><\/noscript>/g,
                '>',
              )
            : doc,
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
  // We can differentiate between a module and a bootstrap function by reading `cmp`:
  return typeof value === 'function' && !('ɵmod' in value);
}
