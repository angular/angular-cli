/// <reference path="../typings/tsd.d.ts" />

// server version
import {bootstrap, ApplicationRef} from './bootstrap-server';
//
export {bootstrap};

import {selectorRegExpFactory} from './helper';

import {SERVER_DOM_RENDERER_BINDINGS} from './server_dom_renderer';


import {stringifyElement} from './stringifyElement';

import {getClientCode} from '../../preboot/server';


import {isBlank, isPresent} from 'angular2/src/core/facade/lang';
import {DOM} from 'angular2/src/core/dom/dom_adapter';
import {DirectiveResolver} from 'angular2/src/core/compiler/directive_resolver';
import {bind} from 'angular2/di';
import {
  DOCUMENT,
  DOM_REFLECT_PROPERTIES_AS_ATTRIBUTES
} from 'angular2/src/core/render/render';
import {APP_COMPONENT} from 'angular2/src/core/application_tokens';

// TODO: maintain stateless Injector/document and directiveResolver
var serverInjector = undefined; // js defaults only work with undefined

export var serverDirectiveResolver = new DirectiveResolver();

export function selectorResolver(Component): string {
  return serverDirectiveResolver.resolve(Component).selector;
}


export function applicationToString(appRef): string {
  // grab parse5 html element or default to the one we provided
  let element = appRef.hostElementRef.nativeElement;
  let serializedCmp = stringifyElement(element);
  return serializedCmp;
}


export function bootstrapServer(AppComponent, serverBindings: any = [], serverInjector: any = null, serverDocument: any = null) {

  // create server document with top level component
  if (isBlank(serverDocument)) {
    // 1ms
    serverDocument = DOM.createHtmlDocument();
    let selector = selectorResolver(AppComponent);
    let el = DOM.createElement(selector, serverDocument);
    DOM.appendChild(serverDocument.body, el);
  }

  let renderBindings = [
    bind(DOCUMENT).toValue(serverDocument),
    bind(APP_COMPONENT).toValue(AppComponent),
    SERVER_DOM_RENDERER_BINDINGS
  ].
  concat(serverBindings);

  return bootstrap(AppComponent, renderBindings, serverInjector, serverDocument).
    then(appRef => {
      // save a reference to appInjector
      // TODO: refactor into appRef
      if (isBlank(serverInjector) && isPresent(appRef.injector)) {
        serverInjector = appRef.injector;
      }

      return appRef;
    });


}

export function renderToString(AppComponent, serverBindings: any = [], serverDocument: any = null) {
  return bootstrapServer(AppComponent, serverBindings, serverDocument).
    then(appRef => {

      // change detection
      appRef.lifecycle.tick();

      // TODO: we need a better way to manage the style host for server/client
      // serialize all style hosts
      let styles = appRef.sharedStylesHost.getAllStyles();
      let serializedStyleHosts = styles.length >= 1 ? '<style>' + styles.join('\n') + '</style>' : '';

      // serialize Top Level Component
      let serializedCmp = applicationToString(appRef);

      // destroy appComponent
      // remove from serverDom (should be handled by appRef.dispose already)
      appRef.dispose();

      // return rendered version of our serialized component
      return serializedStyleHosts + serializedCmp;
    });
}


export function renderToStringWithPreboot(AppComponent, serverBindings: any = [], prebootConfig: any = {}, serverDocument: any = null) {
  return renderToString(AppComponent, serverBindings, serverDocument).
    then(html => {
      if (!prebootConfig) {
        return html
      }
      return getClientCode(prebootConfig).then(code => {
        let preboot_styles = `
        <style>
        ${ getPrebootCSS() }
        </style>
        `;
        let preboot = `
        <script>
        ${ code }
        </script>
        `;
        if (prebootConfig.start === true) {
          preboot += '<script>\npreboot.start();\n</script>';
        }
        return html + preboot_styles + preboot;
      });
    });
}


function getPrebootCSS() {
  return `
.preboot-overlay {
    background: grey;
    opacity: .27;
}

@keyframes spin {
    to { transform: rotate(1turn); }
}

.preboot-spinner {
    position: relative;
    display: inline-block;
    width: 5em;
    height: 5em;
    margin: 0 .5em;
    font-size: 12px;
    text-indent: 999em;
    overflow: hidden;
    animation: spin 1s infinite steps(8);
}

.preboot-spinner.small {
    font-size: 6px;
}

.preboot-spinner.large {
    font-size: 24px;
}

.preboot-spinner:before,
.preboot-spinner:after,
.preboot-spinner > div:before,
.preboot-spinner > div:after {
    content: '';
    position: absolute;
    top: 0;
    left: 2.25em; /* (container width - part width)/2  */
    width: .5em;
    height: 1.5em;
    border-radius: .2em;
    background: #eee;
    box-shadow: 0 3.5em #eee; /* container height - part height */
    transform-origin: 50% 2.5em; /* container height / 2 */
}

.preboot-spinner:before {
    background: #555;
}

.preboot-spinner:after {
    transform: rotate(-45deg);
    background: #777;
}

.preboot-spinner > div:before {
    transform: rotate(-90deg);
    background: #999;
}

.preboot-spinner > div:after {
    transform: rotate(-135deg);
    background: #bbb;
}
`
}
