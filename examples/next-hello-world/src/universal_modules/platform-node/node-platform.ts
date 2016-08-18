import {
  DOCUMENT,
  BROWSER_SANITIZATION_PROVIDERS,
  EVENT_MANAGER_PLUGINS,
  AnimationDriver,
  EventManager,
} from '@angular/platform-browser';


// PRIVATE
import { Parse5DomAdapter } from '@angular/platform-server/src/parse5_adapter';
import { DomEventsPlugin } from '@angular/platform-browser/src/dom/events/dom_events'
import { KeyEventsPlugin } from '@angular/platform-browser/src/dom/events/key_events'
import {
  HammerGesturesPlugin,
  HAMMER_GESTURE_CONFIG,
  HammerGestureConfig
} from '@angular/platform-browser/src/dom/events/hammer_gestures'
import { DomSharedStylesHost, SharedStylesHost } from '@angular/platform-browser/src/dom/shared_styles_host';
import { DomRootRenderer } from '@angular/platform-browser/src/dom/dom_renderer';
import { wtfInit } from '@angular/core/src/profile/wtf_init';
import { ViewUtils } from '@angular/core/src/linker/view_utils';
import { APP_ID_RANDOM_PROVIDER } from '@angular/core/src/application_tokens';
import { SanitizationService } from '@angular/core/src/security';
import { getDOM } from '@angular/platform-browser/src/dom/dom_adapter';
// PRIVATE


import {
  ExceptionHandler,
  RootRenderer,
  Testability,
  ApplicationModule,
  PLATFORM_INITIALIZER,
  APP_ID,
  Injector,


  NgModule,
  ComponentRef,
  ApplicationRef,
  PlatformRef,
  NgModuleRef,
  NgZone
} from '@angular/core';

import { PlatformRef_ } from '@angular/core/src/application_ref';

import { CommonModule, PlatformLocation } from '@angular/common';


// TODO(gdi2290): allow removal of modules that are not used for AoT
import { Jsonp, Http } from '@angular/http';
import { getInlineCode } from 'preboot';



import { NodePlatformLocation } from './node-location';
import { parseFragment, parseDocument, serializeDocument } from './node-document';
import { NodeDomRootRenderer_ } from './node-renderer';
import { NodeSharedStylesHost } from './node-shared-styles-host';

import {
  provideDocument,
  provideUniversalAppId,
  _COMPONENT_ID
} from './providers';

import {
  NODE_APP_ID,

  ORIGIN_URL,
  REQUEST_URL,
  BASE_URL,
} from './tokens';


export function _exceptionHandler(): ExceptionHandler {
  return new ExceptionHandler(getDOM());
}

// export function _document(): any {
//   return parseDocument()
// }

export function _resolveDefaultAnimationDriver(): AnimationDriver {
  if (getDOM().supportsWebAnimation()) {
    return AnimationDriver.NOOP;
  }
  return AnimationDriver.NOOP;
}

// Hold Reference
export var __PLATFORM_REF: PlatformRef = null;

export class NodePlatform implements PlatformRef {
  static _noop = () => {};
  _platformRef;
  get platformRef() {
    return __PLATFORM_REF;
  }
  constructor(platformRef: PlatformRef) {
    // Reuse reference
    this._platformRef = __PLATFORM_REF || (__PLATFORM_REF = platformRef);
  }


  serializeModule<T>(moduleType: any, config: any = {}) {
    // TODO(gdi2290): make stateless. allow for many instances of modules
    const lifecycle = new WeakMap<string, any>();

    return this.platformRef.bootstrapModule<T>(moduleType, config.compilerOptions)
      .then((moduleRef: NgModuleRef<T>) => {
        let modInjector = moduleRef.injector;
        let instance: any = moduleRef.instance;
        // lifecycle hooks
        lifecycle.set('ngOnInit', instance.ngOnInit || NodePlatform._noop);
        lifecycle.set('ngDoCheck', instance.ngDoCheck || NodePlatform._noop);
        lifecycle.set('ngOnStable', instance.ngOnStable || NodePlatform._noop);
        lifecycle.set('ngOnRendered', instance.ngOnRendered || NodePlatform._noop);
        return moduleRef;
      })
      .then((moduleRef: NgModuleRef<T>) => {

        let _config = config;
        let modInjector = moduleRef.injector;
        let appRef = modInjector.get(ApplicationRef);
        let components = appRef.components;
        let rootNgZone = modInjector.get(NgZone);

        // lifecycle hooks
        let ngDoCheck = lifecycle.get('ngDoCheck');

        function outsideNg(compRef, ngZone, config, http, jsonp) {
          function checkStable(done, ref) {
            setTimeout(function stable() {
              if (ngZone.hasPendingMicrotasks === true) { return checkStable(done, ref); }
              if (ngZone.hasPendingMacrotasks === true) { return checkStable(done, ref); }
              if (http && http._async > 0) { return checkStable(done, ref); }
              if (jsonp && jsonp._async > 0) { return checkStable(done, ref); }
              if (ngZone.isStable === true) {
                let isStable = ngDoCheck(ref, ngZone, config);
                if (typeof isStable !== 'boolean') {
                  console.warn('\nWARNING: ngDoCheck must return a boolean value of either true or false\n');
                } else if (isStable !== true) {
                  return checkStable(done, ref);
                }
              }
              if (ngZone.isStable === true) { return done(ref); }
              return checkStable(done, ref);
            }, 1);
          }
          return new Promise(function (resolve) {
            checkStable(resolve, compRef);
          }); // promise
        }

        // check if all components are stable
        let stableComponents = components.map((compRef, i) => {
          // _config used
          let cmpInjector = compRef.injector;
          let ngZone: NgZone = cmpInjector.get(NgZone);
          // TODO(gdi2290): remove when zone.js tracks http and https
          let http = cmpInjector.get(Http);
          let jsonp = cmpInjector.get(Jsonp);
          ngZone.runOutsideAngular(outsideNg.bind(null, compRef, ngZone, _config, http, jsonp));
        })
        return Promise.all<Promise<ComponentRef<any>>>(stableComponents)
          .then(() => moduleRef);
      })
      .then((moduleRef: NgModuleRef<T>) => {
        // parseFragment used
        // getInlineCode used
        let _config = config;
        let modInjector = moduleRef.injector;
        let appRef: ApplicationRef = modInjector.get(ApplicationRef);
        let components = appRef.components;
        let prebootCode = getInlineCode(_config.preboot);
        let DOM = getDOM();

        // assume last component is the last component selector
        // TODO(gdi2290): provide a better way to determine last component position
        let lastRef = components[components.length - 1];
        let el = lastRef.location.nativeElement;
        let script = parseFragment(prebootCode);
        let prebootEl = DOM.createElement('div');

        // inject preboot code in the document
        DOM.setInnerHTML(prebootEl, script);
        DOM.insertAfter(el, prebootEl);

        return moduleRef
      })
      .then((moduleRef: NgModuleRef<T>) => {
        let injector = moduleRef.injector;
        let document = injector.get(DOCUMENT);
        let appRef = injector.get(ApplicationRef);

        let _appId = injector.get(APP_ID, null);
        let appId = injector.get(NODE_APP_ID, _appId);
        // let DOM = getDOM();
        // appRef.components.map((compRef: ComponentRef<any>) => {
        //   DOM.setAttribute(compRef.location.nativeElement, 'data-universal-app-id', appId);
        // });

        let html = serializeDocument(document);
        document = null;

        appRef.ngOnDestroy();
        moduleRef.destroy();

        appRef = null;
        moduleRef = null;

        return html
          .replace(new RegExp(_appId, 'gi'), appId)
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
    return this.platformRef.bootstrapModuleFactory(moduleFactory)
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

@NgModule({
  providers: [
    BROWSER_SANITIZATION_PROVIDERS,
    { provide: ExceptionHandler, useFactory: _exceptionHandler, deps: [] },
    // { provide: DOCUMENT, useFactory: _document, deps: [] },
    { provide: EVENT_MANAGER_PLUGINS, useClass: DomEventsPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: KeyEventsPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: HammerGesturesPlugin, multi: true },
    { provide: HAMMER_GESTURE_CONFIG, useClass: HammerGestureConfig },


    { provide: AnimationDriver, useFactory: _resolveDefaultAnimationDriver },
    Testability,
    EventManager,
    // ELEMENT_PROBE_PROVIDERS,



    { provide: DomRootRenderer, useClass: NodeDomRootRenderer_ },
    { provide: RootRenderer, useExisting: DomRootRenderer },

    NodeSharedStylesHost,
    {provide: SharedStylesHost, useExisting: NodeSharedStylesHost},
    {provide: DomSharedStylesHost, useExisting: NodeSharedStylesHost},


    { provide: PlatformLocation, useClass: NodePlatformLocation },
  ],
  exports: [  CommonModule, ApplicationModule  ]
})
export class NodeModule {
  static dynamicConfig = [
    { provide: BASE_URL, useValue: 'baseUrl' },
    { provide: REQUEST_URL, useValue: 'requestUrl' },
    { provide: ORIGIN_URL, useValue: 'originUrl' }
  ];
  static forRoot(document: string, config: any = {}) {
    var _config = Object.assign({}, { document }, config);
    return NodeModule.withConfig(_config);
  }
  static withConfig(config: any = {}) {
    let doc = config.document;
    let providers = NodeModule
      .dynamicConfig
      .slice(0)
      .reduce((memo, provider) => {
        let key = provider.useValue;
        if (key in config) {
          provider.useValue = config[key];
          memo.push(provider)
        }
        return memo;
      }, []);
    return {
      ngModule: NodeModule,
      providers: [
        provideDocument(doc),
        provideUniversalAppId(config.appId),
        ...providers
      ]
    };
  }

}


function initParse5Adapter() {
  Parse5DomAdapter.makeCurrent();
  wtfInit();
}


export const INTERNAL_NODE_PLATFORM_PROVIDERS: Array<any /*Type | Provider | any[]*/> = [
  { provide: PLATFORM_INITIALIZER, useValue: initParse5Adapter, multi: true },
  // { provide: PlatformLocation, useClass: NodePlatformLocation },
];


