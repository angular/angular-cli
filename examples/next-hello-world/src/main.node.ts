import { platformCoreDynamic } from '@angular/compiler';
// import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import {
  DOCUMENT,
  // BrowserModule
  BROWSER_SANITIZATION_PROVIDERS,
  EVENT_MANAGER_PLUGINS,
  AnimationDriver,
  EventManager,
  // DomSharedStylesHost
  // DomRootRenderer
} from '@angular/platform-browser';


// PRIVATE
import { Parse5DomAdapter } from '@angular/platform-server/src/parse5_adapter';
import { DomEventsPlugin } from '@angular/platform-browser/src/dom/events/dom_events'
import { KeyEventsPlugin } from '@angular/platform-browser/src/dom/events/key_events'
import {
  HammerGesturesPlugin,
  // EventManager,
  HAMMER_GESTURE_CONFIG,
  HammerGestureConfig
} from '@angular/platform-browser/src/dom/events/hammer_gestures'
import { DomSharedStylesHost, SharedStylesHost } from '@angular/platform-browser/src/dom/shared_styles_host';
import { DomRootRenderer } from '@angular/platform-browser/src/dom/dom_renderer';
import { wtfInit } from '@angular/core/src/profile/wtf_init';
// PRIVATE


// import {APP_BASE_HREF} from '@angular/common';
import {
  ExceptionHandler,
  RootRenderer,
  Testability,
  ApplicationModule,
  createPlatformFactory,
  PLATFORM_INITIALIZER,


  NgModule,
  ComponentRef,
  ApplicationRef,
  NgModuleRef
} from '@angular/core';

import {
  CommonModule,
  PlatformLocation
} from '@angular/common';

import {
  // bootstrap,
  parseDocument,
  serializeDocument,
  provideDocument,
  // ORIGIN_URL,
  // REQUEST_URL,
  // NODE_LOCATION_PROVIDERS
} from '@angular/universal';

import { getDOM } from '@angular/platform-browser/src/dom/dom_adapter';

import { NodeDomRootRenderer_ } from './node-renderer';

import { App } from './app';

export function _exceptionHandler(): ExceptionHandler {
  return new ExceptionHandler(getDOM());
}

export function _document(): any {
  return parseDocument(`<!doctype>
<html lang="en">
<head>
  <title>Angular 2 Universal Starter</title>
  <meta charset="UTF-8">
  <meta name="description" content="Angular 2 Universal">
  <meta name="keywords" content="Angular 2,Universal">
  <meta name="author" content="PatrickJS">

  <link rel="icon" href="data:;base64,iVBORw0KGgo=">

  <base href="/">
<body>

  <app>
    Loading...
  </app>

  <script src="dist/public/browser-bundle.js"></script>
</body>
</html>
`)
}

export function _resolveDefaultAnimationDriver(): AnimationDriver {
  if (getDOM().supportsWebAnimation()) {
    return AnimationDriver.NOOP;
  }
  return AnimationDriver.NOOP;
}


@NgModule({
  providers: [
    BROWSER_SANITIZATION_PROVIDERS,
    {provide: ExceptionHandler, useFactory: _exceptionHandler, deps: []},
    {provide: DOCUMENT, useFactory: _document, deps: []},
    {provide: EVENT_MANAGER_PLUGINS, useClass: DomEventsPlugin, multi: true},
    {provide: EVENT_MANAGER_PLUGINS, useClass: KeyEventsPlugin, multi: true},
    {provide: EVENT_MANAGER_PLUGINS, useClass: HammerGesturesPlugin, multi: true},
    {provide: HAMMER_GESTURE_CONFIG, useClass: HammerGestureConfig},

    {provide: DomRootRenderer, useClass: NodeDomRootRenderer_},
    {provide: RootRenderer, useExisting: DomRootRenderer},
    {provide: SharedStylesHost, useExisting: DomSharedStylesHost},

    {provide: AnimationDriver, useFactory: _resolveDefaultAnimationDriver},
    DomSharedStylesHost,
    Testability,
    EventManager,
    // ELEMENT_PROBE_PROVIDERS
  ],
  exports: [  CommonModule, ApplicationModule  ]
})
export class NodeModule {
}


function initParse5Adapter() {
  Parse5DomAdapter.makeCurrent();
  wtfInit();
}

function notSupported(feature: string): Error {
  throw new Error(`platform-node does not support '${feature}'.`);
}
export class NodePlatformLocation extends PlatformLocation {
  getBaseHrefFromDOM(): string { throw notSupported('getBaseHrefFromDOM'); };
  onPopState(fn: any): void { notSupported('onPopState'); };
  onHashChange(fn: any): void { notSupported('onHashChange'); };
  get pathname(): string { throw notSupported('pathname'); }
  get search(): string { throw notSupported('search'); }
  get hash(): string { throw notSupported('hash'); }
  replaceState(state: any, title: string, url: string): void { notSupported('replaceState'); };
  pushState(state: any, title: string, url: string): void { notSupported('pushState'); };
  forward(): void { notSupported('forward'); };
  back(): void { notSupported('back'); };
}


export const INTERNAL_NODE_PLATFORM_PROVIDERS: Array<any /*Type | Provider | any[]*/> = [
  {provide: PLATFORM_INITIALIZER, useValue: initParse5Adapter, multi: true},
  {provide: PlatformLocation, useClass: NodePlatformLocation},
];


/**
 * The node platform that supports the runtime compiler.
 *
 * @experimental
 */
export const platformDynamicNode =
    createPlatformFactory(platformCoreDynamic, 'nodeDynamic', INTERNAL_NODE_PLATFORM_PROVIDERS);


@NgModule({
  bootstrap: [ App ],
  declarations: [ App ],
  imports: [
    NodeModule
  ],
  providers: [
    { provide: DOCUMENT, useFactory: _document },
    // {provide: DomRootRenderer, useClass: NodeDomRootRenderer_},
    // {provide: RootRenderer, useExisting: DomRootRenderer},
    // {provide: SharedStylesHost, useExisting: DomSharedStylesHost},

  ]
})
export class MainModule {}

export const platform = platformDynamicNode();

export function main() {

  return platform
    .bootstrapModule(MainModule)
    .then((moduleRef: NgModuleRef<MainModule>) => {
      console.log('done')
      let document = moduleRef.injector.get(DOCUMENT);
      return serializeDocument(document);
    });
};


