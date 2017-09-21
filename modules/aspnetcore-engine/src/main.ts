import { Type, NgModuleFactory, NgModuleRef, ApplicationRef, CompilerFactory, Compiler } from '@angular/core';
import { platformServer, platformDynamicServer, PlatformState, INITIAL_CONFIG } from '@angular/platform-server';
import { ResourceLoader } from '@angular/compiler';

import { REQUEST, ORIGIN_URL } from './tokens';
import { FileLoader } from './file-loader';

import { IEngineOptions } from './interfaces/engine-options';

import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/first';

export function ngAspnetCoreEngine(
  options: IEngineOptions
): Promise<{ html: string, globals: { styles: string, title: string, meta: string, transferData?: {}, [key: string]: any } }> {

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
        options.providers,
        [
          {
            provide: INITIAL_CONFIG,
            useValue: {
              document: options.appSelector,
              url: options.request.url
            }
          },
          {
            provide: ORIGIN_URL,
            useValue: options.request.origin
          }, {
            provide: REQUEST,
            useValue: options.request.data.request
          }
        ]
      );

      const platform = platformServer(extraProviders);

      getFactory(moduleOrFactory, compiler)
        .then((factory: NgModuleFactory<{}>) => {

          return platform.bootstrapModuleFactory(factory).then((moduleRef: NgModuleRef<{}>) => {

            const state: PlatformState = moduleRef.injector.get(PlatformState);
            const appRef: ApplicationRef = moduleRef.injector.get(ApplicationRef);

            appRef.isStable
              .filter((isStable: boolean) => isStable)
              .first()
              .subscribe(() => {

                // Fire the TransferState Cache
                const bootstrap = (<{ ngOnBootstrap?: Function }> moduleRef.instance).ngOnBootstrap;
                bootstrap && bootstrap();

                // The Document itself
                const AST_DOCUMENT = state.getDocument();

                // Strip out the Angular application
                const htmlDoc = state.renderToString();

                const APP_HTML = htmlDoc.substring(
                  htmlDoc.indexOf('<body>') + 6,
                  htmlDoc.indexOf('</body>')
                );

                // Strip out Styles / Meta-tags / Title
                // const STYLES = [];
                const META = [];
                const LINKS = [];
                let TITLE = '';

                let STYLES_STRING = htmlDoc.substring(
                  htmlDoc.indexOf('<style ng-transition'),
                  htmlDoc.lastIndexOf('</style>') + 8
                );
                // STYLES_STRING = STYLES_STRING.replace(/\s/g, '').replace('<styleng-transition', '<style ng-transition');

                const HEAD = AST_DOCUMENT.head;

                let count = 0;

                for (let i = 0; i < HEAD.children.length; i++) {
                  let element = HEAD.children[i];

                  if (element.name === 'title') {
                    TITLE = element.children[0].data;
                  }

                  // Broken after 4.0 (worked in rc) - needs investigation
                  // As other things could be in <style> so we ideally want to get them this way

                  // if (element.name === 'style') {
                  //   let styleTag = '<style ';
                  //   for (let key in element.attribs) {
                  //     if (key) {
                  //       styleTag += `${key}="${element.attribs[key]}">`;
                  //     }
                  //   }

                  //   styleTag += `${element.children[0].data}</style>`;
                  //   STYLES.push(styleTag);
                  // }

                  if (element.name === 'meta') {
                    count = count + 1;
                    let metaString = '<meta';
                    for (let key in element.attribs) {
                      if (key) {
                        metaString += ` ${key}="${element.attribs[key]}"`;
                      }
                    }
                    META.push(`${metaString} />\n`);
                  }

                  if (element.name === 'link') {
                    let linkString = '<link';
                    for (let key in element.attribs) {
                      if (key) {
                        linkString += ` ${key}="${element.attribs[key]}"`;
                      }
                    }
                    LINKS.push(`${linkString} />\n`);
                  }
                }

                // Return parsed App
                resolve({
                  html: APP_HTML,
                  globals: {
                    styles: STYLES_STRING,
                    title: TITLE,
                    meta: META.join(' '),
                    links: LINKS.join(' ')
                  }
                });

                moduleRef.destroy();

              }, (err) => {
                reject(err);
              });

          });
        });

    } catch (ex) {
      reject(ex);
    }

  });
}

/* ********************** Private / Internal ****************** */

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
