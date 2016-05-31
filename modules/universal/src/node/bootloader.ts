import {DOCUMENT} from '@angular/platform-browser';
import {
  NgZone,
  Injector,
  ReflectiveInjector,
  createPlatform,
  coreLoadAndBootstrap,
  ComponentRef,
  PlatformRef,
  ApplicationRef
} from '@angular/core';
import {Http, Jsonp} from '@angular/http';


import {buildReflector, buildNodeProviders, buildNodeAppProviders} from './platform/node';
import {parseDocument, parseFragment, serializeDocument} from './platform/document';
import {createPrebootCode} from './ng_preboot';
import {arrayFlattenTree} from './helper';

import {Parse5DomAdapter} from '@angular/platform-server';
Parse5DomAdapter.makeCurrent(); // ensure Parse5DomAdapter is used
import {getDOM} from '@angular/platform-browser/src/dom/dom_adapter';
var DOM: any = getDOM();


export type ConfigRef = {componentRef: ComponentRef<any>, applicationRef: ApplicationRef};
export type ConfigRefs = Array<ConfigRef>;

export interface BootloaderConfig {
  template?: string;

  platformProviders?: Array<any>;
  providers?: Array<any>;
  componentProviders?: Array<any>;
  component?: any;
  directives?: Array<any>;
  preboot?: boolean | any;
  precache?: boolean;
  primeCache?: boolean;
  async?: boolean;
  prime?: boolean;
  beautify?: boolean;
  maxZoneTurns?: number;
  bootloader?: Bootloader | any;
  ngOnInit?: (config?: ConfigRefs, document?: any) => any | Promise<any> | ConfigRefs;
  ngOnStable?: (config?: ConfigRefs, document?: any) => any | Promise<any> | ConfigRefs;
  ngOnRendered?: (rendered?: string) => string | any | Promise<any>;
  ngDoCheck?: (config: ConfigRef) => boolean;
}

export interface AppConfig {
  template?: string;
  directives?: Array<any>;
  providers?: Array<any>;

}

export class Bootloader {
  private _config: BootloaderConfig = { async: true, preboot: false };
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
  static parseFragment(document: string) { return parseFragment(document); }
  static parseDocument(document: string) { return parseDocument(document); }
  static serializeDocument(document: Object) { return serializeDocument(document); }

  document(document: string | Object = null): Object {
    var doc = document || this._config.template;
    if (typeof doc === 'string') {
      return Bootloader.parseDocument(doc);
    }
    return doc;
  }

  platform(providers?: any): PlatformRef {
    let pro = providers || this._config.platformProviders;
    let customProviders = ReflectiveInjector.resolveAndCreate(buildNodeProviders(pro));
    return createPlatform(customProviders);
  }

  application(document?: any, providers?: any): any {
    let doc = this.document(document);
    let pro = providers || this._config.providers;
    let customProviders = buildNodeAppProviders(doc, pro);
    var appinjector = ReflectiveInjector.resolveAndCreate(
      customProviders,
      this.platformRef.injector
    );
    return appinjector;
  }

  bootstrap(Component?: any | Array<any>): Promise<any> {
    let component = Component || this._config.component;
    if (component) {
      // .then(waitRouter)); // fixed by checkStable()
      return coreLoadAndBootstrap(this.application(), component);
    } else {
      return this._bootstrapAll(component);
    }
  }

  serialize(Component?: any | Array<any>): Promise<any> {
    return this.bootstrap(Component)
      .then(Bootloader.applicationRefToString);
  }

  serializeApplication(config?: AppConfig | any, providers?: Array<any>): Promise<any> | any {
    // TODO(gdi2290): remove legacy api
    if (config === null && providers) {
      config = { providers, directives: this._config.directives, template: this._config.template };
    }

    return this._applicationAll(config)
      .then((configRefs: ConfigRefs) => {
        if ('ngOnInit' in this._config) {
          if (!this._config.ngOnInit) { return configRefs; }
          let document = configRefs[0].applicationRef.injector.get(DOCUMENT);
          return Promise.resolve(this._config.ngOnInit(configRefs, document)).then(() => configRefs);
        }
        return configRefs;
      })
      .catch(err => {
        console.log('ngOnInit Error:', err);
      })
      .then((configRefs: ConfigRefs) => {
        if ('async' in this._config) {
          if (!this._config.async) {
            return configRefs;
          }
          let promise = this._async(configRefs);
          return promise;
        } else {
          return configRefs;
        }
      })
      .catch(err => {
        console.log('Async Error:', err);
      })
      .then((configRefs: ConfigRefs) => {
        if ('ngOnStable' in this._config) {
          if (!this._config.ngOnStable) { return configRefs; }
          let document = configRefs[0].applicationRef.injector.get(DOCUMENT);
          return Promise.resolve(this._config.ngOnStable(configRefs, document)).then(() => configRefs);
        }
        return configRefs;
      })
      .catch(err => {
        console.log('ngOnStable Error:', err);
      })
      .then((configRefs: ConfigRefs) => {
        if ('preboot' in this._config && this._config.preboot) {
          let promise: any = this._preboot(configRefs);
          return promise;
        } else {
          return configRefs;
        }
      })
      .catch(err => {
        console.log('preboot Error:', err);
      })
      .then((configRefs: ConfigRefs) => {
        let document = configRefs[0].applicationRef.injector.get(DOCUMENT);
        let rendered = Bootloader.serializeDocument(document);
        // dispose;
        for (let i = 0; i < configRefs.length; i++) {
          let config = configRefs[i];
          config.componentRef.destroy();
          config.applicationRef.dispose();
        }
        return rendered;
      })
      .catch(err => {
        console.log('Rendering Document Error:', err);
      })
      .then((rendered: string) => {
        if ('beautify' in this._config) {
          if (!this._config.beautify) { return rendered; }
          const beautify: any = require('js-beautify');
          return beautify.html(rendered, {indent_size: 2});
        }
        return rendered;
      })
      .then((rendered: string) => {
        if ('ngOnRendered' in this._config) {
          if (!this._config.ngOnRendered) { return rendered; }
          return Promise.resolve(this._config.ngOnRendered(rendered)).then(() => rendered);
        }
        return rendered;
      })
      .catch(err => {
        console.log('ngOnRendered Error:', err);
      });

  }


  _bootstrapAll(Components?: Array<any>, componentProviders?: Array<any>): Promise<Array<any>> {
    let components = Components || this._config.directives;
    let providers = componentProviders || this._config.componentProviders;
    // .then(waitRouter)); // fixed by checkStable()
    let directives = components.map(component => this.application().bootstrap(component));
    return Promise.all(directives);
  }

  _applicationAll(config: AppConfig = {}): Promise<ConfigRefs> {
    let components: Array<any> = config.directives || this._config.directives;
    let providers: Array<any> = config.providers || this._config.providers;
    let doc: Object = this.document(config.template || this._config.template);

    let directives = components.map(component => {
      // var applicationRef = this.application(doc, providers);
      // .then(waitRouter)); // fixed by checkStable()
      let appInjector = this.application(doc, providers);
      let compRef = coreLoadAndBootstrap(appInjector, component);
      // let compRef = Promise.resolve(applicationRef.bootstrap(component));
      return compRef.then(componentRef => {
        let configRef: ConfigRef = {
          applicationRef: appInjector.get(ApplicationRef),
          componentRef
        };
        return configRef;
      });
    });

    return Promise.all<ConfigRef>(directives);
  }


  _async(configRefs: ConfigRefs): Promise<ConfigRefs>  {
    let ngDoCheck = this._config.ngDoCheck || null;
    let maxZoneTurns = Math.max(this._config.maxZoneTurns || 2000, 1);
    function configMap(config: ConfigRef, i: number): Promise<ConfigRef> {
      // app injector
      let ngZone = config.applicationRef.injector.get(NgZone);
      // component injector
      let http = config.componentRef.injector.get(Http, Http);
      let jsonp = config.componentRef.injector.get(Jsonp, Jsonp);

      let promise: Promise<ConfigRef> = new Promise(resolve => {

        function outsideNg(): void {
          let checkAmount: number = 0;
          let checkCount: number = 0;
          function checkStable(value: ConfigRef): void {
            // we setTimeout 10 after the first 20 turns
            checkCount++;
            if (checkCount === maxZoneTurns) {
              console.warn('\nWARNING: your application is taking longer than ' + maxZoneTurns + ' Zone turns. \n');
              return resolve(config);
            }
            if (checkCount === 20) { checkAmount = 10; }

            function stable(): void {
              if (ngZone.hasPendingMicrotasks) { return checkStable(value); }
              if (ngZone.hasPendingMacrotasks) { return checkStable(value); }
              if (http && http._async > 0) { return checkStable(value); }
              if (jsonp && jsonp._async > 0) { return checkStable(value); }
              if (ngZone._isStable && typeof ngDoCheck === 'function') {
                let isStable = ngDoCheck(value);
                if (isStable === true) {
                  // return resolve(config);
                } else if (typeof isStable !== 'boolean') {
                  console.warn('\nWARNING: ngDoCheck must return a boolean value of either true or false\n');
                } else {
                  return checkStable(value);
                }
              }
              if (ngZone._isStable) { return resolve(value); }
              return checkStable(value);
            }

            setTimeout(stable, checkAmount);
          }
          return checkStable(config);
        }
        ngZone.runOutsideAngular(outsideNg);
      });

      return promise;
    }

    let apps = configRefs.map(configMap);

    return Promise.all<ConfigRef>(apps);
  }

  _preboot(configRefs: ConfigRefs): Promise<ConfigRefs> {

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

  dispose(): void {
    this.platformRef.dispose();
    this._config = null;
    this.platformRef = null;
  }
}

export function bootloader(config: BootloaderConfig = {}): Bootloader {
  return new Bootloader(config);
}
