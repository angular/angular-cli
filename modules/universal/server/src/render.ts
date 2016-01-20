import {bootstrap} from './platform/node';

import {
  selectorRegExpFactory,
  arrayFlattenTree
} from './helper';
import {stringifyElement} from './stringifyElement';


import {
  prebootConfigDefault,
  getPrebootCSS,
  createPrebootHTML
} from './ng_preboot';

import {getClientCode} from 'preboot';


import {isBlank, isPresent} from 'angular2/src/facade/lang';

import {SharedStylesHost} from 'angular2/src/platform/dom/shared_styles_host';

import {NgZone, DirectiveResolver, ComponentRef} from 'angular2/core';
import {Http} from 'angular2/http';
import {Router} from 'angular2/router';

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
  let serializedData: string = isBlank(cache) ? '' : ''+
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

  let serializedApp: string = serializeApplication(element, styles);

  return serializedApp;
}

export function renderToString(AppComponent: any, serverProviders?: any): Promise<string> {
  return bootstrap(AppComponent, serverProviders)
    .then((appRef: ComponentRef) => {
      let injector = appRef.injector;
      let router = injector.getOptional(Router);

      return Promise.resolve(router && router._currentNavigation)
        .then(() => new Promise(resolve => setTimeout(() => resolve(appRef))));
    })
    .then((appRef: ComponentRef) => {
      let html = appRefSyncRender(appRef);
      appRef.dispose();
      return html;
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
