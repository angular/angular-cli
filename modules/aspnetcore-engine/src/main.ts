/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { DOCUMENT } from '@angular/common';
import { ResourceLoader } from '@angular/compiler';
import { Compiler, CompilerFactory, NgModuleFactory, StaticProvider, Type } from '@angular/core';
import { platformDynamicServer } from '@angular/platform-server';

import { ORIGIN_URL, REQUEST } from '@nguniversal/aspnetcore-engine/tokens';
import { ɵFileLoader } from '@nguniversal/common/engine';
import { IEngineOptions } from './interfaces/engine-options';
import { IEngineRenderResult } from './interfaces/engine-render-result';
import { renderModuleFactory } from './platform-server-utils';

/* @internal */
let appSelector = 'app-root'; // default

/* @internal */
function _getUniversalData(doc: Document): Omit<IEngineRenderResult, 'moduleRef'> {

  const styles: string[] = [];
  const scripts: string[] = [];
  const meta: string[] = [];
  const links: string[] = [];

  // tslint:disable: no-non-null-assertion
  const elements = [
    ...Array.from(doc.head!.children),
    ...Array.from(doc.body!.children),
  ];
  // tslint:enable: no-non-null-assertion

  for (const element of elements) {
    switch (element.tagName.toUpperCase()) {
      case 'SCRIPT':
        scripts.push(element.outerHTML);
        break;
      case 'STYLE':
        styles.push(element.outerHTML);
        break;
      case 'LINK':
        links.push(element.outerHTML);
        break;
      case 'META':
        meta.push(element.outerHTML);
        break;
      default:
        break;
    }
  }

  return {
    // tslint:disable-next-line: no-non-null-assertion
    html: doc.querySelector(appSelector)!.outerHTML,
    globals: {
      title: doc.title,
      scripts: scripts.join('\n'),
      styles: styles.join('\n'),
      meta: meta.join('\n'),
      links: links.join('\n')
    }
  };
}

export async function ngAspnetCoreEngine(options: Readonly<IEngineOptions>)
  : Promise<IEngineRenderResult> {
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
        { provide: ResourceLoader, useClass: ɵFileLoader, deps: [] }
      ]
    }
  ]);

  const moduleOrFactory = options.ngModule;
  if (!moduleOrFactory) {
    throw new Error('You must pass in a NgModule or NgModuleFactory to be bootstrapped');
  }

  const extraProviders = [
    ...(options.providers || []),
    getReqResProviders(options.request.origin, options.request.data.request),
  ];

  const factory = await getFactory(moduleOrFactory, compiler);
  const result = await renderModuleFactory(factory, {
    document: options.document || options.appSelector,
    url: options.url || options.request.absoluteUrl,
    extraProviders,
  });

  const doc = result.moduleRef.injector.get(DOCUMENT);

  return {
    moduleRef: result.moduleRef,
    ..._getUniversalData(doc),
  };
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
async function getFactory(
  moduleOrFactory: Type<{}> | NgModuleFactory<{}>, compiler: Compiler
): Promise<NgModuleFactory<{}>> {
  // If module has been compiled AoT
  if (moduleOrFactory instanceof NgModuleFactory) {
    return moduleOrFactory;
  } else {
    const moduleFactory = factoryCacheMap.get(moduleOrFactory);
    // If module factory is cached
    if (moduleFactory) {
      return moduleFactory;
    }

    // Compile the module and cache it
    const factory = await compiler.compileModuleAsync(moduleOrFactory);
    factoryCacheMap.set(moduleOrFactory, factory);

    return factory;
  }
}
