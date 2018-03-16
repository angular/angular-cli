/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as fs from 'fs';
import { Request, Response } from 'express';

import { NgModuleFactory, Type, CompilerFactory, Compiler, StaticProvider } from '@angular/core';
import { ResourceLoader } from '@angular/compiler';
import {
  INITIAL_CONFIG,
  renderModuleFactory,
  platformDynamicServer
} from '@angular/platform-server';

import { FileLoader } from './file-loader';
import { REQUEST, RESPONSE } from '../tokens';

/**
 * These are the allowed options for the engine
 */
export interface NgSetupOptions {
  bootstrap: Type<{}> | NgModuleFactory<{}>;
  providers?: StaticProvider[];
}

/**
 * These are the allowed options for the render
 */
export interface RenderOptions extends NgSetupOptions {
  req: Request;
  res?: Response;
  url?: string;
  document?: string;
}

/**
 * This holds a cached version of each index used.
 */
const templateCache: { [key: string]: string } = {};

/**
 * Map of Module Factories
 */
const factoryCacheMap = new Map<Type<{}>, NgModuleFactory<{}>>();

/**
 * This is an express engine for handling Angular Applications
 */
export function ngExpressEngine(setupOptions: NgSetupOptions) {

  const compilerFactory: CompilerFactory = platformDynamicServer().injector.get(CompilerFactory);
  const compiler: Compiler = compilerFactory.createCompiler([
    {
      providers: [
        { provide: ResourceLoader, useClass: FileLoader, deps: [] }
      ]
    }
  ]);

  return function (filePath: string,
                   options: RenderOptions,
                   callback: (err?: Error | null, html?: string) => void) {

    options.providers = options.providers || [];

    try {
      const moduleOrFactory = options.bootstrap || setupOptions.bootstrap;

      if (!moduleOrFactory) {
        throw new Error('You must pass in a NgModule or NgModuleFactory to be bootstrapped');
      }

      setupOptions.providers = setupOptions.providers || [];

      const extraProviders = setupOptions.providers.concat(
        options.providers,
        getReqResProviders(options.req, options.res),
        [
          {
            provide: INITIAL_CONFIG,
            useValue: {
              document: options.document || getDocument(filePath),
              url: options.url || options.req.originalUrl
            }
          }
        ]);

      getFactory(moduleOrFactory, compiler)
        .then(factory => {
          return renderModuleFactory(factory, {
            extraProviders
          });
        })
        .then((html: string) => {
          callback(null, html);
        }, (err) => {
          callback(err);
        });
    } catch (err) {
      callback(err);
    }
  };
}

/**
 * Get a factory from a bootstrapped module/ module factory
 */
function getFactory(
  moduleOrFactory: Type<{}> | NgModuleFactory<{}>, compiler: Compiler
): Promise<NgModuleFactory<{}>> {
  return new Promise<NgModuleFactory<{}>>((resolve, reject) => {
    // If module has been compiled AoT
    if (moduleOrFactory instanceof NgModuleFactory) {
      resolve(moduleOrFactory);
      return;
    } else {
      let moduleFactory = factoryCacheMap.get(moduleOrFactory);

      // If module factory is cached
      if (moduleFactory) {
        resolve(moduleFactory);
        return;
      }

      // Compile the module and cache it
      compiler.compileModuleAsync(moduleOrFactory)
        .then((factory) => {
          factoryCacheMap.set(moduleOrFactory, factory);
          resolve(factory);
        }, (err => {
          reject(err);
        }));
    }
  });
}

/**
 * Get providers of the request and response
 */
function getReqResProviders(req: Request, res?: Response): StaticProvider[] {
  const providers: StaticProvider[] = [
    {
      provide: REQUEST,
      useValue: req
    }
  ];
  if (res) {
    providers.push({
      provide: RESPONSE,
      useValue: res
    });
  }
  return providers;
}

/**
 * Get the document at the file path
 */
function getDocument(filePath: string): string {
  return templateCache[filePath] = templateCache[filePath] || fs.readFileSync(filePath).toString();
}
