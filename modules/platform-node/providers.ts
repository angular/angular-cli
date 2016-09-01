// PRIVATE
import { getDOM } from './__private_imports__';
// PRIVATE


import { DOCUMENT } from '@angular/platform-browser';
import { APP_ID } from '@angular/core';
import { parseDocument } from './node-document';
import { NodeSharedStylesHost } from './node-shared-styles-host'
import { NODE_APP_ID } from './tokens';
import { _appIdRandomProviderFactory } from './helper';

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
    useFactory: (domSharedStylesHost: NodeSharedStylesHost) => {
      var doc: any = parseDocument(document);
      domSharedStylesHost.addHost(doc.head);
      return doc;
    },
    deps: [ NodeSharedStylesHost ]
  };

  return [
    DOC
  ];
}
