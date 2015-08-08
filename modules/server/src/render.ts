/// <reference path="../typings/tsd.d.ts" />

// server version
import {bootstrap} from './bootstrap-server';
//
export {bootstrap};

import {selectorRegExpFactory} from './helper';

import {serverInjectables} from './server_dom_renderer';


import {stringifyElement} from './stringifyElement';


import {DOM} from 'angular2/src/dom/dom_adapter';
import {DirectiveResolver} from 'angular2/core';

// maintain stateless Injector/document and directiveResolver
var serverDocument = DOM.createHtmlDocument();
var serverInjector = undefined; // js defaults only work with undefined
var serverDirectiveResolver = new DirectiveResolver();

export function render(clientHtml, AppComponent, serverBindings: any = []) {
  let annotations = serverDirectiveResolver.resolve(AppComponent);
  let selector = annotations.selector;

  let el = DOM.createElement(selector, serverDocument);
  DOM.appendChild(serverDocument.body, el);

  let renderBindings: Array<any> = [
    serverInjectables
  ].concat(serverBindings);

  return bootstrap(
    AppComponent,
    serverInjector,
    serverDocument,
    renderBindings
  )
  .then(appRef => {

    // save a reference to appInjector
    // TODO: refactor out
    if (!serverInjector && appRef.injector) {
      serverInjector = appRef.injector;
    }

    // change detection
    appRef.changeDetection.detectChanges();

    // grab parse5 html element or default to the one we provided
    let element = appRef.hostElementRef.nativeElement || el;
    // serialize html
    let serializedCmp = stringifyElement(element);

    // selector replacer explained here
    // https://gist.github.com/gdi2290/c74afd9898d2279fef9f
    // replace our component with serialized version
    let rendered = clientHtml.replace(
      // <selector></selector>
      selectorRegExpFactory(selector),
      // <selector>{{ serializedCmp }}</selector>
      serializedCmp
    );

    // destroy appComponent
    // remove from serverDom (should be handled by appRef.dispose already)
    appRef.dispose();
    // DOM.removeChild(serverDocument.body, el);

    // return rendered version of our serialized component
    return rendered;
  })
  .catch(err => {
    console.error(err);
    console.error(err.stack);
    return clientHtml;
  });
}
