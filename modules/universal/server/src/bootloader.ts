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
  _config: BootloaderConfig = {};
  _document: any = null;
  _app: any;
  constructor(config: BootloaderConfig) {
    (<any>Object).assign(this._config, config || {});
    this._app = this.application();
  }

  static create(config): Bootloader {
    if (config instanceof Bootloader) {
      return config;
    }
    return new Bootloader(config);
  }
  static serializeApplications(applicationRefs) {
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
  document(document) {
    var doc = document || this._config.document || null;
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
    let doc = this.document(document || this._config.document);
    let pro = providers || this._config.providers;
    return this.platform().application(buildNodeAppProviders(doc, pro));
  }

  bootstrap(Component?: any | Array<any>, componentProviders?: Array<any>): Promise<any> {
    let component = Component || this._config.component;
    let pro = componentProviders || this._config.componentProviders;
    if (component) {
      return this._app.boootstrap(component, pro);
    } else {
      return this._bootstrapAll(component, pro);
    }
  }


  serialize(Component?: any | Array<any>, componentProviders?: Array<any>): Promise<any> {
    return this.bootstrap(Component, componentProviders)
      .then(Bootloader.serializeApplications);
  }

  serializeApplication(): Promise<any> {
    return this.bootstrap()
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
          let el = lastAppRef.location.nativeElement;
          let prebootCode = createPrebootCode(this._config.directives, this._config.preboot);

          return prebootCode
            .then(code => {
              let script = parseFragment(code);
              let div = DOM.createElement('div');
              DOM.setInnerHTML(div, code);
              DOM.insertAfter(el, div);
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
    let directives = components.map(component => this._app.bootstrap(component, providers));
    return Promise.all(directives);
  }
}

export function bootloader(config: BootloaderConfig = {}): Bootloader {
  return new Bootloader(config);
}
