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

// maintain stateless Injector/document and directiveResolver
var serverInjector = undefined; // js defaults only work with undefined
var serverDocument = DOM.createHtmlDocument();
var serverDirectiveResolver = new DirectiveResolver();

// TODO: build from preboot config
// consider declarative config via <preboot minify="true"></preboot>
var prebootScript = `
  <link rel="stylesheet" type="text/css" href="/preboot/preboot.css">
  <script src="/preboot/preboot.js"></script>
  <script>preboot.start()</script>
`;
// Inject Angular for the developer
var angularScript = `
  <!-- Browser polyfills -->
  <script src="/bower_components/traceur-runtime/traceur-runtime.min.js"></script>
  <!-- SystemJS -->
  <script src="/bower_components/system.js/dist/system.js"></script>
  <!-- Angular2: Bundle -->
  <script src="/web_modules/angular2.dev.js"></script>
  <script src="/web_modules/router.dev.js"></script>
  <script type="text/javascript">
    System.config({
      "baseURL": "/",
      "defaultJSExtensions": true,
      "map": {
        "*": "*.js",
        "angular2": "node_modules/angular2",
        "rx": "node_modules/rx/dist/rx.min"
      },
      'meta': {
        // auto-detection fails to detect properly
        "rx": {
          "format": "cjs" //https://github.com/systemjs/builder/issues/123
        }
      }
    });
  </script>
`;

export function render(content, AppComponent, options: any = {}) {
  if (options.client === false) {
    return Promise.resolve(content.toString());
  }
  options.scripts = options.scripts || {};

  let annotations = serverDirectiveResolver.resolve(AppComponent);
  let selector = annotations.selector;

  let el = DOM.createElement(selector, serverDocument);
  DOM.appendChild(serverDocument.body, el);

  let serverBindings: Array<any> = [].concat(options.serverInjector || [], [

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

    // inject prebppt and angular scripts tags
    let scripts = (options.scripts === false ? '' : (
        (options.scripts.preboot === true ? prebootScript : '') +
        (options.scripts.angular === true ? angularScript : '')
      )
    );

    let htmlString = content.toString();
    // selector replacer explained here
    // https://gist.github.com/gdi2290/c74afd9898d2279fef9f
    // replace our component with serialized version
    let rendered = htmlString.replace(
      // <selector></selector>
      selectorRegExpFactory(selector),
      // <selector>{{ serializedCmp }}</selector>
      serializedCmp + /* + showDebug(appRef.hostComponent)*/
      scripts
    );

    // destroy appComponent
    appRef.dispose();

    // remove from serverDom
    DOM.removeChild(serverDocument.body, el);

    // return rendered version of our serialized component
    return rendered;
  });
}
