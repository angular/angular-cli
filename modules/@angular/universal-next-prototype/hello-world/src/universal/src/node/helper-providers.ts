import {DomSharedStylesHost} from '@angular/platform-browser/src/dom/shared_styles_host';
import {DOCUMENT} from '@angular/platform-browser/src/dom/dom_tokens';

import {parseDocument} from '@angular/platform-node';


export function provideDocument (document: string): Array<any> {
  const DOC: any = {
    provide: DOCUMENT,
    useFactory: (domSharedStylesHost: DomSharedStylesHost) => {
      var doc: any = parseDocument(document);
      domSharedStylesHost.addHost(doc.head);
      return doc;
    },
    deps: [DomSharedStylesHost]
  }

  return [
    DOC
  ];
}
