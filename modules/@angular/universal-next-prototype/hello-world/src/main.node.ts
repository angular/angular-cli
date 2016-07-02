import {ComponentRef} from '@angular/core';

import {
  bootstrap,
  serializeDocument,
  DOCUMENT,
  provideDocument
} from '@angular/universal';

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


