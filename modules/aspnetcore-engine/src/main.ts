/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {Type, NgModuleFactory, CompilerFactory, Compiler, StaticProvider} from '@angular/core';
import { platformDynamicServer } from '@angular/platform-server';
import { DOCUMENT } from '@angular/common';
import { ResourceLoader } from '@angular/compiler';

import { REQUEST, ORIGIN_URL } from '@nguniversal/aspnetcore-engine/tokens';
import { FileLoader } from './file-loader';
import { IEngineOptions } from './interfaces/engine-options';
import { IEngineRenderResult } from './interfaces/engine-render-result';
import { renderModuleFactory } from './platform-server-utils';

/* @internal */
export class UniversalData {
  appNode = '';
  title = '';
  scripts = '';
  styles = '';
  meta = '';
  links = '';
}

/* @internal */
let appSelector = 'app-root'; // default

/* @internal */
function _getUniversalData(doc: Document): UniversalData {

  const STYLES: string[] = [];
  const SCRIPTS: string[] = [];
  const META: string[] = [];
  const LINKS: string[] = [];

  for (let i = 0; i < doc.head!.children.length; i++) {
    const element = doc.head!.children[i];
    const tagName = element.tagName.toUpperCase();

    switch (tagName) {
      case 'SCRIPT':
        SCRIPTS.push(element.outerHTML);
        break;
      case 'STYLE':
        STYLES.push(element.outerHTML);
        break;
      case 'LINK':
        LINKS.push(element.outerHTML);
        break;
      case 'META':
        META.push(element.outerHTML);
        break;
      default:
        break;
    }
  }

  for (let i = 0; i < doc.body.children.length; i++) {
    const element: Element = doc.body.children[i];
    const tagName = element.tagName.toUpperCase();

    switch (tagName) {
      case 'SCRIPT':
        SCRIPTS.push(element.outerHTML);
        break;
      case 'STYLE':
        STYLES.push(element.outerHTML);
        break;
      case 'LINK':
        LINKS.push(element.outerHTML);
        break;
      case 'META':
        META.push(element.outerHTML);
        break;
      default:
        break;
    }
  }

  return {
    title: doc.title,
    appNode: doc.querySelector(appSelector)!.outerHTML,
    scripts: SCRIPTS.join('\n'),
    styles: STYLES.join('\n'),
    meta: META.join('\n'),
    links: LINKS.join('\n')
  };
}

export function ngAspnetCoreEngine(options: IEngineOptions): Promise<IEngineRenderResult> {

  if (!options.appSelector) {
    const selector = `" appSelector: '<${appSelector}></${appSelector}>' "`;
    throw new Error(`appSelector is required! Pass in ${selector},
     for your root App component.`);
  }

  // Grab the DOM "selector" from the passed in Template <app-root> for example = "app-root"
  appSelector = options.appSelector.substring(1, options.appSelector.indexOf('>'));

  const compilerFactory: CompilerFactory = platformDynamicServer().injector.get(CompilerFactory);
  const compiler: Compiler = compilerFactory.createCompiler([
    {
      providers: [
        { provide: ResourceLoader, useClass: FileLoader, deps: [] }
      ]
    }
  ]);

  return new Promise((resolve, reject) => {

    try {
      const moduleOrFactory = options.ngModule;
      if (!moduleOrFactory) {
        throw new Error('You must pass in a NgModule or NgModuleFactory to be bootstrapped');
      }

      options.providers = options.providers || [];

      const extraProviders = options.providers.concat(getReqResProviders(options.request.origin,
        options.request.data.request));

      getFactory(moduleOrFactory, compiler)
        .then(factory => {
          return renderModuleFactory(factory, {
            document: options.document || options.appSelector,
            url: options.url || options.request.absoluteUrl,
            extraProviders: extraProviders
          });
        })
        .then(result => {
          const doc = result.moduleRef.injector.get(DOCUMENT);
          const universalData = _getUniversalData(doc);

          resolve({
            html: universalData.appNode,
            moduleRef: result.moduleRef,
            globals: {
              styles: universalData.styles,
              title: universalData.title,
              scripts: universalData.scripts,
              meta: universalData.meta,
              links: universalData.links
            }
          });
        }, (err) => {
          reject(err);
        });

    } catch (ex) {
      reject(ex);
    }

  });

}

/**
 * Get providers of the request and response
 */
function getReqResProviders(origin: string, request: string): StaticProvider[] {
  const providers: StaticProvider[] = [
    {
      provide: ORIGIN_URL,
      useValue: origin
    },
    {
      provide: REQUEST,
      useValue: request
    }
  ];
  return providers;
}

/* @internal */
const factoryCacheMap = new Map<Type<{}>, NgModuleFactory<{}>>();
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
