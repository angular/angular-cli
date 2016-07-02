import './polyfills';

// import {Parse5DomAdapter} from '@angular/platform-server/src/parse5_adapter';
// Parse5DomAdapter.makeCurrent();

import {ComponentRef} from '@angular/core';

import {DomSharedStylesHost, SharedStylesHost} from '@angular/platform-browser/src/dom/shared_styles_host';
import {DomRootRenderer} from '@angular/platform-browser/src/dom/dom_renderer';
import {RootRenderer} from '@angular/core/src/render/api';

import {AnimationDriver, NoOpAnimationDriver} from '@angular/core/src/animation/animation_driver';
import {WebAnimationsDriver} from '@angular/platform-browser/src/dom/web_animations_driver';

import {DOCUMENT} from '@angular/platform-browser/src/dom/dom_tokens';
import {BROWSER_APP_COMPILER_PROVIDERS} from '@angular/platform-browser-dynamic';
import {BROWSER_APP_PROVIDERS} from '@angular/platform-browser';

import {serverBootstrap} from '@angular/platform-server';


import {
  serializeDocument,
  parseDocument,
  NodeDomRootRenderer_,
  NodeSharedStylesHost
} from './platform-node';

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
  return serverBootstrap(App, [
      BROWSER_APP_PROVIDERS,
      BROWSER_APP_COMPILER_PROVIDERS,
      {
        provide: DOCUMENT,
        useFactory: (domSharedStylesHost: DomSharedStylesHost) => {
          var doc: any = parseDocument(document);
          domSharedStylesHost.addHost(doc.head);
          return doc;
        },
        deps: [DomSharedStylesHost]
      },
      {provide: AnimationDriver, useFactory: NoOpAnimationDriver},
      {provide: WebAnimationsDriver, useExisting: AnimationDriver},

      {provide: DomRootRenderer, useClass: NodeDomRootRenderer_},
      {provide: RootRenderer, useExisting: DomRootRenderer},

      NodeSharedStylesHost,
      {provide: SharedStylesHost, useExisting: NodeSharedStylesHost},
      {provide: DomSharedStylesHost, useExisting: NodeSharedStylesHost},


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
