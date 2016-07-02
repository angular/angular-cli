import './polyfills.node';

// import {Parse5DomAdapter} from '@angular/platform-server/src/parse5_adapter';
// Parse5DomAdapter.makeCurrent();

import {ComponentRef} from '@angular/core';

import {bootstrap} from '@angular/platform-node-dynamic';

import {provideDocument, serializeDocument, DOCUMENT} from '@angular/universal';

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
      provideDocument(document)
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
