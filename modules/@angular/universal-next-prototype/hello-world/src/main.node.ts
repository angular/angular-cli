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
    <title>Angular Universal</title>
    <meta charset="UTF-8">
    <meta name="description" content="Angular 2 Universal">
    <meta name="keywords" content="Angular 2,Universal">
    <meta name="author" content="PatrickJS">

    <link rel="icon" href="data:;base64,iVBORw0KGgo=">

    <base href="/">
  </head>
  <body>

    <app>
      Loading...
    <app>

  </body>
</html>
`;


export function main(providers = []) {
  return bootstrap(App, [
      ...providers
    ], document)
    .then((componentRef: ComponentRef<App>) => {
      let document = componentRef.injector.get(DOCUMENT);
      return {
        componentRef,
        html: serializeDocument(document, true)
      };
    });
};


