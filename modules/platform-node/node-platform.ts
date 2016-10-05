import { getDOM } from './get-dom';

import {
  DOCUMENT,
  EVENT_MANAGER_PLUGINS,
  AnimationDriver,
  EventManager,
  HAMMER_GESTURE_CONFIG,
  HammerGestureConfig,
} from '@angular/platform-browser';

import {
  KeyEventsPlugin,
  DomEventsPlugin,
  HammerGesturesPlugin,
  BROWSER_SANITIZATION_PROVIDERS,
  DomRootRenderer,
  SharedStylesHost,
  DomSharedStylesHost,
} from './__private_imports__';

import {
  ErrorHandler,
  RootRenderer,
  Testability,
  ApplicationModule,
  PLATFORM_INITIALIZER,
  APP_ID,
  Injector,
  createPlatformFactory,

  NgModule,
  ModuleWithProviders,
  Optional,
  SkipSelf,
  Injectable,
  Inject,
  ComponentRef,
  ApplicationRef,
  PlatformRef,
  NgModuleRef,
  NgZone,
  CompilerFactory,
  TestabilityRegistry
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
  ORIGIN_URL,
  REQUEST_URL,

  createUrlProviders,
} from './tokens';

// @internal

export function _errorHandler(): ErrorHandler {
  return new ErrorHandler();
}

declare var Zone: any;

// @internal
const _documentDeps = [ NodeSharedStylesHost, NgZone ];
export function _document(domSharedStylesHost: NodeSharedStylesHost, _zone: any): any {
  let document: any = Zone.current.get('document');
  if (!document) {
    throw new Error('Please provide a document in the universal config');
  }
  if (typeof document === 'string') {
    document = parseDocument(document);
  }
  domSharedStylesHost.addHost(document.head);
  return document;
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
  static _cache = new WeakMap<any, any>();
  get platformRef() {
    return this._platformRef;
  }
  constructor(private _platformRef: PlatformRef) {
  }
  cacheModuleFactory<T>(moduleType, compilerOptions?: any): Promise<NgModuleRef<T>> {
    if (NodePlatform._cache.has(moduleType)) {
      return Promise.resolve(NodePlatform._cache.get(moduleType));
    }
    const compilerFactory: CompilerFactory = this._platformRef.injector.get(CompilerFactory);
    var compiler;
    if (compilerOptions) {
      compiler = compilerFactory.createCompiler(
      compilerOptions instanceof Array ? compilerOptions : [compilerOptions]);
    } else {
      compiler = compilerFactory.createCompiler();
    }
    return compiler.compileModuleAsync(moduleType)
        .then((moduleFactory) => {
          NodePlatform._cache.set(moduleType, moduleFactory);
          return moduleFactory;
        });
  }

  // TODO(gdi2290): refactor into bootloader
  serializeModule<T>(ModuleType: any, config: any = {}): Promise<T> {
    if (config && !config.id) { config.id = s4(); }
    config.time && console.time('id: ' + config.id + ' bootstrapModule: ');
    config.time && console.time('id: ' + config.id + ' ngApp: ');
    return (config.compilerOptions ?
      this.bootstrapModule<T>(ModuleType, config.compilerOptions)
      :
      this.bootstrapModule<T>(ModuleType)
    )
      .then((moduleRef: NgModuleRef<T>) => {
        config.time && console.timeEnd('id: ' + config.id + ' bootstrapModule: ');
        return this.serialize<T>(moduleRef, config);
      })
      .then(html => {
        config.time && console.timeEnd('id: ' + config.id + ' ngApp: ');
        return html;
      });

  }
  // TODO(gdi2290): refactor into bootloader
  serializeModuleFactory<T>(ModuleType: any, config: any = {}): Promise<T> | T {
    if (config && !config.id) { config.id = s4(); }
    config.time && console.time('id: ' + config.id + ' bootstrapModuleFactory: ');
    config.time && console.time('id: ' + config.id + ' ngApp: ');
    return this.bootstrapModuleFactory<T>(ModuleType)
      .then((moduleRef: NgModuleRef<T>) => {
        config.time && console.timeEnd('id: ' + config.id + ' bootstrapModuleFactory: ');
        return this.serialize<T>(moduleRef, config);
      })
      .then(html => {
        config.time && console.timeEnd('id: ' + config.id + ' ngApp: ');
        return html;
      });
  }

  // TODO(gdi2290): refactor into bootloader
  serialize<T>(moduleRef: NgModuleRef<T>, config: any = {}): Promise<T> {
    var cancelHandler = () => false;
    if (config && ('cancelHandler' in config)) {
      cancelHandler = config.cancelHandler;
    }
    // TODO(gdi2290): make stateless. allow for many instances of modules
    // TODO(gdi2290): refactor to ZoneLocalStore
    var _map = new Map<any, any>();
    var _store = {
      set(key, value, defaultValue?: any) {
        _map.set(key, (value !== undefined) ? value : defaultValue);
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

    function errorHandler(_err, store, modRef, _currentIndex, _currentArray) {
      var document = '';
      try {
        document = store.get('DOCUMENT');
        if (typeof document !== 'string') {
          document = Zone.current.get('document');
        }
        if (typeof document !== 'string') {
          document = Zone.current.get('DOCUMENT');
        }
        let appRef = store.get('ApplicationRef');
        if (appRef && appRef.ngOnDestroy) {
          appRef.ngOnDestroy();
        }
        if (modRef && modRef.destroy) {
          modRef.destroy();
        }
        _store && _store.clear();
      } catch (e) {}
      return document;
    }

    return asyncPromiseSeries(_store, moduleRef, errorHandler, cancelHandler, config,  [
      // create di store
      function createDiStore(store: any, moduleRef: NgModuleRef<T>) {
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
        store.set('preboot', config.preboot, false);
        store.set('APP_ID', modInjector.get(APP_ID, null));
        store.set('NODE_APP_ID', s4());
        store.set('DOCUMENT', modInjector.get(DOCUMENT));
        store.set('DOM', getDOM());
        store.set('UNIVERSAL_CACHE', {});
        return moduleRef;
      },
      // Check Stable
      function checkStable(store: any, moduleRef: NgModuleRef<T>) {
        config.time && console.time('id: ' + config.id + ' stable: ');
        let universalDoCheck = store.get('universalDoCheck');
        let universalOnInit = store.get('universalOnInit');
        let rootNgZone: NgZone = store.get('NgZone');
        let appRef: ApplicationRef = store.get('ApplicationRef');
        let components = appRef.components;

        universalOnInit();

        // lifecycle hooks
        function outsideNg(compRef, ngZone, http, jsonp) {
          function checkStable(done, ref) {
            ngZone.runOutsideAngular(() => {
              setTimeout(function stable() {
                if (cancelHandler()) { return done(ref); }
                // hot code path
                if (ngZone.hasPendingMicrotasks === true) { return checkStable(done, ref); }
                if (ngZone.hasPendingMacrotasks === true) { return checkStable(done, ref); }
                if (http && http._async > 0) { return checkStable(done, ref); }
                if (jsonp && jsonp._async > 0) { return checkStable(done, ref); }
                if (ngZone.isStable === true) {
                  let isStable = universalDoCheck(ref, ngZone);
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

        let stableComponents = components.map(compRef => {
          let cmpInjector = compRef.injector;
          let ngZone: NgZone = cmpInjector.get(NgZone);
          // TODO(gdi2290): remove when zone.js tracks http and https
          let http = cmpInjector.get(Http, null);
          let jsonp = cmpInjector.get(Jsonp, null);
          return rootNgZone.runOutsideAngular(outsideNg.bind(null, compRef, ngZone, http, jsonp));
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
      function injectPreboot(store: any, moduleRef: NgModuleRef<T>) {
        let preboot = store.get('preboot');
        if (typeof preboot === 'boolean') {
          if (!preboot) {
            return moduleRef;
          } else {
            preboot = {};
          }
        }
        config.time && console.time('id: ' + config.id + ' preboot: ');
        // parseFragment used
        // getInlineCode used
        let DOM = store.get('DOM');
        let DOCUMENT = store.get('DOCUMENT');
        let appRef: ApplicationRef = store.get('ApplicationRef');
        let selectorsList = (<any>moduleRef).bootstrapFactories.map((factory) => factory.selector);
        let bodyList = DOCUMENT.body.children.filter(el => Boolean(el.tagName)).map(el => el.tagName.toLowerCase()).join(',');
        let components = appRef.components;
        let prebootCode = null;
        // TODO(gdi2290): hide cache in (ngPreboot|UniversalPreboot)
        let prebootConfig = null;
        let key = (typeof preboot === 'object') && preboot || null;
        let prebootEl = null;
        let el = null;
        let lastRef = null;
        try {
          if (key && NodePlatform._cache.has(key)) {
            prebootEl = NodePlatform._cache.get(key).prebootEl;
            // prebootCode = NodePlatform._cache.get(key);
          } else if (key && !prebootEl) {
            try {
              prebootConfig = JSON.parse(key);
            } catch (e) {
              prebootConfig = preboot;
            }
            if (!prebootConfig.appRoot) {
              // TODO(gdi2290): missing public NgModuleInjector type
              prebootConfig.appRoot = selectorsList;
            }
            if (!selectorsList) {
              selectorsList = (<any>moduleRef).bootstrapFactories.map((factory) => factory.selector);
            }
            config.time && console.time('id: ' + config.id + ' preboot insert dom: ');
            prebootCode = parseFragment('' +
              '<script>\n' +
              ' ' + getInlineCode(prebootConfig) +
              '</script>' +
            '');
            prebootEl = DOM.createElement('div');
            DOM.appendChild(prebootEl, prebootCode.childNodes[0]);
            NodePlatform._cache.set(key, {prebootCode, prebootEl});
            config.time && console.timeEnd('id: ' + config.id + ' preboot insert dom: ');
          }

          lastRef = {cmp: null, strIndex: -1, index: -1};
          selectorsList.forEach((select, i) => {
            let lastValue = bodyList.indexOf(select);
             if (lastValue >= lastRef.strIndex) {
               lastRef.strIndex = lastValue;
               lastRef.cmp = components[i];
             }
          });
          el = lastRef.cmp.location.nativeElement;
          lastRef = null;
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
      function dehydrateCache(store: any, moduleRef: NgModuleRef<T>) {
        config.time && console.time('id: ' + config.id + ' universal cache: ');
        let appId = store.get('NODE_APP_ID', null);
        let UNIVERSAL_CACHE = store.get('UNIVERSAL_CACHE');
        let universalDoDehydrate = store.get('universalDoDehydrate');
        let cache = {};

        UNIVERSAL_CACHE['APP_ID'] = appId;
        Object.assign(cache, UNIVERSAL_CACHE);
        universalDoDehydrate(cache);
        Object.assign(UNIVERSAL_CACHE, cache);
        cache = null;

        config.time && console.timeEnd('id: ' + config.id + ' universal cache: ');
        return moduleRef;
      },
      // Inject Cache in Document
      function injectCacheInDocument(store: any, moduleRef: NgModuleRef<T>) {
        config.time && console.time('id: ' + config.id + ' dehydrate: ');
        // parseFragment used
        let universalAfterDehydrate = store.get('universalAfterDehydrate');
        let DOM = store.get('DOM');
        let UNIVERSAL_CACHE = store.get('UNIVERSAL_CACHE');
        let document = store.get('DOCUMENT');
        let script = null;
        let el = null;

        // TODO(gdi2290): move and find a better way to inject script
        try {
          config.time && console.time('id: ' + config.id + ' dehydrate insert dom: ');
          el = DOM.createElement('universal-script');

          script = parseFragment('' +
          '<script>\n' +
          ' try {' +
            'window.UNIVERSAL_CACHE = (' + JSON.stringify(UNIVERSAL_CACHE) + ') || {};' +
          '} catch(e) {' +
          '  console.warn("Angular Universal: There was a problem parsing data from the server")' +
          '}\n' +
          '</script>' +
          '');
          DOM.appendChild(el, script.childNodes[0]);
          DOM.appendChild(document.body, el);
          el = null;

          universalAfterDehydrate();
          config.time && console.timeEnd('id: ' + config.id + ' dehydrate insert dom: ');

        } catch (e) {
          config.time && console.timeEnd('id: ' + config.id + ' dehydrate: ');
          return moduleRef;
        }
        config.time && console.timeEnd('id: ' + config.id + ' dehydrate: ');
        return moduleRef;
      },
      // Destroy
      function destroyAppAndSerializeDocument(store: any, moduleRef: NgModuleRef<T>) {
        config.time && console.time('id: ' + config.id + ' serialize: ');
        // serializeDocument used
        let universalOnRendered = store.get('universalOnRendered');
        let document = store.get('DOCUMENT');
        let appId = store.get('NODE_APP_ID');
        let appRef = store.get('ApplicationRef');
        let html = null;
        let destroyApp = null;
        let destroyModule = null;

        html = serializeDocument(document).replace(/%cmp%/g, appId);
        universalOnRendered(html);

        document = null;
        store.clear();
        destroyApp = () => {
          appRef.ngOnDestroy();
          appRef = null;
          destroyApp = null;
        };
        destroyModule = () => {
          moduleRef.destroy();
          moduleRef = null;
          destroyModule = null;
        };
        if (config.asyncDestroy) {
          setTimeout(() => destroyApp() && setTimeout(destroyModule, 1), 1);
        } else {
          destroyApp() && destroyModule();
        }

        config.time && console.timeEnd('id: ' + config.id + ' serialize: ');
        // html = html.replace(new RegExp(_appId, 'gi'), appId);

        return html;
      },

    ]); // end asyncPromiseSeries
  }





  // PlatformRef api
  get injector(): Injector {
    return this.platformRef.injector;
  }
  bootstrapModule<T>(moduleType, compilerOptions?: any): Promise<NgModuleRef<T>> {
    if (NodePlatform._cache.has(moduleType)) {
      return this.platformRef.bootstrapModuleFactory(NodePlatform._cache.get(moduleType));
    }
    const compilerFactory: CompilerFactory = this._platformRef.injector.get(CompilerFactory);
    var compiler;
    if (compilerOptions) {
      compiler = compilerFactory.createCompiler(
      compilerOptions instanceof Array ? compilerOptions : [compilerOptions]);
    } else {
      compiler = compilerFactory.createCompiler();
    }
    return compiler.compileModuleAsync(moduleType)
        .then((moduleFactory) => {
          NodePlatform._cache.set(moduleType, moduleFactory);
          return this.platformRef.bootstrapModuleFactory(moduleFactory);
        });
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

/*
 * Ensure async resolve of promises that resolve in series. This is mostly to prevent blocking
 * the event loop and better management of refernces in task. This also allows for ZoneLocalStore.
 * We can also introduce sagas or serverless
 */
function asyncPromiseSeries(store, modRef, errorHandler, cancelHandler, config, middleware, _timer = 1) {
  let errorCalled = false;
  config.time && console.time('id: ' + config.id + ' asyncPromiseSeries: ');
  return middleware.reduce(function reduceAsyncPromiseSeries (promise, cb, currentIndex, currentArray) {
    // skip the rest of the promise middleware
    if (errorCalled || cancelHandler()) { return promise; }
    return promise.then(function reduceAsyncPromiseSeriesChain (ref) {
      // skip the rest of the promise middleware
      if (errorCalled || cancelHandler()) { return ref; }
      return new Promise(function reduceAsyncPromiseSeriesPromiseChain(resolve, reject) {
        setTimeout(() => {
          if (errorCalled || cancelHandler()) { return resolve(ref); }
          try {
            resolve(cb(store, ref));
          } catch (e) {
            reject(e);
          }
        }, 0);
      });
    }).catch(err => {
      errorCalled = true;
      return errorHandler(err, store, modRef, currentIndex, currentArray);
    });
  }, Promise.resolve(modRef)).then((val) => {
    config.time && console.timeEnd('id: ' + config.id + ' asyncPromiseSeries: ');
    if (cancelHandler()) {
      return errorHandler(null, store, modRef, null, null);
    }
    return val;
  });
}

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
  supports(_eventName: string): boolean { return true; }

  addEventListener(element: any/*HTMLElement*/, eventName: string, handler: Function): Function {
    var zone = this.manager.getZone();
    var outsideHandler = (event: any) => zone.runGuarded(() => handler(event));
    return this.manager.getZone().runOutsideAngular(() => {
      return getDOM().onAndCancel(element, eventName, outsideHandler);
    });
  }

  addGlobalEventListener(target: string, eventName: string, handler: Function): Function {
    // we need to ensure that events are created in the fake document created for the current app
    var document = this.manager.getDocument();
    var zone = this.manager.getZone();
    var element; // = getDOM().getGlobalEventTargetWithDocument(target, window, document, document.body);
    switch (target) {
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
      return getDOM().onAndCancel(element, eventName, outsideHandler);
    });
  }
}


export function _APP_BASE_HREF(_zone) {
  return Zone.current.get('baseUrl');
}

export function _REQUEST_URL(_zone) {
  return Zone.current.get('requestUrl');
}

export function _ORIGIN_URL(_zone) {
  return Zone.current.get('originUrl');
}

export class MockTestabilityRegistry extends TestabilityRegistry {
  registerApplication() {
    return null;
  }
}


@NgModule({
  providers: [
    // default config value
    // normally in platform provides but there is url state in NodePlatformLocation
    { provide: PlatformLocation, useClass: NodePlatformLocation },

    BROWSER_SANITIZATION_PROVIDERS,

    { provide: ErrorHandler, useFactory: _errorHandler, deps: [] },

    { provide: DOCUMENT, useFactory: _document, deps: _documentDeps },

    NodeDomEventsPlugin,
    { provide: DomEventsPlugin, useExisting: NodeDomEventsPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useExisting: NodeDomEventsPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: KeyEventsPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: HammerGesturesPlugin, multi: true },
    { provide: HAMMER_GESTURE_CONFIG, useClass: HammerGestureConfig },

    NodeEventManager,
    { provide: EventManager, useExisting: NodeEventManager },


    { provide: AnimationDriver, useFactory: _resolveDefaultAnimationDriver, deps: [] },
    Testability,
    // TODO(gdi2290): provide concurrent NodeDebugDomRender
    // ELEMENT_PROBE_PROVIDERS,

    NodeDomRootRenderer,
    { provide: DomRootRenderer, useExisting: NodeDomRootRenderer },
    { provide: RootRenderer, useExisting: DomRootRenderer },

    NodeSharedStylesHost,
    { provide: SharedStylesHost, useExisting: NodeSharedStylesHost },
    { provide: DomSharedStylesHost, useExisting: NodeSharedStylesHost },

    { provide: APP_BASE_HREF, useFactory: _APP_BASE_HREF, deps: [ NgZone ] },
    { provide: REQUEST_URL, useFactory: _REQUEST_URL, deps: [ NgZone ] },
    { provide: ORIGIN_URL, useFactory: _ORIGIN_URL, deps: [ NgZone ] },

    { provide: APP_ID, useValue: '%cmp%' },
    { provide: TestabilityRegistry, useClass: MockTestabilityRegistry }
  ],
  exports: [  CommonModule, ApplicationModule  ]
})
export class NodeModule {
  static forRoot(document: string, config: any = {}): ModuleWithProviders {
    var _config = Object.assign({}, { document }, config);
    return NodeModule.withConfig(_config);
  }
  static withConfig (config: any = {}): ModuleWithProviders {
    let providers = createUrlProviders(config);
    return {
      ngModule: NodeModule,
      providers: [
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
