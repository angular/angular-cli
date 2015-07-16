/// <reference path="../typings/tsd.d.ts" />
import './server_patch';

// server version
import {bootstrap} from './bootstrap-server';
//
export {bootstrap};

import {selectorRegExpFactory, showDebug} from './helper';

import {
  prebootScript,
  angularScript,
  bootstrapButton,
  bootstrapFunction,
  bootstrapApp
} from './build_scripts';

import {stringifyElement} from './stringifyElement';


import {DOM} from 'angular2/src/dom/dom_adapter';
import {DirectiveResolver} from 'angular2/core';

// maintain stateless Injector/document and directiveResolver
var serverDocument = DOM.createHtmlDocument();
var serverInjector = undefined; // js defaults only work with undefined
var serverDirectiveResolver = new DirectiveResolver();

export function render(content, AppComponent, options: any = {}) {
  if (options.server === false) { return Promise.resolve(content.toString()); }
  options.scripts = options.scripts || {};
  options.serverInjector = options.serverInjector || [];

  let annotations = serverDirectiveResolver.resolve(AppComponent);
  let selector = annotations.selector;

  let el = DOM.createElement(selector, serverDocument);
  DOM.appendChild(serverDocument.body, el);

  let renderBindings: Array<any> = [
    // any special server
  ];

  let serverBindings: Array<any> = [].concat(renderBindings, options.serverInjector);

  return bootstrap(
    AppComponent,
    serverInjector,
    serverDocument,
    serverBindings
  )
  .then(appRef => {

    // save a reference to appInjector
    if (!serverInjector && appRef.injector) {
      serverInjector = appRef.injector;
    }

    // change detection
    appRef.changeDetection.detectChanges();

    // grab parse5 html element or default to the one we provided
    let element = appRef.hostElementRef.nativeElement || el;
    // serialize html
    let serializedCmp = stringifyElement(element);

    let htmlString = content.toString();
    // selector replacer explained here
    // https://gist.github.com/gdi2290/c74afd9898d2279fef9f
    // replace our component with serialized version
    let rendered = htmlString.
      replace(
        // <selector></selector>
        selectorRegExpFactory(selector),
        // <selector>{{ serializedCmp }}</selector>
        serializedCmp
      ).
      replace(
        selectorRegExpFactory('preboot'),
        prebootScript
      ).
      replace(
        selectorRegExpFactory('angular'),
        '$1'+angularScript+'$3'
      ).
      replace(
        selectorRegExpFactory('bootstrap'),
        '$1' +
        bootstrapButton +
        bootstrapFunction(options.componentUrl) +
        ((options.client === false) ? '' : bootstrapApp) +
        '$3'
      );

    // destroy appComponent
    // remove from serverDom (should be handled by appRef.dispose already)
    appRef.dispose();
    // DOM.removeChild(serverDocument.body, el);

    // return rendered version of our serialized component
    return rendered;
  });
}
