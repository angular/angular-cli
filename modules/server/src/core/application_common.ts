/// <reference path="../../typings/tsd.d.ts" />
import {
  Injector,
  bind,
  OpaqueToken,
  Binding,
  Type,
  ComponentRef,
  Renderer,
  FORM_BINDINGS
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

import {DomRenderer, ServerDomRenderer_, DOCUMENT} from '../render/server_dom_renderer';

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

import {XHR} from 'angular2/src/core/compiler/xhr';
import {XHRImpl} from 'angular2/src/core/compiler/xhr_impl';
import {DOM} from 'angular2/src/core/dom/dom_adapter';
import {Testability} from 'angular2/src/core/testability/testability';
import {AnimationBuilder} from 'angular2/src/animate/animation_builder';
import {BrowserDetails} from 'angular2/src/animate/browser_details';
import {applicationCommonBindings} from 'angular2/src/core/application_ref';

import {EXCEPTION_BINDING} from './platform_bindings';
import {
  platformCommon,
  PlatformRef,
} from './application_ref';

import {createServerDocument} from '../render';


export function platform(bindings?: Array<Type | Binding | any[]>): PlatformRef {
  return platformCommon(bindings, () => {
    Parse5DomAdapter.makeCurrent();
  });
}



export function applicationServerDomBindings(): Array<Type | Binding | any[]> {
  if (isBlank(DOM)) {
    throw 'Must set a root DOM adapter first.';
  }
  return [
    // bind(DOCUMENT).toValue(DOM.defaultDoc()),

    EventManager,
    new Binding(EVENT_MANAGER_PLUGINS, {toClass: DomEventsPlugin, multi: true}),
    new Binding(EVENT_MANAGER_PLUGINS, {toClass: KeyEventsPlugin, multi: true}),
    new Binding(EVENT_MANAGER_PLUGINS, {toClass: HammerGesturesPlugin, multi: true}),

    bind(DomRenderer).toClass(ServerDomRenderer_),
    bind(Renderer).toAlias(DomRenderer),

    DomSharedStylesHost,
    bind(SharedStylesHost).toAlias(DomSharedStylesHost),

    EXCEPTION_BINDING,
    bind(XHR).toValue(new XHRImpl()),
    Testability,
    BrowserDetails,
    AnimationBuilder,
    FORM_BINDINGS
  ];
}


export function serverBootstrap(appComponentType: /*Type*/ any,
                                appBindings: Array<Type | Binding | any[]> = null):
    Promise<ComponentRef> {
  let p = platform();

  let bindings: Array<any> = [
    applicationCommonBindings(),
    applicationServerDomBindings()
  ];

  if (isPresent(appBindings)) {
    bindings.push(appBindings);
  }

  // bindings.map(function(binding, i) {
  //   if (binding === undefined) {
  //     console.log('RENDER', i, bindings[i-1]);
  //     // debugger;
  //   }
  // });

  return p.application(bindings).bootstrap(appComponentType);
}
