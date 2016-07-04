import {ComponentRef, ApplicationRef} from '@angular/core';

import {
  bootstrap,
  serializeDocument,
  DOCUMENT,
  provideDocument,
  ORIGIN_URL,
  REQUEST_URL,
  BASE_URL
} from '@angular/universal';
import {App, APP_PROVIDERS} from './app';


// const document = ;
// enableProdMode();


export function main(providers = []) {
  return bootstrap(App, [
      ...provideDocument(`
      <!doctype html>
      <html lang="en">
        <head>
          <title>Angular Universal</title>
          <meta charset="UTF-8">
          <meta name="description" content="Angular 2 Universal">
          <meta name="keywords" content="Angular 2,Universal">
          <meta name="author" content="PatrickJS">

          <link rel="icon" href="data:;base64,iVBORw0KGgo=">
          <link rel="stylesheet" src="yolo.css">
          <style>
            #wat {

            }
          </style>

          <base href="/">
        </head>
        <body>
          <h1 id="wat">${Math.random()}</h1>

          <app>
            Loading...
          </app>

          <script src="dist/public/browser-bundle.js"></script>

        </body>
      </html>
      `),
      ...providers,
      {provide: ORIGIN_URL, useValue: 'http://127.0.0.1:3000/'},
      {provide: REQUEST_URL, useValue: '/'},
      {provide: BASE_URL, useValue: '/'},
      ...APP_PROVIDERS

    ])
    .then((componentRef: ComponentRef<App>) => {
      let applicationRef = componentRef.injector.get(ApplicationRef);
      let document = componentRef.injector.get(DOCUMENT);
      return {
        componentRef,
        applicationRef,
        serializeDocument() {
          let doc = serializeDocument(document, true);
          applicationRef = null;
          document = null
          return doc;
        }
      };
    });
};


