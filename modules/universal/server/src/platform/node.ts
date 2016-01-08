import * as http from 'http';
import * as url from 'url';

// Facade
import {Type, isPresent, CONST_EXPR} from 'angular2/src/facade/lang';
import {Promise, PromiseWrapper, PromiseCompleter} from 'angular2/src/facade/promise';

// Compiler
import {COMPILER_PROVIDERS, XHR} from 'angular2/compiler';

// Animate
import {BrowserDetails} from 'angular2/src/animate/browser_details';
import {AnimationBuilder} from 'angular2/src/animate/animation_builder';

// Core
import {Testability} from 'angular2/src/core/testability/testability';
import {ReflectionCapabilities} from 'angular2/src/core/reflection/reflection_capabilities';
import {DirectiveResolver} from 'angular2/src/core/linker/directive_resolver';
import {APP_COMPONENT} from 'angular2/src/core/application_tokens';
import {
  provide,
  Provider,
  PLATFORM_INITIALIZER,
  PLATFORM_COMMON_PROVIDERS,
  PLATFORM_DIRECTIVES,
  PLATFORM_PIPES,
  APPLICATION_COMMON_PROVIDERS,
  ComponentRef,
  platform,
  reflector,
  ExceptionHandler,
  Renderer
} from 'angular2/core';

// Common
import {COMMON_DIRECTIVES, COMMON_PIPES, FORM_PROVIDERS} from 'angular2/common';

// Platform
import {ELEMENT_PROBE_BINDINGS,ELEMENT_PROBE_PROVIDERS,} from 'angular2/platform/common_dom';
import {Parse5DomAdapter} from 'angular2/src/platform/server/parse5_adapter';
Parse5DomAdapter.makeCurrent(); // ensure Parse5DomAdapter is used
// Platform.Dom
import {DOM} from 'angular2/src/platform/dom/dom_adapter';
// import {DomRenderer} from 'angular2/src/platform/dom/dom_renderer';
import {EventManager, EVENT_MANAGER_PLUGINS} from 'angular2/src/platform/dom/events/event_manager';
import {DomEventsPlugin} from 'angular2/src/platform/dom/events/dom_events';
import {KeyEventsPlugin} from 'angular2/src/platform/dom/events/key_events';
import {HammerGesturesPlugin} from 'angular2/src/platform/dom/events/hammer_gestures';
import {DomSharedStylesHost, SharedStylesHost} from 'angular2/src/platform/dom/shared_styles_host';
import {DOCUMENT} from 'angular2/src/platform/dom/dom_tokens';
import {DomRenderer} from 'angular2/src/platform/dom/dom_renderer';

import {ServerDomRenderer_} from '../render/server_dom_renderer';

export function initNodeAdapter() {
  Parse5DomAdapter.makeCurrent();
}

export class NodeXHRImpl extends XHR {
  get(templateUrl: string): Promise<string> {
    let completer: PromiseCompleter<string> = PromiseWrapper.completer(),
      parsedUrl = url.parse(templateUrl);

    http.get(templateUrl, (res) => {
      res.setEncoding('utf8');

      // normalize IE9 bug (http://bugs.jquery.com/ticket/1450)
      var status = res.statusCode === 1223 ? 204 : res.statusCode;

      if (200 <= status && status <= 300) {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          completer.resolve(data);
        });
      }
      else {
        completer.reject(`Failed to load ${templateUrl}`, null);
      }

      // consume response body
      res.resume();
    }).on('error', (e) => {
      completer.reject(`Failed to load ${templateUrl}`, null);
    });

    return completer.promise;
  }
}

export const NODE_PROVIDERS: Array<any> = CONST_EXPR([
  ...PLATFORM_COMMON_PROVIDERS,
  new Provider(PLATFORM_INITIALIZER, {useValue: initNodeAdapter, multi: true}),
]);

function _exceptionHandler(): ExceptionHandler {
  return new ExceptionHandler(DOM, false);
}

export const NODE_APP_COMMON_PROVIDERS: Array<any> = CONST_EXPR([
  ...APPLICATION_COMMON_PROVIDERS,
  ...FORM_PROVIDERS,
  new Provider(PLATFORM_PIPES, {useValue: COMMON_PIPES, multi: true}),
  new Provider(PLATFORM_DIRECTIVES, {useValue: COMMON_DIRECTIVES, multi: true}),
  new Provider(ExceptionHandler, {useFactory: _exceptionHandler, deps: []}),
  new Provider(DOCUMENT, {
    useFactory: (appComponentType, directiveResolver) => {
      // TODO(gdi2290): determine a better for document on the server
      let selector = directiveResolver.resolve(appComponentType).selector;
      let serverDocument = DOM.createHtmlDocument();
      let el = DOM.createElement(selector);
      DOM.appendChild(serverDocument.body, el);
      return serverDocument;
    },
    deps: [APP_COMPONENT, DirectiveResolver]
  }),
  new Provider(EVENT_MANAGER_PLUGINS, {useClass: DomEventsPlugin, multi: true}),
  new Provider(EVENT_MANAGER_PLUGINS, {useClass: KeyEventsPlugin, multi: true}),
  new Provider(EVENT_MANAGER_PLUGINS, {useClass: HammerGesturesPlugin, multi: true}),
  new Provider(DomRenderer, {useClass: ServerDomRenderer_}),
  new Provider(Renderer, {useExisting: DomRenderer}),
  new Provider(SharedStylesHost, {useExisting: DomSharedStylesHost}),
  DomSharedStylesHost,
  Testability,
  BrowserDetails,
  AnimationBuilder,
  EventManager
]);

/**
 * An array of providers that should be passed into `application()` when bootstrapping a component.
 */
export const NODE_APP_PROVIDERS: Array<any> = CONST_EXPR([
  ...NODE_APP_COMMON_PROVIDERS,
  ...COMPILER_PROVIDERS,
  new Provider(XHR, {useClass: NodeXHRImpl}),
]);

/**
 *
 */
export function bootstrap(
  appComponentType: Type,
  customAppProviders: Array<any> = null,
  customComponentProviders: Array<any> = null): Promise<ComponentRef> {

  reflector.reflectionCapabilities = new ReflectionCapabilities();

  let appProviders: Array<any> = [
    provide(APP_COMPONENT, {useValue: appComponentType}),
    ...NODE_APP_PROVIDERS,
    ...(isPresent(customAppProviders) ? customAppProviders : [])
  ];

  let componentProviders: Array<any> = [
    ...(isPresent(customComponentProviders) ? customComponentProviders : [])
  ];

  return platform(NODE_PROVIDERS)
    .application(appProviders)
    .bootstrap(appComponentType, componentProviders);
}
