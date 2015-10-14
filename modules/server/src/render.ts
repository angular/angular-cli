/// <reference path="../typings/tsd.d.ts" />

import {bootstrap} from './core/application';
import {SERVER_DOM_RENDERER_PROVIDERS} from './render/server_dom_renderer';

import {selectorRegExpFactory} from './helper';
import {stringifyElement} from './stringifyElement';


import {getPrebootCSS, createPrebootHTML} from './ng_preboot';
import {getClientCode} from '../../preboot/server';


import {isBlank, isPresent} from 'angular2/src/core/facade/lang';
import {DOM} from 'angular2/src/core/dom/dom_adapter';


import {
  DOCUMENT,
  DOM_REFLECT_PROPERTIES_AS_ATTRIBUTES
} from 'angular2/src/core/render/render';
import {APP_COMPONENT} from 'angular2/src/core/application_tokens';
import {SharedStylesHost} from 'angular2/src/core/render/dom/shared_styles_host';

import {
  Http
} from 'angular2/http';

import {
  provide,
  NgZone,
  DirectiveResolver,
  ComponentRef
} from 'angular2/angular2';

export var serverDirectiveResolver = new DirectiveResolver();

export function selectorResolver(Component): string {
  return serverDirectiveResolver.resolve(Component).selector;
}

                                                                /* Document */
export function createServerDocument(appComponentType: /*Type*/ any): any {
  // 1ms
  let serverDocument = DOM.createHtmlDocument();
  let el = DOM.createElement(appComponentType, serverDocument);
  DOM.appendChild(serverDocument.body, el);

  return serverDocument;
}


export function serializeApplication(element, styles: string[], cache: any) {
  // serialize all style hosts
  let serializedStyleHosts = styles.length >= 1 ? '<style>' + styles.join('\n') + '</style>' : '';

  // serialize Top Level Component
  let serializedCmp = stringifyElement(element);

  // serialize App Data
  let serializedData = !cache ? '' : ''+
    '<script>'+
    'window.' + 'ngPreloadCache' +' = '+  JSON.stringify(cache, null, 2) +
    '</script>'
  '';

  return serializedStyleHosts + serializedCmp + serializedData;
}


function arrayFlatten(children: any[], arr: any[]): any[] {
  for (let child of children) {
    arr.push(child.res);
    arrayFlatten(child.children, arr);
  }

  return arr
}

export function appRefSyncRender(appRef) {
  // grab parse5 html element
  let element = appRef.location.nativeElement;

  // TODO: we need a better way to manage the style host for server/client
  let stylesHost = appRef.injector.getOptional(SharedStylesHost);
  let styles = stylesHost.getAllStyles();

  // TODO: we need a better way to manage data serialized data for server/client
  let http = appRef.injector.getOptional(Http);
  let cache = isPresent(http) ? arrayFlatten(http._rootNode.children, []) : null;

  let serializedApp = serializeApplication(element, styles, cache);

  return serializedApp;
}

export function renderToString(AppComponent, serverProviders: any = []): Promise<string> {
  return bootstrap(AppComponent, serverProviders)
    .then(appRef => {
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


export function renderToStringWithPreboot(AppComponent, serverProviders: any = [], prebootConfig: any = {}): Promise<string> {
  return renderToString(AppComponent, serverProviders)
    .then(html => {
      if (!prebootConfig) { return html }
      return getClientCode(prebootConfig)
        .then(code => html + createPrebootHTML(code, prebootConfig));
    });
}
