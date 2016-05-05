import {
  bootstrap,
  buildReflector,
  buildNodeProviders,
  buildNodeAppProviders
} from './platform/node';
import {DOCUMENT} from '@angular/platform-browser';
import {parseDocument, serializeDocument} from './platform/document';

import {
  selectorRegExpFactory,
  arrayFlattenTree,
  selectorResolver
} from './helper';
import {stringifyElement} from './stringify_element';

import {
  prebootConfigDefault,
  getPrebootCSS,
  createPrebootCode
} from './ng_preboot';

import {isBlank, isPresent} from '@angular/core/src/facade/lang';

import {SharedStylesHost} from '@angular/platform-browser/src/dom/shared_styles_host';

import {NgZone, ComponentRef, Provider, Type} from '@angular/core';
import {Http} from '@angular/http';
import {Router} from '@angular/router-deprecated';



export function waitRouter(appRef: ComponentRef<any>): Promise<ComponentRef<any>> {
  let injector = appRef.injector;
  let router = injector.get(Router, Router);

  return Promise.resolve(router && router._currentNavigation)
    .then(() => new Promise(resolve => setTimeout(() => resolve(appRef))));
}

export function renderDocument(
    documentHtml: string,
    componentType: Type,
    nodeProviders?: any): Promise<string> {

  return bootstrap(componentType, [
    ...nodeProviders,
    new Provider(DOCUMENT, { useValue: parseDocument(documentHtml) })
  ])
  .then(waitRouter)
  .then((appRef: ComponentRef<any>) => {
    let injector = appRef.injector;
    let document = injector.get(DOCUMENT);

    return serializeDocument(document);
  });
}

export function renderDocumentWithPreboot(
  documentHtml: string,
  componentType: Type,
  nodeProviders?: any,
  prebootConfig: any = {}): Promise<string> {

  return renderDocument(documentHtml, componentType, nodeProviders)
    .then(html => createPrebootCode(componentType, prebootConfig).then(code => html + code));
}


export function serializeApplication(element: any, styles: string[], cache?: any): string {
  // serialize all style hosts
  let serializedStyleHosts: string = styles.length >= 1 ? '<style>' + styles.join('\n') + '</style>' : '';

  // serialize Top Level Component
  let serializedCmp: string = stringifyElement(element);

  // serialize App Data
  let serializedData: string = isBlank(cache) ? '' : '' +
    '<script>' +
    'window.' + 'ngPreloadCache' + ' = ' +  JSON.stringify(cache, null, 2) +
    '</script>' +
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


export function applicationToString(appRef: ComponentRef<any>): string {
  let html = appRefSyncRender(appRef);
  appRef.destroy();
  return html;
}



export function renderToString(componentType: any, nodeProviders?: any): Promise<string> {
  console.warn('DEPRECATION WARNING: `renderToString` is no longer supported and will be removed in next release.');
  return bootstrap(componentType, nodeProviders)
    .then(applicationToString);
}

export function renderToStringWithPreboot(componentType: any, nodeProviders?: any, prebootConfig: any = {}): Promise<string> {
  console.warn('DEPRECATION WARNING: `renderToStringWithPreboot` is no longer supported and will be removed in next release.');
  return renderToString(componentType, nodeProviders)
    .then(html => createPrebootCode(componentType, prebootConfig).then(code => html + code));
}
