import {DOCUMENT} from 'angular2/platform/common_dom';
import {DOM} from 'angular2/src/platform/dom/dom_adapter';
import {NgZone, platform, PlatformRef, ApplicationRef} from 'angular2/core';
import {Http} from 'angular2/http';


import {buildReflector, buildNodeProviders, buildNodeAppProviders} from './platform/node';
import {parseDocument, parseFragment, serializeDocument} from './platform/document';
import {createPrebootCode} from './ng_preboot';
import {waitRouter} from './render';

export interface BootloaderConfig {
  template?: any;
  document?: any;
  platformProviders?: Array<any>;
  providers?: Array<any>;
  componentProviders?: Array<any>;
  component?: any;
  directives?: Array<any>;
  preboot?: any;
  precache?: boolean;
  primeCache?: boolean;
  async?: boolean;
  prime?: boolean;
  ngOnInit?: Function;
  ngOnStable?: Function;
  ngOnRendered?: Function;
}

function checkProviders(providers) {
  let lastProviders = [];
  for (let i = 0; i < providers.length; ++i) {
    let provide = providers[i];
    if (!provide) {
      console.log('undefined provider', providers);
      // lastProviders.push(providers[i-1].name);
    }
    // else if (!provide.token) {
    //   console.log('undefined token', provide);
    //   lastProviders.push(providers[i-1].name);
    // }
  }
  if (lastProviders.length) {
    console.log('PROVIDERS ERRORS', lastProviders);
  }
  return providers;
}

export class Bootloader {
  private _config: BootloaderConfig = {};
  platformRef: any;
  applicationRef: any;
  constructor(config: BootloaderConfig) {
    (<any>Object).assign(this._config, config || {});
    this.platformRef = this.platform();
    // this.applicationRef = this.application();
  }

  static create(config): Bootloader {
    if (config instanceof Bootloader) { return config; }
    return new Bootloader(config);
  }
  static applicationRefToString(applicationRefs) {
    let injector = applicationRefs.injector;
    if (Array.isArray(applicationRefs)) {
      injector = applicationRefs[0].injector;
    }
    let document = injector.get(DOCUMENT);
    let rendered = Bootloader.serializeDocument(document);
    return rendered;
  }
  static parseFragment(document) { return parseFragment(document); }
  static parseDocument(document) { return parseDocument(document); }
  static serializeDocument(document) { return serializeDocument(document); }

  document(document = null) {
    var doc = document || this._config.template || this._config.document;
    if (typeof doc === 'string') {
      return Bootloader.parseDocument(doc);
    }
    return doc;
  }

  platform(providers?: any): PlatformRef {
    let pro = providers || this._config.platformProviders;
    return platform(checkProviders(buildNodeProviders(pro)));
  }

  application(document?: any, providers?: any): ApplicationRef {
    let doc = this.document(document);
    let pro = providers || this._config.providers;
    return this.platformRef.application(buildNodeAppProviders(doc, pro));
  }

  bootstrap(Component?: any | Array<any>, componentProviders?: Array<any>): Promise<any> {
    let component = Component || this._config.component;
    let providers = componentProviders || this._config.componentProviders;
    if (component) {
      return this.application().bootstrap(component, providers).then(waitRouter);
    } else {
      return this._bootstrapAll(component, providers);
    }
  }

  serialize(Component?: any | Array<any>, componentProviders?: Array<any>): Promise<any> {
    return this.bootstrap(Component, componentProviders)
      .then(Bootloader.applicationRefToString);
  }

  serializeApplication(Component?: any | Array<any>, componentProviders?: Array<any>): Promise<any> {
    let component = Component || this._config.component;
    let providers = componentProviders || this._config.componentProviders;

    return this._applicationAll(component, providers)
      .then((configRefs: any) => {
        if ('ngOnInit' in this._config) {
          if (!this._config.ngOnInit) { return configRefs; }
          let document = configRefs[0].applicationRef.injector.get(DOCUMENT);
          return Promise.resolve(this._config.ngOnInit(configRefs, document)).then(() => configRefs);
        }
        return configRefs;
      })
      .catch(err => {
        console.log('ngOnInit Error:', err);
        throw err;
      })
      .then((configRefs: any) => {
        if ('precache' in this._config && this._config.precache) {
          console.log('Please set `async: true` rather than `precache: true`');
          this._config.async = true;
        }
        if ('async' in this._config) {
          if (!this._config.async) {
            return configRefs;
          }

          let apps = configRefs.map((config, i) => {
            // app injector
            let ngZone = config.applicationRef.injector.get(NgZone);
            // component injector
            let http = config.componentRef.injector.getOptional(Http);

            let promise = new Promise(resolve => {
                // let stable = false;
                // ngZone.onStable.subscribe(() => {
                //   console.log('onStable',  ngZone.hasPendingMicrotasks, ngZone.hasPendingMacrotasks, ngZone._isStable);
                // });
                // ngZone.onMicrotaskEmpty.subscribe(() => {
                //   console.log('onMicrotaskEmpty',  ngZone.hasPendingMicrotasks, ngZone.hasPendingMacrotasks, ngZone._isStable);
                // });
                // ngZone.onUnstable.subscribe(() => {
                //   console.log('onUnstable',  ngZone.hasPendingMicrotasks, ngZone.hasPendingMacrotasks, ngZone._isStable);
                // });
                // ngZone.onError.subscribe(() => {
                //   console.log('onError',  ngZone.hasPendingMicrotasks, ngZone.hasPendingMacrotasks, ngZone._isStable);
                // });
              ngZone.runOutsideAngular(() => {
                function checkStable() {
                  setTimeout(() => {
                    if (ngZone.hasPendingMicrotasks) { return checkStable(); }
                    if (ngZone.hasPendingMacrotasks) { return checkStable(); }
                    if (ngZone._isStable) { return resolve(config); }
                    return checkStable();
                  });
                }
                checkStable();
              });
              // if (http && http._async) {
              //   ngZone.onStable.subscribe(() => {
              //     console.log('HTTP', http._async);
              //     if (http && http._async <= 0) {
              //       console.log('HTTP done');
              //     }
              //   });
              // } else {
              //   resolve(config);
              // }
            });
            return promise;
          });
          return Promise.all(apps);

        }
        return configRefs;
      })
      .catch(err => {
        console.log('Async Error:', err);
        throw err;
      })
      .then((configRefs: any) => {
        if ('ngOnStable' in this._config) {
          if (!this._config.ngOnStable) { return configRefs; }
          let document = configRefs[0].applicationRef.injector.get(DOCUMENT);
          return Promise.resolve(this._config.ngOnStable(configRefs, document)).then(() => configRefs);
        }
        return configRefs;
      })
      .catch(err => {
        console.log('ngOnStable Error:', err);
        throw err;
      })
      .then((configRefs: any) => {
        if ('preboot' in this._config) {
          if (!this._config.preboot) { return configRefs; }

          let prebootCode = createPrebootCode(this._config.directives, this._config.preboot);

          return prebootCode
            .then(code => {
              // TODO(gdi2290): manage the codegen better after preboot supports multiple appRoot
              let lastRef = configRefs[configRefs.length - 1];
              let el = lastRef.componentRef.location.nativeElement;
              let script = parseFragment(code);
              let prebootEl = DOM.createElement('div');
              DOM.setInnerHTML(prebootEl, code);
              DOM.insertAfter(el, prebootEl);
              return configRefs;
            });
        }
        return configRefs;
      })
      .catch(err => {
        console.log('preboot Error:', err);
        throw err;
      })
      .then((configRefs: any) => {
        let document = configRefs[0].applicationRef.injector.get(DOCUMENT);
        let rendered = Bootloader.serializeDocument(document);
        // dispose;
        for (let i = 0; i < configRefs.length; i++) {
          let config = configRefs[i];
          config.componentRef.dispose();
          config.applicationRef.dispose();
        }
        return rendered;
      })
      .catch(err => {
        console.log('Rendering Document Error:', err);
        throw err;
      })
      .then((rendered: any) => {
        if ('ngOnRendered' in this._config) {
          if (!this._config.ngOnRendered) { return rendered; }
          return Promise.resolve(this._config.ngOnRendered(rendered)).then(() => rendered);
        }
        return rendered;
      })
      .catch(err => {
        console.log('ngOnRendered Error:', err);
        throw err;
      });

  }


  _bootstrapAll(Components?: Array<any>, componentProviders?: Array<any>): Promise<Array<any>> {
    let components = Components || this._config.directives;
    let providers = componentProviders || this._config.componentProviders;
    // .then(waitRouter)); // fixed by checkStable()
    let directives = components.map(component => this.application().bootstrap(component, providers));
    return Promise.all(directives);
  }

  _applicationAll(Components?: Array<any>, componentProviders?: Array<any>): Promise<Array<any>> {
    let components = Components || this._config.directives;
    let providers = componentProviders || this._config.componentProviders || [];
    let doc = this.document(this._config.template || this._config.document);

    let directives = components.map(component => {
      var applicationRef = this.application(doc);
      // .then(waitRouter)); // fixed by checkStable()
      let compRef = applicationRef.bootstrap(component, providers);
      return compRef.then(componentRef => ({ applicationRef, componentRef }));
    });
    return Promise.all(directives);
  }

  dispose(): void {
    this.platformRef.dispose();
    this._config = null;
    this.platformRef = null;
  }
}

export function bootloader(config: BootloaderConfig = {}): Bootloader {
  return new Bootloader(config);
}
