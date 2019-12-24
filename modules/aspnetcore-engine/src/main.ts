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

  // tslint:disable-next-line: no-non-null-assertion
  for (let i = 0; i < doc.head!.children.length; i++) {
    // tslint:disable-next-line: no-non-null-assertion
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
    // tslint:disable-next-line: no-non-null-assertion
    appNode: doc.querySelector(appSelector)!.outerHTML,
    scripts: SCRIPTS.join('\n'),
    styles: STYLES.join('\n'),
    meta: META.join('\n'),
    links: LINKS.join('\n')
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
        { provide: ResourceLoader, useClass: FileLoader, deps: [] }
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
  const universalData = _getUniversalData(doc);

  return {
    html: universalData.appNode,
    moduleRef: result.moduleRef,
    globals: {
      styles: universalData.styles,
      title: universalData.title,
      scripts: universalData.scripts,
      meta: universalData.meta,
      links: universalData.links
    }
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
