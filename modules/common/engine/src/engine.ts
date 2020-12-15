/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { ResourceLoader } from '@angular/compiler';
import { Compiler, CompilerFactory, NgModuleFactory, StaticProvider, Type } from '@angular/core';
import { INITIAL_CONFIG, platformDynamicServer, renderModuleFactory } from '@angular/platform-server';
import { dirname, resolve } from 'path';

import { FileLoader } from './file-loader';
import { InlineCriticalCssProcessor } from './inline-css-processor';
import { exists, readFile } from './utils';

/** These are the allowed options for the render */
export interface RenderOptions {
  bootstrap: Type<{}> | NgModuleFactory<{}>;
  providers?: StaticProvider[];
  url?: string;
  document?: string;
  documentFilePath?: string;
  /**
   * Reduce render blocking requests by inlining critical CSS.
   * Defaults to false.
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

  /** Return an instance of the platformServer compiler */
  getCompiler(): Compiler {
    const compilerFactory: CompilerFactory = platformDynamicServer().injector.get(CompilerFactory);

    return compilerFactory.createCompiler([
      { providers: [{ provide: ResourceLoader, useClass: FileLoader, deps: [] }] }
    ]);
  }

  private factoryCacheMap = new Map<Type<{}>, NgModuleFactory<{}>>();
  private templateCache = new Map<string, string>();
  private inlineCriticalCssProcessor: InlineCriticalCssProcessor;
  private pageExists = new Map<string, boolean>();


  constructor(private moduleOrFactory?: Type<{}> | NgModuleFactory<{}>,
              private providers: StaticProvider[] = []) {
    this.inlineCriticalCssProcessor = new InlineCriticalCssProcessor({
      minify: true,
    });
  }

  /**
   * Render an HTML document for a specific URL with specified
   * render options
   */
  async render(opts: RenderOptions): Promise<string> {
    if (opts.publicPath && opts.documentFilePath && opts.url !== undefined) {
      const url = new URL(opts.url);
      // Remove leading forward slash.
      const pathname  = url.pathname.substring(1);
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
          return readFile(pagePath, 'utf-8');
        }
      }
    }

    // if opts.document dosen't exist then opts.documentFilePath must
    const extraProviders = [
      ...(opts.providers || []),
      ...(this.providers || []),
    ];

    let doc = opts.document;
    if (!doc && opts.documentFilePath) {
      doc = await this.getDocument(opts.documentFilePath);
    }

    if (doc) {
      extraProviders.push({
        provide: INITIAL_CONFIG,
        useValue: {
          document: opts.inlineCriticalCss
            // Workaround for https://github.com/GoogleChromeLabs/critters/issues/64
            ? doc.replace(/ media=\"print\" onload=\"this\.media='all'"><noscript><link .+?><\/noscript>/g, '>')
            : doc,
          url: opts.url
        }
      });
    }

    const moduleOrFactory = this.moduleOrFactory || opts.bootstrap;
    const factory = await this.getFactory(moduleOrFactory);

    const html = await renderModuleFactory(factory, { extraProviders });
    if (!opts.inlineCriticalCss) {
      return html;
    }

    const { content, errors, warnings } = await this.inlineCriticalCssProcessor.process(html, {
      outputPath: opts.publicPath ?? (opts.documentFilePath ? dirname(opts.documentFilePath) : undefined),
    });

    // tslint:disable-next-line: no-console
    warnings.forEach(m => console.warn(m));
    // tslint:disable-next-line: no-console
    errors.forEach(m => console.error(m));

    return content;
  }

  /** Return the factory for a given engine instance */
  async getFactory(moduleOrFactory: Type<{}> | NgModuleFactory<{}>): Promise<NgModuleFactory<{}>> {
    // If module has been compiled AoT
    if (moduleOrFactory instanceof NgModuleFactory) {
      return moduleOrFactory;
    } else {
      // we're in JIT mode
      const moduleFactory = this.factoryCacheMap.get(moduleOrFactory);

      // If module factory is cached
      if (moduleFactory) {
        return moduleFactory;
      }

      // Compile the module and cache it
      const factory = await this.getCompiler().compileModuleAsync(moduleOrFactory);
      this.factoryCacheMap.set(moduleOrFactory, factory);

      return factory;
    }
  }

  /** Retrieve the document from the cache or the filesystem */
  async getDocument(filePath: string): Promise<string> {
    let doc = this.templateCache.get(filePath);

    if (!doc) {
      doc = await readFile(filePath, 'utf-8');
      this.templateCache.set(filePath, doc);
    }

    return doc;
  }
}
