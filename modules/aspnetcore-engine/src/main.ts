import { Type, NgModuleFactory, CompilerFactory, Compiler } from '@angular/core';
import { platformDynamicServer, BEFORE_APP_SERIALIZED, renderModuleFactory } from '@angular/platform-server';
import { ResourceLoader } from '@angular/compiler';

import { REQUEST, ORIGIN_URL } from './tokens';
import { FileLoader } from './file-loader';

import { IEngineOptions } from './interfaces/engine-options';
import { DOCUMENT } from '@angular/platform-browser';

/* @internal */
export class UniversalData {
  public static appNode = '';
  public static title = '';
  public static scripts = '';
  public static styles = '';
  public static meta = '';
  public static links = '';
}

/* @internal */
let appSelector = 'app-root'; // default

/* @internal */
function beforeAppSerialized(
  doc: any /* TODO: type definition for Domino - DomAPI Spec (similar to "Document") */
) {

  return () => {
    const STYLES = [];
    const SCRIPTS = [];
    const META = [];
    const LINKS = [];

    for (let i = 0; i < doc.head.children.length; i++) {
      const element = doc.head.children[i];
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

    UniversalData.title = doc.title;
    UniversalData.appNode = doc.querySelector(appSelector).outerHTML;
    UniversalData.scripts = SCRIPTS.join(' ');
    UniversalData.styles = STYLES.join(' ');
    UniversalData.meta = META.join(' ');
    UniversalData.links = LINKS.join(' ');
  };
}


export function ngAspnetCoreEngine(
  options: IEngineOptions
): Promise<{ html: string, globals: { styles: string, title: string, meta: string, transferData?: {}, [key: string]: any } }> {

  if (!options.appSelector) {
    throw new Error(`appSelector is required! Pass in " appSelector: '<app-root></app-root>' ", for your root App component.`);
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

      const extraProviders = options.providers.concat(
        ...options.providers,
          [{
            provide: ORIGIN_URL,
            useValue: options.request.origin
          }, {
            provide: REQUEST,
            useValue: options.request.data.request
          }, {
            provide: BEFORE_APP_SERIALIZED,
            useFactory: beforeAppSerialized, multi: true, deps: [ DOCUMENT ]
          }
        ]
      );

      getFactory(moduleOrFactory, compiler)
        .then(factory => {
          return renderModuleFactory(factory, {
            document: options.appSelector,
            url: options.request.url,
            extraProviders: extraProviders
          });
        })
        .then(() => {

          resolve({
            html: UniversalData.appNode,
            globals: {
              styles: UniversalData.styles,
              title: UniversalData.title,
              scripts: UniversalData.scripts,
              meta: UniversalData.meta,
              links: UniversalData.links
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
