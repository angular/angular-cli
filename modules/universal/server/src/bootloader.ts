import {DOCUMENT} from 'angular2/platform/common_dom';
import {DOM} from 'angular2/src/platform/dom/dom_adapter';
import {NgZone, platform, PlatformRef, ApplicationRef} from 'angular2/core';


import {buildReflector, buildNodeProviders, buildNodeAppProviders} from './platform/node';
import {parseDocument, parseFragment, serializeDocument} from './platform/document';
import {createPrebootCode} from './ng_preboot';

export interface BootloaderConfig {
  document?: any;
  platformProviders?: Array<any>;
  providers?: Array<any>;
  componentProviders?: Array<any>;
  component?: any;
  directives?: Array<any>;
  preboot?: any;
}

export class Bootloader {
  private _config: BootloaderConfig = {};
  platformRef: any;
  appRef: any;
  constructor(config: BootloaderConfig) {
    (<any>Object).assign(this._config, config || {});
    this.platformRef = this.platform();
    this.appRef = this.application();
  }

  static create(config): Bootloader {
    if (config instanceof Bootloader) { return config; }
    return new Bootloader(config);
  }
  static appRefToString(applicationRefs) {
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
    var doc = document || this._config.document;
    if (typeof doc === 'string') {
      return Bootloader.parseDocument(document);
    }
    return doc;
  }

  platform(providers?: any): PlatformRef {
    let pro = providers || this._config.platformProviders;
    return platform(buildNodeProviders(pro));
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
      return this.appRef.bootstrap(component, providers);
    } else {
      return this._bootstrapAll(component, providers);
    }
  }

  serialize(Component?: any | Array<any>, componentProviders?: Array<any>): Promise<any> {
    return this.bootstrap(Component, componentProviders)
      .then(Bootloader.appRefToString);
  }

  serializeApplication(Component?: any | Array<any>, componentProviders?: Array<any>): Promise<any> {
    let component = Component || this._config.component;
    let providers = componentProviders || this._config.componentProviders;
    return this.bootstrap(component, providers)
      .then(applicationRefs => {
        let lastAppRef = applicationRefs;
        let injector = applicationRefs.injector;
        if (Array.isArray(applicationRefs)) {
          lastAppRef = applicationRefs[applicationRefs.length - 1];
          injector = lastAppRef.injector;
        }
        return { injector, lastAppRef };
      })
      .then(({ injector, lastAppRef }) => {
        if ('preboot' in this._config) {
          if (!this._config) { return injector; }

          let prebootCode = createPrebootCode(this._config.directives, this._config.preboot);

          return prebootCode
            .then(code => {
              // TODO(gdi2290): manage the codegen better after preboot supports multiple appRoot
              let el = lastAppRef.location.nativeElement;
              let script = parseFragment(code);
              let prebootEl = DOM.createElement('div');
              DOM.setInnerHTML(prebootEl, code);
              DOM.insertAfter(el, prebootEl);
              return injector;
            });
        }
        return injector;
      })
      .then(injector => {
        let document = injector.get(DOCUMENT);
        let rendered = Bootloader.serializeDocument(document);
        return rendered;
      });
  }


  _bootstrapAll(Components?: Array<any>, componentProviders?: Array<any>) {
    let components = Components || this._config.directives;
    let providers = componentProviders || this._config.componentProviders;
    let directives = components.map(component => this.appRef.bootstrap(component, providers));
    return Promise.all(directives);
  }

  dispose(): void {
    this.appRef.dispose();
    this.platformRef.dispose();
    this._config = null;
    this.appRef = null;
    this.platformRef = null;
  }
}

export function bootloader(config: BootloaderConfig = {}): Bootloader {
  return new Bootloader(config);
}
