import './polyfills.node';

// import {Parse5DomAdapter} from '@angular/platform-server/src/parse5_adapter';
// Parse5DomAdapter.makeCurrent();

import {ComponentRef} from '@angular/core';

import {DomSharedStylesHost} from '@angular/platform-browser/src/dom/shared_styles_host';

import {DOCUMENT} from '@angular/platform-browser/src/dom/dom_tokens';
import {bootstrap} from '@angular/platform-node-dynamic';


import {
  serializeDocument,
  parseDocument,
} from '@angular/platform-node';


import {App} from './app';


const document = `
<!doctype html>
<html lang="en">
  <head>
    <title>Universal</title>
  </head>
  <body>

    <app>
      Loading...
    <app>

  </body>
</html>
`;


export function main() {
  return bootstrap(App, [
      {
        provide: DOCUMENT,
        useFactory: (domSharedStylesHost: DomSharedStylesHost) => {
          var doc: any = parseDocument(document);
          domSharedStylesHost.addHost(doc.head);
          return doc;
        },
        deps: [DomSharedStylesHost]
      }
    ])
    .then((cmpRef: ComponentRef<App>) => {
      let document = cmpRef.injector.get(DOCUMENT);
      return serializeDocument(document, true);
    });
};


main()
  .then(html => {
    console.log('\nPRERENDER HTML\n\n' + html + '\n');
  });
//
