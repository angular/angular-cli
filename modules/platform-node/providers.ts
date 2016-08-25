import {DomSharedStylesHost} from '@angular/platform-browser/src/dom/shared_styles_host';
import {DOCUMENT} from '@angular/platform-browser/src/dom/dom_tokens';
import {APP_ID} from '@angular/core';
import {_appIdRandomProviderFactory, parseDocument} from '@angular/platform-node';
import { NODE_APP_ID } from './tokens';

export const _COMPONENT_ID = '%COMP%';

export function provideUniversalAppId (id?: string): Array<any> {
  var appIdFactory = _appIdRandomProviderFactory;
  if (id) {
    appIdFactory = () => id;
  }
  return [
    { provide: NODE_APP_ID, useFactory: appIdFactory, deps: [] },
    { provide: APP_ID, useValue: _COMPONENT_ID}
  ];
}

export function provideDocument (document: string): Array<any> {
  const DOC: any = {
    provide: DOCUMENT,
    useFactory: (domSharedStylesHost: DomSharedStylesHost) => {
      var doc: any = parseDocument(document);
      domSharedStylesHost.addHost(doc.head);
      return doc;
    },
    deps: [ DomSharedStylesHost ]
  }

  return [
    DOC
  ];
}
