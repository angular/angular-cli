/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {ResourceLoader} from '@angular/compiler';
import {Compiler, Type, NgModuleFactory, CompilerFactory, StaticProvider} from '@angular/core';
import {INITIAL_CONFIG, renderModuleFactory, platformDynamicServer} from '@angular/platform-server';
import * as fs from 'fs';

import {FileLoader} from './file-loader';
import {RenderOptions} from './interfaces';

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
      {providers: [{provide: ResourceLoader, useClass: FileLoader, deps: []}]}
    ]);
  }

  private factoryCacheMap = new Map<Type<{}>, NgModuleFactory<{}>>();
  private templateCache: {[key: string]: string} = {};

  constructor(private moduleOrFactory?: Type<{}> | NgModuleFactory<{}>,
              private providers: StaticProvider[] = []) {}

  /**
   * Render an HTML document for a specific URL with specified
   * render options
   */
  async render(opts: RenderOptions): Promise<string> {
    // if opts.document dosen't exist then opts.documentFilePath must
    const doc = opts.document || await this.getDocument(opts!.documentFilePath as string);
    const extraProviders = [
      ...(opts.providers || []),
      ...(this.providers || []),
      {
        provide: INITIAL_CONFIG,
        useValue: {
          document: doc,
          url: opts.url
        }
      }
    ];

    const moduleOrFactory = this.moduleOrFactory || opts.bootstrap;
    const factory = await this.getFactory(moduleOrFactory);
    return renderModuleFactory(factory, {extraProviders});
  }

  /** Return the factory for a given engine instance */
  getFactory(moduleOrFactory: Type<{}> | NgModuleFactory<{}>): Promise<NgModuleFactory<{}>> {
    // If module has been compiled AoT
    if (moduleOrFactory instanceof NgModuleFactory) {
      return Promise.resolve(moduleOrFactory);
    } else {
      // we're in JIT mode
      let moduleFactory = this.factoryCacheMap.get(moduleOrFactory);

      // If module factory is cached
      if (moduleFactory) {
        return Promise.resolve(moduleFactory);
      }

      // Compile the module and cache it
      return this.getCompiler().compileModuleAsync(moduleOrFactory)
        .then((factory) => {
          this.factoryCacheMap.set(moduleOrFactory, factory);
          return factory;
        });
    }
  }

  /** Retrieve the document from the cache or the filesystem */
  private getDocument(filePath: string): Promise<string> {
    const doc = this.templateCache[filePath] = this.templateCache[filePath] ||
    fs.readFileSync(filePath).toString();

    // As  promise so we can change the API later without breaking
    return Promise.resolve(doc);
  }
}
