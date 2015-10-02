/// <reference path="../typings/tsd.d.ts" />

// server version
import {bootstrap, ApplicationRef} from './bootstrap-server';
//
export {bootstrap};

import {selectorRegExpFactory} from './helper';

import {SERVER_DOM_RENDERER_BINDINGS} from './server_dom_renderer';


import {stringifyElement} from './stringifyElement';

import {getClientCode} from '../../preboot/server';
import {getPrebootCSS, createPrebootHTML} from './ng_preboot';


import {isBlank, isPresent} from 'angular2/src/core/facade/lang';
import {DOM} from 'angular2/src/core/dom/dom_adapter';
import {DirectiveResolver} from 'angular2/src/core/compiler/directive_resolver';
import {bind} from 'angular2/di';
import {
  DOCUMENT,
  DOM_REFLECT_PROPERTIES_AS_ATTRIBUTES
} from 'angular2/src/core/render/render';
import {APP_COMPONENT} from 'angular2/src/core/application_tokens';

import {Http} from 'angular2/http';
import {NgZone} from 'angular2/angular2';

// TODO: maintain stateless Injector/document and directiveResolver
var serverInjector = undefined; // js defaults only work with undefined

export var serverDirectiveResolver = new DirectiveResolver();

export function selectorResolver(Component): string {
  return serverDirectiveResolver.resolve(Component).selector;
}


export function createServerDocument(appSelector) {
  // 1ms
  let serverDocument = DOM.createHtmlDocument();
  let el = DOM.createElement(appSelector, serverDocument);
  DOM.appendChild(serverDocument.body, el);
  return serverDocument;
}


export function appRefSaveServerInjector(appRef) {
  // save a reference to appInjector
  // TODO: refactor into appRef
  if (isBlank(serverInjector) && isPresent(appRef.injector)) {
    serverInjector = appRef.injector;
  }

  return appRef;
}


export function serializeApplication(element, styles: string[], cache: any) {
  // serialize all style hosts
  let serializedStyleHosts = styles.length >= 1 ? '<style>' + styles.join('\n') + '</style>' : '';

  // serialize Top Level Component
  let serializedCmp = stringifyElement(element);

  // serialize App Data
  let serializedData = !cache ? '' : ''+
    '<script>'+
    'window.' + 'ngPreloadCache' +' = '+  JSON.stringify(cache) +
    '</script>'
  '';

  return serializedStyleHosts + serializedCmp + serializedData;
}


function arrayFlatten(children: any[], arr: any[]): any[] {
  for (let child of children) {
    arr.push(child.res)
    arrayFlatten(child.children, arr)
  }

  return arr
}

export function appRefSyncRender(appRef) {
  // grab parse5 html element
  let element = appRef.hostElementRef.nativeElement;

  // TODO: we need a better way to manage the style host for server/client
  let styles = appRef.sharedStylesHost.getAllStyles();

  // TODO: we need a better way to manage data serialized data for server/client
  let http = appRef.injector.getOptional(Http);
  let cache = isPresent(http) ? arrayFlatten(http._rootNode.children, []) : null;

  let serializedApp = serializeApplication(element, styles, cache);

  return serializedApp;
}


export function bootstrapServer(AppComponent, serverBindings: any = [], serverInjector: any = null, serverDocument: any = null) {

  // create server document with top level component
  if (isBlank(serverDocument)) {
    serverDocument = createServerDocument(selectorResolver(AppComponent));
  }

  let renderBindings = [
    bind(DOCUMENT).toValue(serverDocument),
    bind(APP_COMPONENT).toValue(AppComponent),
    SERVER_DOM_RENDERER_BINDINGS
  ].concat(serverBindings);

  return bootstrap(AppComponent, renderBindings, serverInjector, serverDocument).
    then(appRefSaveServerInjector);
}

export function renderToString(AppComponent, serverBindings: any = [], serverDocument: any = null) {
  return bootstrapServer(AppComponent, serverBindings, serverDocument).
    then(appRef => {
      let http = appRef.injector.getOptional(Http);
      // TODO: fix zone.js ensure overrideOnEventDone callback when there are no pending tasks
      // ensure all xhr calls are done
      return new Promise(resolve => {
        let ngZone = appRef.injector.get(NgZone);
        // ngZone
        ngZone.overrideOnEventDone(() => {
          if (isBlank(http) || http._async <= 0) {
            let _html = appRefSyncRender(appRef);
            appRef.dispose();
            resolve(_html);
          }

        }, true);

      });

    });
}


export function renderToStringWithPreboot(AppComponent, serverBindings: any = [], prebootConfig: any = {}, serverDocument: any = null) {
  return renderToString(AppComponent, serverBindings, serverDocument).
    then(html => {
      if (!prebootConfig) { return html }
      return getClientCode(prebootConfig).
        then(code => html + createPrebootHTML(code, prebootConfig));
    });
}
