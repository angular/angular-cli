/// <reference path="../typings/tsd.d.ts" />
import './server_patch';

// server version
import {bootstrap} from './bootstrap-server';
//
export {bootstrap};

import {
  getHostElementRef,
  selectorRegExpFactory,
  showDebug
} from './helper';

import {stringifyElement} from './stringifyElement';


import {DOM} from 'angular2/src/dom/dom_adapter';
import {DirectiveResolver} from 'angular2/core';

// Maintain stateless Injector/document and directiveResolver
var serverInjector = undefined; // js defaults only work with undefined
var serverDocument = DOM.createHtmlDocument();
var serverDirectiveResolver = new DirectiveResolver();
var prebootScript = `
  <link rel="stylesheet" type="text/css" href="/css/preboot.css">
  <script src="/lib/preboot.js"></script>
  <script>preboot.start()</script>
`;

export function render(content, AppComponent, options) {
  if (options.clientOnly) {
    return Promise.resolve(content.toString());
  }

  let annotations = serverDirectiveResolver.resolve(AppComponent);
  let selector = annotations.selector;

  let el = DOM.createElement(selector, serverDocument);
  DOM.appendChild(serverDocument.body, el);

  let serverBindings: Array<any> = [].concat(options.bindings || [], [
  ]);

  return bootstrap(
    AppComponent,
    serverInjector,
    serverDocument,
    serverBindings
  )
  .then(appRef => {

    // save a reference to app Injector
    if (!serverInjector && appRef.injector) {
      serverInjector = appRef.injector;
    }

    // change detection
    appRef.changeDetection.detectChanges();

    // grab parse5 html element
    let element = appRef.hostElementRef.nativeElement;

    // serialize html
    let serializedCmp = stringifyElement(element || el);

    // selector replacer explained here
    // https://gist.github.com/gdi2290/c74afd9898d2279fef9f
    // replace our component with serialized version
    let rendered = content.toString().replace(
      // <selector></selector>
      selectorRegExpFactory(selector),
      // <selector>{{ serializedCmp }}</selector>
      serializedCmp +/* + showDebug(appRef.hostComponent)*/
      prebootScript
    );

    // destroy appComponent
    appRef.dispose();

    // remove from serverDom
    DOM.removeChild(serverDocument.body, el);

    // return rendered version of our serialized component
    return rendered;
  });
}
