import {bootstrap} from './platform/node';

import {
  selectorRegExpFactory,
  arrayFlattenTree
} from './helper';
import {stringifyElement} from './stringifyElement';


// import {PRIME_CACHE} from './http/server_http';

import {
  prebootConfigDefault,
  getPrebootCSS,
  createPrebootHTML
} from './ng_preboot';

import {getClientCode} from 'preboot';


import {isBlank, isPresent} from 'angular2/src/facade/lang';

import {SharedStylesHost} from 'angular2/src/platform/dom/shared_styles_host';

import {Http} from 'angular2/http';

import {NgZone, DirectiveResolver, ComponentRef} from 'angular2/core';

export var serverDirectiveResolver = new DirectiveResolver();

export function selectorResolver(componentType: /*Type*/ any): string {
  return serverDirectiveResolver.resolve(componentType).selector;
}


export function serializeApplication(element: any, styles: string[], cache?: any): string {
  // serialize all style hosts
  let serializedStyleHosts: string = styles.length >= 1 ? '<style>' + styles.join('\n') + '</style>' : '';

  // serialize Top Level Component
  let serializedCmp: string = stringifyElement(element);

  // serialize App Data
  let serializedData: string = !cache ? '' : ''+
    '<script>'+
    'window.' + 'ngPreloadCache' +' = '+  JSON.stringify(cache, null, 2) +
    '</script>'
  '';

  return serializedStyleHosts + serializedCmp + serializedData;
}


export function appRefSyncRender(appRef: any): string {
  // grab parse5 html element
  let element = appRef.location.nativeElement;

  // TODO: we need a better way to manage the style host for server/client
  let sharedStylesHost = appRef.injector.get(SharedStylesHost);
  let styles: Array<string> = sharedStylesHost.getAllStyles();

  // TODO: we need a better way to manage data serialized data for server/client
  // let http = appRef.injector.getOptional(Http);
  // let cache = isPresent(http) ? arrayFlattenTree(http._rootNode.children, []) : null;

  let serializedApp: string = serializeApplication(element, styles);
  // return stringifyElement(element);
  return serializedApp;
}

export function renderToString(AppComponent: any, serverProviders?: any): Promise<string> {
  return bootstrap(AppComponent, serverProviders)
    .then(appRef => {
      return new Promise(resolve => {
        setTimeout(() => {
          let html = appRefSyncRender(appRef);
          appRef.dispose();
          resolve(html);
        });
      });
      // let http = appRef.injector.getOptional(Http);
      // // TODO: fix zone.js ensure overrideOnEventDone callback when there are no pending tasks
      // // ensure all xhr calls are done
      // return new Promise(resolve => {
      //   let ngZone = appRef.injector.get(NgZone);
      //   // ngZone
      //   ngZone.overrideOnEventDone(() => {
      //     if (isBlank(http) || isBlank(http._async) || http._async <= 0) {
      //       let html: string = appRefSyncRender(appRef);
      //       appRef.dispose();
      //       resolve(html);
      //     }

      //   }, true);

      // });

    });
}


export function renderToStringWithPreboot(AppComponent: any, serverProviders?: any, prebootConfig: any = {}): Promise<string> {
  return renderToString(AppComponent, serverProviders)
    .then((html: string) => {
      if (typeof prebootConfig === 'boolean' && prebootConfig === false) { return html }
      let config = prebootConfigDefault(prebootConfig);
      return getClientCode(config)
        .then(code => html + createPrebootHTML(code, config));
    });
}
