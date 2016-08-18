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
  NgModuleRef
} from '@angular/core';

import { PlatformRef_ } from '@angular/core/src/application_ref';

import {
  CommonModule,
  PlatformLocation
} from '@angular/common';


import { NodePlatformLocation } from './node-location';
import { parseDocument, serializeDocument } from './node-document';
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
        let document = moduleRef.injector.get(DOCUMENT);
        let appRef = moduleRef.injector.get(ApplicationRef);
        let modInjector = moduleRef.injector;
        let instance: any = moduleRef.instance;
        lifecycle.set('ngOnInit', instance.ngOnInit || NodePlatform._noop);
        lifecycle.set('ngDoCheck', instance.ngDoCheck || NodePlatform._noop);
        lifecycle.set('ngOnStable', instance.ngOnStable || NodePlatform._noop);
        lifecycle.set('ngOnRendered', instance.ngOnRendered || NodePlatform._noop);
        return moduleRef;
      })
      .then((moduleRef: NgModuleRef<T>) => {

        let _appId = moduleRef.injector.get(APP_ID, null);
        let appId = moduleRef.injector.get(NODE_APP_ID, _appId);
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
  static forRoot(document: string, config: any = {}) {
    var _config = Object.assign({}, { document }, config);
    return NodeModule.withConfig(_config);
  }
  static withConfig(config: any = {}) {
    let doc = config.document;
    let providers = [];
    if (typeof doc === 'string') {
      config.document = parseDocument(doc);
    }
    if (config.baseUrl) {
      providers.push({ provide: BASE_URL, useValue: config.baseUrl });
    }
    if (config.requestUrl) {
      providers.push({ provide: REQUEST_URL, useValue: config.requestUrl });
    }
    if (config.originUrl) {
      providers.push({ provide: ORIGIN_URL, useValue: config.originUrl });
    }
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


