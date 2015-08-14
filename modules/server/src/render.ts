/// <reference path="../typings/tsd.d.ts" />

// server version
import {bootstrap, ApplicationRef} from './bootstrap-server';
//
export {bootstrap};

import {selectorRegExpFactory} from './helper';

import {serverDomRendererInjectables} from './server_dom_renderer';


import {stringifyElement} from './stringifyElement';


import {isBlank, isPresent} from 'angular2/src/facade/lang';
import {DOM} from 'angular2/src/dom/dom_adapter';
import {DirectiveResolver} from 'angular2/core';
import {bind} from 'angular2/di';
import {
  DOCUMENT,
  DOM_REFLECT_PROPERTIES_AS_ATTRIBUTES
} from 'angular2/src/render/render';
import {APP_COMPONENT} from 'angular2/src/core/application_tokens';

// TODO: maintain stateless Injector/document and directiveResolver
var serverInjector = undefined; // js defaults only work with undefined

export var serverDirectiveResolver = new DirectiveResolver();

export function selectorResolver(Component): string {
  return serverDirectiveResolver.resolve(Component).selector;
}


export function applicationToString(appRef): string {
  // grab parse5 html element or default to the one we provided
  let element = appRef.hostElementRef.nativeElement;
  let serializedCmp = stringifyElement(element);
  return serializedCmp;
}


export function bootstrapServer(AppComponent, serverBindings: any = [], serverInjector: any = null, serverDocument: any = null) {

  // create server document with top level component
  if (isBlank(serverDocument)) {
    // 1ms
    serverDocument = DOM.createHtmlDocument();
    let selector = selectorResolver(AppComponent);
    let el = DOM.createElement(selector, serverDocument);
    DOM.appendChild(serverDocument.body, el);
  }

  let renderBindings = [
    bind(DOCUMENT).toValue(serverDocument),
    bind(DOM_REFLECT_PROPERTIES_AS_ATTRIBUTES).toValue(false),
    bind(APP_COMPONENT).toValue(AppComponent),
    serverDomRendererInjectables
  ].
  concat(serverBindings);

  return bootstrap(AppComponent, renderBindings, serverInjector, serverDocument).
    then(appRef => {
      // save a reference to appInjector
      // TODO: refactor into appRef
      if (isBlank(serverInjector) && isPresent(appRef.injector)) {
        serverInjector = appRef.injector;
      }

      return appRef;
    });


}

export function renderToString(AppComponent, serverBindings: any = [], serverDocument: any = null) {
  return bootstrapServer(AppComponent, serverBindings, serverDocument).
    then(appRef => {

      // change detection
      appRef.changeDetection.detectChanges();

      // TODO: we need a better way to manage the style host for server/client
      // serialize all style hosts
      let styles = appRef.sharedStylesHost.getAllStyles();
      let serializedStyleHosts = styles.length >= 1 ? '<style>' + styles.join('\n') + '</style>' : '';

      // serialize Top Level Component
      let serializedCmp = applicationToString(appRef);

      // destroy appComponent
      // remove from serverDom (should be handled by appRef.dispose already)
      appRef.dispose();

      // return rendered version of our serialized component
      return serializedStyleHosts + serializedCmp;
    });
}

