/// <reference path="../../typings/tsd.d.ts" />
import {
  Injector,
  OpaqueToken,
  provide,
  Provider,
  Type,
  ComponentRef,
  FORM_PROVIDERS
} from 'angular2/angular2';
import {
  EventManager,
  DomEventsPlugin,
  EVENT_MANAGER_PLUGINS
} from 'angular2/src/core/render/dom/events/event_manager';
import {
  SharedStylesHost,
  DomSharedStylesHost
} from 'angular2/src/core/render/dom/shared_styles_host';
import {Parse5DomAdapter} from 'angular2/src/core/dom/parse5_adapter';

import {
  DomRenderer,
  DomRenderer_,
  Renderer,
  DOCUMENT
} from 'angular2/src/core/render/render';
import {KeyEventsPlugin} from 'angular2/src/core/render/dom/events/key_events';
import {HammerGesturesPlugin} from 'angular2/src/core/render/dom/events/hammer_gestures';

import {
  NumberWrapper,
  isBlank,
  isPresent,
  assertionsEnabled,
  print,
  stringify
} from 'angular2/src/core/facade/lang';
// import {Promise} from 'angular2/src/core/facade/async';

import {XHR} from 'angular2/src/core/compiler/xhr';
import {XHRImpl} from 'angular2/src/core/compiler/xhr_impl';
import {DOM} from 'angular2/src/core/dom/dom_adapter';
import {Testability} from 'angular2/src/core/testability/testability';
import {AnimationBuilder} from 'angular2/src/animate/animation_builder';
import {BrowserDetails} from 'angular2/src/animate/browser_details';
import {DirectiveResolver} from 'angular2/src/core/linker/directive_resolver';

import {ServerDomRenderer_} from '../render/server_dom_renderer';

import {EXCEPTION_PROVIDERS} from './platform_providers';
import {
  platformCommon,
  PlatformRef,
  applicationCommonProviders
} from './application_ref';

import {createServerDocument} from '../render';


export function platform(providers?: Array<Type | Provider | any[]>): PlatformRef {
  return platformCommon(providers, () => {
    Parse5DomAdapter.makeCurrent();
  });
}



export function applicationServerDomProviders(appComponentType): Array<Type | Provider | any[]> {
  if (isBlank(DOM)) {
    throw 'Must set a root DOM adapter first.';
  }



  return [
    provide(DOCUMENT, {
      useFactory: (directiveResolver) => {
        let selector = directiveResolver.resolve(appComponentType).selector;
        let serverDocument = DOM.createHtmlDocument();
        let el = DOM.createElement(selector, serverDocument);
        DOM.appendChild(serverDocument.body, el);
        return serverDocument;
      },
      deps: [DirectiveResolver]
    }),
    // provide(DOCUMENT, {useValue: DOM.defaultDoc()}),

    EventManager,
    provide(EVENT_MANAGER_PLUGINS, {multi: true, useClass: DomEventsPlugin}),
    provide(EVENT_MANAGER_PLUGINS, {multi: true, useClass: KeyEventsPlugin}),
    provide(EVENT_MANAGER_PLUGINS, {multi: true, useClass: HammerGesturesPlugin}),

    provide(DomRenderer, {useClass: ServerDomRenderer_}),
    // provide(DomRenderer, {useClass: DomRenderer_}),
    provide(Renderer, {useExisting: DomRenderer}),

    DomSharedStylesHost,
    provide(SharedStylesHost, {useExisting: DomSharedStylesHost}),

    EXCEPTION_PROVIDERS,
    provide(XHR, {useValue: new XHRImpl()}),
    Testability,
    BrowserDetails,
    AnimationBuilder,
    FORM_PROVIDERS
  ];
}


export function serverBootstrap(appComponentType: /*Type*/ any,
                                appProviders: Array<Type | Provider | any[]> = null):
    Promise<ComponentRef> {
  let p = platform();

  let providers: Array<any> = [
    applicationCommonProviders(),
    applicationServerDomProviders(appComponentType)
  ];

  if (isPresent(appProviders)) {
    providers.push(appProviders);
  }

  return p.application(providers).bootstrap(appComponentType);
}
