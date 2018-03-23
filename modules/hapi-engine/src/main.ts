/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as fs from 'fs';
import { Request, Response } from 'hapi';

import { NgModuleFactory, Type, CompilerFactory, Compiler, StaticProvider } from '@angular/core';
import { ResourceLoader } from '@angular/compiler';
import {
  INITIAL_CONFIG,
  renderModuleFactory,
  platformDynamicServer
} from '@angular/platform-server';

import { FileLoader } from './file-loader';
import { REQUEST, RESPONSE } from '@nguniversal/hapi-engine/tokens';

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
export function ngHapiEngine(options: RenderOptions) {

  const compilerFactory: CompilerFactory = platformDynamicServer().injector.get(CompilerFactory);
  const compiler: Compiler = compilerFactory.createCompiler([
    {
      providers: [
        { provide: ResourceLoader, useClass: FileLoader, deps: [] }
      ]
    }
  ]);

  if (options.req.raw.req.url === undefined) {
    return Promise.reject(new Error('url is undefined'));
  }

  const filePath = <string> options.req.raw.req.url;

  options.providers = options.providers || [];

  return new Promise((resolve, reject) => {
    const moduleOrFactory = options.bootstrap;

    if (!moduleOrFactory) {
      return reject(new Error('You must pass in a NgModule or NgModuleFactory to be bootstrapped'));
    }

    const extraProviders = options.providers!.concat(
      options.providers!,
      getReqProviders(options.req),
      [
        {
          provide: INITIAL_CONFIG,
          useValue: {
            document: options.document || getDocument(filePath),
            url: options.url || filePath
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
        resolve(html);
      }, (err) => {
        reject(err);
      });
  });
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
function getReqProviders(req: Request): StaticProvider[] {
  const providers: StaticProvider[] = [
    {
      provide: REQUEST,
      useValue: req
    }
  ];
  providers.push({
    provide: RESPONSE,
    useValue: req.raw.res
  });
  return providers;
}

/**
 * Get the document at the file path
 */
function getDocument(filePath: string): string {
  return templateCache[filePath] = templateCache[filePath] || fs.readFileSync(filePath).toString();
}
