// PRIVATE
import {
  BROWSER_SANITIZATION_PROVIDERS,
  SharedStylesHost,
  DomSharedStylesHost,
  DomRootRenderer,
  DomEventsPlugin,
  KeyEventsPlugin,
  getDOM,
  HammerGesturesPlugin,
  ViewUtils
} from './__private_imports__';

import {
  DOCUMENT,
  EVENT_MANAGER_PLUGINS,
  AnimationDriver,
  EventManager,
} from '@angular/platform-browser';


// PRIVATE

// import { DomEventsPlugin } from '@angular/platform-browser/src/dom/events/dom_events';
// import { KeyEventsPlugin } from '@angular/platform-browser/src/dom/events/key_events';
// import {
//   HAMMER_GESTURE_CONFIG,
//   HammerGestureConfig
// } from '@angular/platform-browser/src/dom/events/hammer_gestures';
// import { DomSharedStylesHost, SharedStylesHost } from '@angular/platform-browser/src/dom/shared_styles_host';
// import { DomRootRenderer } from '@angular/platform-browser/src/dom/dom_renderer';
// import { wtfInit } from '@angular/core/src/profile/wtf_init';
// import { ViewUtils } from '@angular/core/src/linker/view_utils';
// import { APP_ID_RANDOM_PROVIDER } from '@angular/core/src/application_tokens';
// import { PlatformRef_ } from '@angular/core/src/application_ref';
// PRIVATE


import {
  ErrorHandler,
  RootRenderer,
  Testability,
  ApplicationModule,
  PLATFORM_INITIALIZER,
  APP_ID,
  Injector,
  createPlatformFactory,
  OpaqueToken,

  NgModule,
  Optional,
  SkipSelf,
  Injectable,
  Inject,
  ComponentRef,
  ApplicationRef,
  PlatformRef,
  NgModuleRef,
  NgZone,
} from '@angular/core';

import { CommonModule, PlatformLocation, APP_BASE_HREF } from '@angular/common';
import { platformCoreDynamic } from '@angular/compiler';

// TODO(gdi2290): allow removal of modules that are not used for AoT
import { Jsonp, Http } from '@angular/http';
import { getInlineCode } from 'preboot';


import { NodePlatformLocation } from './node-location';
import { parseFragment, parseDocument, serializeDocument } from './node-document';
import { NodeDomRootRenderer } from './node-renderer';
import { NodeSharedStylesHost } from './node-shared-styles-host';
import { Parse5DomAdapter } from './parse5-adapter';

import {
  NODE_APP_ID,
  UNIVERSAL_CONFIG,

  ORIGIN_URL,
  REQUEST_URL,
  BASE_URL,

  createUrlProviders,
} from './tokens';

// @internal
export function _errorHandler(): ErrorHandler {
  return new ErrorHandler();
}

// @internal
export function _resolveDefaultAnimationDriver(): AnimationDriver {
  if (getDOM().supportsWebAnimation()) {
    return AnimationDriver.NOOP;
  }
  return AnimationDriver.NOOP;
}

// Hold Reference
// @internal
export var __PLATFORM_REF: PlatformRef = null;
export function removePlatformRef() {
  __PLATFORM_REF = null;
}
export function getPlatformRef(): PlatformRef {
  return __PLATFORM_REF;
}
export function setPlatformRef(platformRef) {
  __PLATFORM_REF = platformRef;
}
// End platform Reference

// @internal
function s4() {
  return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

              /*implements PlatformRef*/
export class NodePlatform  {
  static _noop = () => {};
  static _cache = new Map<any, any>();
  get platformRef() {
    return this._platformRef;
  }
  constructor(private _platformRef: PlatformRef) {
  }

  serializeModule<T>(ModuleType: any, config: any = {}): Promise<T> {
    if (config && !config.id) { config.id = s4(); }
    config.time && console.time('id: ' + config.id + ' bootstrapModule: ');
    return this.platformRef.bootstrapModule<T>(ModuleType, config.compilerOptions)
      .then((moduleRef: NgModuleRef<T>) => {
        config.time && console.timeEnd('id: ' + config.id + ' bootstrapModule: ');
        return this.serialize<T>(moduleRef, config);
      });
  }
  serializeModuleFactory<T>(ModuleType: any, config: any = {}): Promise<T> | T {
    if (config && !config.id) { config.id = s4(); }
    config.time && console.time('id: ' + config.id + ' bootstrapModuleFactory: ');
    return this.platformRef.bootstrapModuleFactory<T>(ModuleType)
      .then((moduleRef: NgModuleRef<T>) => {
        config.time && console.timeEnd('id: ' + config.id + ' bootstrapModuleFactory: ');
        return this.serialize<T>(moduleRef, config);
      });
  }

  serialize<T>(moduleRef: NgModuleRef<T>, config: any = {}): Promise<T> {
    // TODO(gdi2290): make stateless. allow for many instances of modules
    // TODO(gdi2290): refactor to ZoneLocalStore
    var _map = new Map<any, any>();
    var _store = {
      set(key, value, defaultValue?: any) {
        _map.set(key, value || defaultValue);
      },
      get(key, defaultValue?: any) {
        return _map.has(key) ? _map.get(key) : defaultValue;
      },
      clear() {
        _map.clear();
        _store = null;
        _map = null;
      }
    };

    return asyncPromiseSeries(_store, moduleRef, [
      // create di store
      (store: any, moduleRef: NgModuleRef<T>) => {
        let modInjector = moduleRef.injector;
        let instance: any = moduleRef.instance;
        // lifecycle hooks
        store.set('universalOnInit', instance.universalOnInit, NodePlatform._noop);
        store.set('universalDoCheck', instance.universalDoCheck, NodePlatform._noop);
        store.set('universalOnStable', instance.universalOnStable, NodePlatform._noop);
        store.set('universalDoDehydrate', instance.universalDoDehydrate, NodePlatform._noop);
        store.set('universalAfterDehydrate', instance.universalAfterDehydrate, NodePlatform._noop);
        store.set('universalOnRendered', instance.universalOnRendered, NodePlatform._noop);
        // global config
        store.set('ApplicationRef', modInjector.get(ApplicationRef));
        store.set('NgZone', modInjector.get(NgZone));
        store.set('UNIVERSAL_CONFIG', modInjector.get(UNIVERSAL_CONFIG, {}));
        store.set('APP_ID', modInjector.get(APP_ID, null));
        store.set('DOCUMENT', modInjector.get(DOCUMENT));
        store.set('DOM', getDOM());
        store.set('UNIVERSAL_CACHE', {});
        return moduleRef;
      },
      // Check Stable
      (store: any, moduleRef: NgModuleRef<T>) => {
        config.time && console.time('id: ' + config.id + ' stable: ');
        let UNIVERSAL_CONFIG = store.get('UNIVERSAL_CONFIG');
        let universalDoCheck = store.get('universalDoCheck');
        let universalOnInit = store.get('universalOnInit');
        let rootNgZone: NgZone = store.get('NgZone');
        let appRef: ApplicationRef = store.get('ApplicationRef');
        let components = appRef.components;

        universalOnInit();

        // lifecycle hooks
        function outsideNg(compRef, ngZone, config, http, jsonp) {
          function checkStable(done, ref) {
            ngZone.runOutsideAngular(() => {
              setTimeout(function stable() {
                // hot code path
                if (ngZone.hasPendingMicrotasks === true) { return checkStable(done, ref); }
                if (ngZone.hasPendingMacrotasks === true) { return checkStable(done, ref); }
                if (http && http._async > 0) { return checkStable(done, ref); }
                if (jsonp && jsonp._async > 0) { return checkStable(done, ref); }
                if (ngZone.isStable === true) {
                  let isStable = universalDoCheck(ref, ngZone, config);
                  if (universalDoCheck !== NodePlatform._noop) {
                    if (typeof isStable !== 'boolean') {
                      console.warn('\nWARNING: universalDoCheck must return a boolean value of either true or false\n');
                    } else if (isStable !== true) {
                      return checkStable(done, ref);
                    }
                  }
                }
                if (ngZone.isStable === true) { return done(ref); }
                return checkStable(done, ref);
              }, 0);
            });
          }
          return ngZone.runOutsideAngular(() => {
            return new Promise(function (resolve) {
              checkStable(resolve, compRef);
            }); // promise
          });
        }

        // check if all components are stable

        let stableComponents = components.map((compRef, i) => {
          // UNIVERSAL_CONFIG used
          let cmpInjector = compRef.injector;
          let ngZone: NgZone = cmpInjector.get(NgZone);
          // TODO(gdi2290): remove when zone.js tracks http and https
          let http = cmpInjector.get(Http, null);
          let jsonp = cmpInjector.get(Jsonp, null);
          return rootNgZone.runOutsideAngular(outsideNg.bind(null, compRef, ngZone, UNIVERSAL_CONFIG, http, jsonp));
        });

        return rootNgZone.runOutsideAngular(() => {
          return Promise.all<Promise<ComponentRef<any>>>(stableComponents);
        })
          .then(() => {
            config.time && console.timeEnd('id: ' + config.id + ' stable: ');
            return moduleRef;
          });
      },
      // Inject preboot
      (store: any, moduleRef: NgModuleRef<T>) => {
        let UNIVERSAL_CONFIG = store.get('UNIVERSAL_CONFIG');
        if (typeof UNIVERSAL_CONFIG.preboot === 'boolean' && !UNIVERSAL_CONFIG.preboot) {
          return moduleRef;
        }
        config.time && console.time('id: ' + config.id + ' preboot: ');
        // parseFragment used
        // getInlineCode used
        let DOM = store.get('DOM');
        let appRef: ApplicationRef = store.get('ApplicationRef');
        let components = appRef.components;
        let prebootCode = null;
        // TODO(gdi2290): hide cache in (ngPreboot|UniversalPreboot)
        let key = (typeof UNIVERSAL_CONFIG.preboot === 'object') && JSON.stringify(UNIVERSAL_CONFIG.preboot) || null;
        let prebootEl = null;
        let el = null;
        let lastRef = null;
        try {
          if (key && NodePlatform._cache.has(key)) {
            prebootEl = NodePlatform._cache.get(key).prebootEl;
            // prebootCode = NodePlatform._cache.get(key);
          } else if (key && !prebootEl) {
            config.time && console.time('id: ' + config.id + ' preboot insert: ');
            prebootCode = parseFragment('' +
              '<script>\n' +
              getInlineCode(UNIVERSAL_CONFIG.preboot) +
              ';\nvar preboot = preboot || prebootstrap();' +
              '</script>' +
            '');
            prebootEl = DOM.createElement('div');
            DOM.appendChild(prebootEl, prebootCode.childNodes[0]);
            NodePlatform._cache.set(key, {prebootCode, prebootEl});
            config.time && console.timeEnd('id: ' + config.id + ' preboot insert: ');
          }
          //  else {
          //   prebootCode = getInlineCode(_config.preboot);
          // }
          // assume last component is the last component selector
          // TODO(gdi2290): provide a better way to determine last component position
          lastRef = components[components.length - 1];
          el = lastRef.location.nativeElement;
          DOM.insertAfter(el, prebootEl);
          // let script = parseFragment(prebootCode);
        } catch (e) {
          console.log(e);
          // if there's an error don't inject preboot
          config.time && console.timeEnd('id: ' + config.id + ' preboot: ');
          return moduleRef;
        }

        config.time && console.timeEnd('id: ' + config.id + ' preboot: ');
        return moduleRef;
      },
      // Dehydrate Cache
      (store: any, moduleRef: NgModuleRef<T>) => {
        let appId = store.get('APP_ID', null);
        let UNIVERSAL_CACHE = store.get('UNIVERSAL_CACHE');
        let universalDoDehydrate = store.get('universalDoDehydrate');
        let cache = {};

        UNIVERSAL_CACHE['APP_ID'] = appId;
        Object.assign(cache, UNIVERSAL_CACHE);
        universalDoDehydrate(cache);
        Object.assign(UNIVERSAL_CACHE, cache);
        cache = null;

        return moduleRef;
      },
      // Inject Cache in Document
      (store: any, moduleRef: NgModuleRef<T>) => {
        // parseFragment used
        let universalAfterDehydrate = store.get('universalAfterDehydrate');
        let DOM = store.get('DOM');
        let UNIVERSAL_CACHE = store.get('UNIVERSAL_CACHE');
        let document = store.get('DOCUMENT');
        let script = null;
        let el = null;

        // TODO(gdi2290): move and find a better way to inject script
        try {
          config.time && console.time('id: ' + config.id + ' dehydrate: ');
          el = DOM.createElement('universal-script');

          script = parseFragment(''+
          '<script>\n'+
          ' try {'+
            'window.UNIVERSAL_CACHE = (' + JSON.stringify(UNIVERSAL_CACHE) + ') || {};' +
          '} catch(e) {'+
          '  console.warn("Angular Universal: There was a problem parsing data from the server")' +
          '}\n' +
          '</script>'+
          '');
          DOM.appendChild(el, script.childNodes[0]);
          DOM.appendChild(document, el);
          el = null;

          universalAfterDehydrate();

          config.time && console.timeEnd('id: ' + config.id + ' dehydrate: ');
        } catch (e) {
          return moduleRef;
        }
        return moduleRef;
      },
      // Destroy
      (store: any, moduleRef: NgModuleRef<T>) => {
        config.time && console.time('id: ' + config.id + ' serialize: ');
        // serializeDocument used
        let universalOnRendered = store.get('universalOnRendered');
        let document = store.get('DOCUMENT');
        let appRef = store.get('ApplicationRef');
        let html = null;
        let destroyApp = null;
        let destroyModule = null;

        html = serializeDocument(document);
        universalOnRendered(html);

        document = null;
        store.clear();
        destroyApp = () => {
          appRef.ngOnDestroy();
          appRef = null;
          destroyApp = null;
        }
        destroyModule = () => {
          moduleRef.destroy();
          moduleRef = null;
          destroyModule = null;
        }
        if (config.asyncDestroy) {
          setTimeout(() => destroyApp() && setTimeout(destroyModule, 1), 1);
        } else {
          destroyApp() && destroyModule();
        }

        config.time && console.timeEnd('id: ' + config.id + ' serialize: ');
        // html = html.replace(new RegExp(_appId, 'gi'), appId);

        return html;
      },

    ]) // end asyncPromiseSeries
  }





  // PlatformRef api
  get injector(): Injector {
    return this.platformRef.injector;
  }
  bootstrapModule<T>(moduleType, compilerOptions): Promise<NgModuleRef<T>> {
    return this.platformRef.bootstrapModule(moduleType, compilerOptions);
  }
  bootstrapModuleFactory<T>(moduleFactory): Promise<NgModuleRef<T>> {
    return this.platformRef.bootstrapModuleFactory(moduleFactory);
  }
  /**
   * @deprecated
   */
  get disposed() { return this.platformRef.destroyed; }
  get destroyed() { return this.platformRef.destroyed; }

  destroy() { return this.platformRef.destroy(); }

  /**
   * @deprecated
   */
  dispose(): void { return this.destroy(); }
  /**
   * @deprecated
   */
  registerDisposeListener(dispose: () => void): void {
    return this.platformRef.onDestroy(dispose);
  }
  onDestroy(callback: () => void): void {
    this._platformRef = null;
    return this.platformRef.onDestroy(callback);
  }
  // end PlatformRef api

}

// @internal
function asyncPromiseSeries(store, modRef, middleware, timer = 1) {
  return middleware.reduce((promise, cb) => {
    return promise.then((ref) => {
      return new Promise(resolve => setTimeout(() => resolve(cb(store, ref)), timer));
    })
  }, Promise.resolve(modRef))
}

// @internal
export interface EventManagerPlugin {
  manager: EventManager | NodeEventManager;
  supports(eventName: string): boolean;
  addEventListener(element: any/*HTMLElement*/, eventName: string, handler: Function): any;
  addGlobalEventListener(element: string, eventName: string, handler: Function): any;
}

// TODO(gdi2290): refactor into a new file
@Injectable()
export class NodeEventManager {
  private _plugins: EventManagerPlugin[];

  constructor(
    @Inject(EVENT_MANAGER_PLUGINS) plugins: EventManagerPlugin[],
    @Inject(DOCUMENT) private _document: any,
    private _zone: NgZone) {
    plugins.forEach(p => p.manager = this);
    this._plugins = plugins.slice().reverse();
  }
  getWindow() { return this._document._window; }
  getDocument() { return this._document; }
  getZone(): NgZone { return this._zone; }

  addEventListener(element: any /*HTMLElement*/, eventName: string, handler: Function): Function {
    var plugin = this._findPluginFor(eventName);
    return plugin.addEventListener(element, eventName, handler);
  }

  addGlobalEventListener(target: string, eventName: string, handler: Function): Function {
    var plugin = this._findPluginFor(eventName);
    return plugin.addGlobalEventListener(target, eventName, handler);
  }


  /** @internal */
  _findPluginFor(eventName: string): EventManagerPlugin {
    var plugins = this._plugins;
    for (var i = 0; i < plugins.length; i++) {
      var plugin = plugins[i];
      if (plugin.supports(eventName)) {
        return plugin;
      }
    }
    throw new Error(`No event manager plugin found for event ${eventName}`);
  }
}

// TODO(gdi2290): refactor into a new file
@Injectable()
export class NodeDomEventsPlugin {
  manager: NodeEventManager;
  // This plugin should come last in the list of plugins, because it accepts all
  // events.
  supports(eventName: string): boolean { return true; }

  addEventListener(element: any/*HTMLElement*/, eventName: string, handler: Function): Function {
    var zone = this.manager.getZone();
    var outsideHandler = (event: any) => zone.runGuarded(() => handler(event));
    return this.manager.getZone().runOutsideAngular(() => {
      return getDOM().onAndCancel(element, eventName, outsideHandler)
    });
  }

  addGlobalEventListener(target: string, eventName: string, handler: Function): Function {
    var window = this.manager.getWindow();
    var document = this.manager.getDocument();
    var zone = this.manager.getZone();
    var element; // = getDOM().getGlobalEventTargetWithDocument(target, window, document, document.body);
    switch(target) {
      case 'window':
        element = document._window;
        break;
      case 'document':
        element = document;
        break;
      case 'body':
        element = document.body;
        break;
    }
    var outsideHandler = (event: any) => zone.runGuarded(() => handler(event));
    return this.manager.getZone().runOutsideAngular(() => {
      return getDOM().onAndCancel(element, eventName, outsideHandler)
    });
  }
}

@NgModule({
  providers: [
    // normally in platform provides but there is url state in NodePlatformLocation
    { provide: PlatformLocation, useClass: NodePlatformLocation },

    BROWSER_SANITIZATION_PROVIDERS,
    { provide: ErrorHandler, useFactory: _errorHandler, deps: [] },
    // { provide: DOCUMENT, useFactory: _document, deps: [] },
    NodeDomEventsPlugin,
    { provide: DomEventsPlugin, useExisting: NodeDomEventsPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useExisting: NodeDomEventsPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: KeyEventsPlugin, multi: true },
    // { provide: EVENT_MANAGER_PLUGINS, useClass: HammerGesturesPlugin, multi: true },
    // { provide: HAMMER_GESTURE_CONFIG, useClass: HammerGestureConfig },

    NodeEventManager,
    { provide: EventManager, useExisting: NodeEventManager },


    { provide: AnimationDriver, useFactory: _resolveDefaultAnimationDriver },
    Testability,
    // ELEMENT_PROBE_PROVIDERS,

    NodeDomRootRenderer,
    { provide: DomRootRenderer, useExisting: NodeDomRootRenderer },
    { provide: RootRenderer, useExisting: DomRootRenderer },

    NodeSharedStylesHost,
    { provide: SharedStylesHost, useExisting: NodeSharedStylesHost },
    { provide: DomSharedStylesHost, useExisting: NodeSharedStylesHost },
  ],
  exports: [  CommonModule, ApplicationModule  ]
})
export class NodeModule {
  static forRoot(document: string, config: any = {}) {
    var _config = Object.assign({}, { document }, config);
    return NodeModule.withConfig(_config);
  }
  static withConfig (config: any = {}) {
    let providers = createUrlProviders(config);
    return {
      ngModule: NodeModule,
      providers: [
        { provide: UNIVERSAL_CONFIG, useValue: config },
        {
          provide: DOCUMENT,
          useFactory: (domSharedStylesHost: NodeSharedStylesHost, config: any) => {
            var doc: any = parseDocument(config.document);
            domSharedStylesHost.addHost(doc.head);
            return doc;
          },
          deps: [ NodeSharedStylesHost, UNIVERSAL_CONFIG ]
        },
        ...providers,
      ]
    };
  }
  constructor(@Optional() @SkipSelf() parentModule: NodeModule) {
    if (parentModule) {
      throw new Error(`NodeModule has already been loaded.`);
    }
  }
}

// @internal
function initParse5Adapter() {
  Parse5DomAdapter.makeCurrent();
  // wtfInit();
}


export const INTERNAL_NODE_PLATFORM_PROVIDERS: Array<any /*Type | Provider | any[]*/> = [
  { provide: PLATFORM_INITIALIZER, useValue: initParse5Adapter, multi: true },
  // Move out of platform because NodePlatformLocation holds state
  // { provide: PlatformLocation, useClass: NodePlatformLocation },
];


/**
 * The node platform that supports the runtime compiler.
 *
 * @experimental
 */
export const platformNodeDynamic = (extraProviders?: any[], platform?: any) => {
  if (!platform) {
    if (!getPlatformRef()) {
      platform = createPlatformFactory(platformCoreDynamic, 'nodeDynamic', INTERNAL_NODE_PLATFORM_PROVIDERS)(extraProviders);
      setPlatformRef(platform);
    } else {
      platform = getPlatformRef();
    }
  }
  return new NodePlatform(platform);
};


