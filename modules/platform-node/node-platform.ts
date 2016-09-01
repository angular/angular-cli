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
  provideDocument,
  provideUniversalAppId,
  _COMPONENT_ID
} from './providers';

import {
  NODE_APP_ID,
  UNIVERSAL_CONFIG,

  ORIGIN_URL,
  REQUEST_URL,
  BASE_URL,
} from './tokens';

export function _errorHandler(): ErrorHandler {
  return new ErrorHandler();
}

export function _resolveDefaultAnimationDriver(): AnimationDriver {
  if (getDOM().supportsWebAnimation()) {
    return AnimationDriver.NOOP;
  }
  return AnimationDriver.NOOP;
}

// Hold Reference
export var __PLATFORM_REF: PlatformRef = null;

function s4() {
  return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
}

export class NodePlatform implements PlatformRef {
  static _noop = () => {};
  static _cache = new Map<any, any>();
  _platformRef;
  get platformRef() {
    return __PLATFORM_REF;
  }
  constructor(platformRef: PlatformRef) {
    // Reuse reference
    this._platformRef = __PLATFORM_REF || (__PLATFORM_REF = platformRef);
  }


  serializeModule<T>(moduleType: any, config: any = {}) {
    if (config && !config.id) {
      config.id = s4();
    }

    // TODO(gdi2290): make stateless. allow for many instances of modules
    // TODO(gdi2290): refactor to ZoneLocalStore
    var _map = new Map<any, any>();
    var di = {
      set(key, value, defaultValue?: any) {
        _map.set(key, value || defaultValue);
      },
      get(key, defaultValue?: any) {
        return _map.has(key) ? _map.get(key) : defaultValue;
      },
      clear() {
        _map.clear();
        di = null;
      }
    };

    config.time && console.time('id: ' + config.id + ' bootstrapModule: ');
    return this.platformRef.bootstrapModule<T>(moduleType, config.compilerOptions)
      .then((moduleRef: NgModuleRef<T>) => {
        config.time && console.timeEnd('id: ' + config.id + ' bootstrapModule: ');
        let modInjector = moduleRef.injector;
        let instance: any = moduleRef.instance;
        // lifecycle hooks
        di.set('universalOnInit', instance.universalOnInit, NodePlatform._noop);
        di.set('universalDoCheck', instance.universalDoCheck, NodePlatform._noop);
        di.set('universalOnStable', instance.universalOnStable, NodePlatform._noop);
        di.set('universalOnRendered', instance.universalOnRendered, NodePlatform._noop);
        // global config
        di.set('config', modInjector.get(UNIVERSAL_CONFIG, {}));
        di.set('ApplicationRef', modInjector.get(ApplicationRef));
        di.set('NgZone', modInjector.get(NgZone));
        // di.set('NODE_APP_ID', modInjector.get(NODE_APP_ID, null));
        di.set('APP_ID', modInjector.get(APP_ID, null));
        di.set('DOCUMENT', modInjector.get(DOCUMENT));
        di.set('DOM', getDOM());
        di.set('CACHE', {});
        return moduleRef;
      })
      .then((moduleRef: NgModuleRef<T>) => {
        config.time && console.time('id: ' + config.id + ' stable: ');
        let _config = di.get('config');
        let universalDoCheck = di.get('universalDoCheck');
        let universalOnInit = di.get('universalOnInit');
        let rootNgZone = di.get('NgZone');
        let appRef = di.get('ApplicationRef');
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
          // _config used
          let cmpInjector = compRef.injector;
          let ngZone: NgZone = cmpInjector.get(NgZone);
          // TODO(gdi2290): remove when zone.js tracks http and https
          let http = cmpInjector.get(Http, null);
          let jsonp = cmpInjector.get(Jsonp, null);
          return rootNgZone.runOutsideAngular(outsideNg.bind(null, compRef, ngZone, _config, http, jsonp));
        });
        return rootNgZone.runOutsideAngular(() => {
          return Promise.all<Promise<ComponentRef<any>>>(stableComponents);
        })
          .then(() => {
            config.time && console.timeEnd('id: ' + config.id + ' stable: ');
            return moduleRef;
          });
      })
      .then((moduleRef: NgModuleRef<T>) => {
        let _config = di.get('config');
        if (typeof _config.preboot === 'boolean' && !_config.preboot) {
          return moduleRef;
        }

        config.time && console.time('id: ' + config.id + ' preboot: ');
        // parseFragment used
        // getInlineCode used
        let DOM = di.get('DOM');
        let appRef: ApplicationRef = di.get('ApplicationRef');
        let components = appRef.components;
        let prebootCode;
        // TODO(gdi2290): hide cache in (ngPreboot|UniversalPreboot)
        let key = (typeof _config.preboot === 'object') && JSON.stringify(_config.preboot) || null;
        let prebootEl;
        let el;
        let lastRef;
        try {
          if (key && NodePlatform._cache.has(key)) {
            prebootEl = NodePlatform._cache.get(key).prebootEl;
            // prebootCode = NodePlatform._cache.get(key);
          } else if (key && !prebootEl) {
            config.time && console.time('id: ' + config.id + ' preboot insert: ');
            prebootCode = parseFragment('' +
              '<script>\n' +
              getInlineCode(_config.preboot) +
              ';\nvar preboot = preboot || prebootstrap()</script>' +
            '');
            prebootEl = DOM.createElement('div');

            for (let i = 0; i < prebootCode.childNodes.length; i++) {
              DOM.appendChild(prebootEl, prebootCode.childNodes[i]);
            }
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
      })
      .then((moduleRef: NgModuleRef<T>) => {
        config.time && console.time('id: ' + config.id + ' serialize: ');
        // serializeDocument used
        // parseFragment used
        let universalOnRendered = di.get('universalOnRendered');
        let document = di.get('DOCUMENT');
        let appRef = di.get('ApplicationRef');
        let appId = di.get('APP_ID', null);
        let DOM = di.get('DOM');
        let CACHE = di.get('CACHE');
        CACHE.APP_ID = appId;

        let script = parseFragment(''+
        '<script>\n'+
        ' try {'+
          'window.UNIVERSAL_CACHE = (' + JSON.stringify(CACHE) + ') || {}' +
        '} catch(e) {'+
        '  console.warn("Angular Universal: There was a problem parsing data from the server")' +
        '}\n' +
        '</script>'+
        '');
        let el = DOM.createElement('universal-script');
        for (let i = 0; i < script.childNodes.length; i++) {
          DOM.appendChild(el, script.childNodes[i]);
        }
        DOM.appendChild(document, el);

        let html = serializeDocument(document);

        document = null;
        di.clear();

        appRef.ngOnDestroy();
        appRef = null;

        moduleRef.destroy();
        moduleRef = null;

        config.time && console.timeEnd('id: ' + config.id + ' serialize: ');
        // html = html.replace(new RegExp(_appId, 'gi'), appId);

        universalOnRendered(html);

        return html;
      });
  }






  // PlatformRef api
  get injector(): Injector {
    return this.platformRef.injector;
  }
  bootstrapModule(moduleType, compilerOptions) {
    return this.platformRef.bootstrapModule(moduleType, compilerOptions);
  }
  bootstrapModuleFactory(moduleFactory) {
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
    return this.platformRef.onDestroy(callback);
  }
  // end PlatformRef api

}



// @NgModule({
//   providers: [
//     ApplicationRef_,
//     {provide: ApplicationRef, useExisting: ApplicationRef_},
//     ApplicationInitStatus,
//     Compiler,
//     APP_ID_RANDOM_PROVIDER,
//     ViewUtils,
//     {provide: IterableDiffers, useFactory: _iterableDiffersFactory},
//     {provide: KeyValueDiffers, useFactory: _keyValueDiffersFactory},
//     {provide: LOCALE_ID, useValue: 'en-US'},
//   ]
// })
// export class UniversalApplicationModule {
// }

// export class UniversalViewUtils extends ViewUtils {
//   constructor() {

//   }
//   createRenderComponentType(
//       templateUrl: string, slotCount: number, encapsulation: ViewEncapsulation,
//       styles: Array<string|any[]>, animations: {[key: string]: Function}): RenderComponentType {
//     return new RenderComponentType(
//         `${this._appId}-${this._nextCompTypeId++}`, templateUrl, slotCount, encapsulation, styles,
//         animations);
//   }
// }

@NgModule({
  providers: [
    BROWSER_SANITIZATION_PROVIDERS,
    { provide: ErrorHandler, useFactory: _errorHandler, deps: [] },
    // { provide: DOCUMENT, useFactory: _document, deps: [] },

    // TOdO(gdi2290): NodeDomEventsPlugin
    { provide: EVENT_MANAGER_PLUGINS, useClass: DomEventsPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: KeyEventsPlugin, multi: true },
    // { provide: EVENT_MANAGER_PLUGINS, useClass: HammerGesturesPlugin, multi: true },
    // { provide: HAMMER_GESTURE_CONFIG, useClass: HammerGestureConfig },


    { provide: AnimationDriver, useFactory: _resolveDefaultAnimationDriver },
    Testability,
    EventManager,
    // ELEMENT_PROBE_PROVIDERS,

    NodeDomRootRenderer,
    { provide: DomRootRenderer, useExisting: NodeDomRootRenderer },
    { provide: RootRenderer, useExisting: DomRootRenderer },

    NodeSharedStylesHost,
    {provide: SharedStylesHost, useExisting: NodeSharedStylesHost},
    {provide: DomSharedStylesHost, useExisting: NodeSharedStylesHost},


    { provide: PlatformLocation, useClass: NodePlatformLocation },

    // { provide: ViewUtils, useClass: },
  ],
  exports: [  CommonModule, ApplicationModule  ]
})
export class NodeModule {
  static __dynamicConfig = [
    { provide: BASE_URL, useValue: 'baseUrl' },
    { provide: APP_BASE_HREF, useValue: 'baseUrl' },
    { provide: REQUEST_URL, useValue: 'requestUrl' },
    { provide: ORIGIN_URL, useValue: 'originUrl' }
  ];
  static __clone(obj) {
    return obj.slice(0).map(obj => {
      var newObj = {};
      Object.keys(obj).forEach(key => {
        newObj[key] = obj[key];
      });
      return newObj;
    });
  }
  static get dynamicConfig() {
    return NodeModule.__clone(NodeModule.__dynamicConfig);
  };
  static set dynamicConfig(value) {
    NodeModule.__dynamicConfig = value;
  };

  static forRoot(document: string, config: any = {}) {
    var _config = Object.assign({}, { document }, config);
    return NodeModule.withConfig(_config);
  }
  static withConfig(config: any = {}) {
    let doc = config.document;
    let providers = NodeModule
      .dynamicConfig
      .reduce((memo, provider) => {
        let key = provider.useValue;
        if (key in config) {
          provider.useValue = config[key];
          memo.push(provider);
        }
        return memo;
      }, []);
    return {
      ngModule: NodeModule,
      providers: [
        {provide: UNIVERSAL_CONFIG, useValue: config},
        provideDocument(doc),
        // provideUniversalAppId(config.appId),
        ...providers,
      ]
    };
  }
  constructor(@Optional() @SkipSelf() parentModule: NodeModule) {
    if (parentModule) {
      throw new Error(
          `NodeModule has already been loaded. If you need access to common directives such as NgIf and NgFor from a lazy loaded module, import CommonModule instead.`);
    }
  }
}


function initParse5Adapter() {
  Parse5DomAdapter.makeCurrent();
  // wtfInit();
}


export const INTERNAL_NODE_PLATFORM_PROVIDERS: Array<any /*Type | Provider | any[]*/> = [
  { provide: PLATFORM_INITIALIZER, useValue: initParse5Adapter, multi: true },
  // { provide: PlatformLocation, useClass: NodePlatformLocation },
];


/**
 * The node platform that supports the runtime compiler.
 *
 * @experimental
 */
export const platformDynamicNode = (extraProviders?: any[]) => {
  const platform = __PLATFORM_REF || createPlatformFactory(platformCoreDynamic, 'nodeDynamic', INTERNAL_NODE_PLATFORM_PROVIDERS)(extraProviders);
  return new NodePlatform(platform);
};


