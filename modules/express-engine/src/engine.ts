import * as fs from 'fs';
import {DOCUMENT} from 'angular2/src/platform/dom/dom_tokens';
import {DOM} from 'angular2/src/platform/dom/dom_adapter';

import {
  renderToString,
  applicationToString,
  selectorResolver,
  selectorRegExpFactory,
  renderToStringWithPreboot,
  serializeDocument,
  parseDocument,
  parseFragment,
  addPrebootHtml,
  Bootloader
} from 'angular2-universal-preview';

export interface engineOptions {
  directives: Array<any>;
  providers?: Array<any>;
  preboot?: Object | any;
  bootloader?: any;
  selector?: string;
  serializedCmp?: string;
  server?: boolean;
  client?: boolean;
  componentProviders?: any;
  platformProviders?: any;
}

const prebootScript: string = `
  <preboot>
    <link rel="stylesheet" type="text/css" href="/preboot/preboot.css">
    <script src="/preboot/preboot.js"></script>
    <script>preboot.start()</script>
  </preboot>
`;

const angularScript: string = `
  <!-- Browser polyfills -->
  <script src="/node_modules/es6-shim/es6-shim.min.js"></script>
  <script src="/node_modules/systemjs/dist/system-polyfills.js"></script>
  <script src="/node_modules/angular2/bundles/angular2-polyfills.min.js"></script>
  <!-- SystemJS -->
  <script src="/node_modules/systemjs/dist/system.js"></script>
  <!-- Angular2: Bundle -->
  <script src="/node_modules/rxjs/bundles/Rx.js"></script>
  <script src="/node_modules/angular2/bundles/angular2.dev.js"></script>
  <script src="/node_modules/angular2/bundles/router.dev.js"></script>
  <script src="/node_modules/angular2/bundles/http.dev.js"></script>
  <script type="text/javascript">
    System.config({
      "baseURL": "/",
      "defaultJSExtensions": true
    });
  </script>
`;

const bootstrapButton: string = `
  <div id="bootstrapButton">
    <style>
     #bootstrapButton {
      z-index:999999999;
      position: absolute;
      background-color: rgb(255, 255, 255);
      padding: 0.5em;
      border-radius: 3px;
      border: 1px solid rgb(207, 206, 206);
     }
    </style>
    <button onclick="bootstrap()">
      Bootstrap Angular2 Client
    </button>
  </div>
`;

var bootstrapApp = `
  <script>
    setTimeout(function() {
      bootstrap();
    });
  </script>
`;

function bootstrapFunction(appUrl: string): string {
  return `
  <script>
    function bootstrap() {
      if (this.bootstraped) return;
      this.bootstraped = true;
      System.import("${ appUrl }")
        .then(function(module) {
          return module.main();
        })
        .then(function() {
          preboot.complete();
          var $bootstrapButton = document.getElementById("bootstrapButton");
          if ($bootstrapButton) { $bootstrapButton.remove(); }
        });
    }
  </script>
`;
};

// TODO: find better ways to configure the App initial state
// to pay off this technical debt
// currently checking for explicit values
function buildClientScripts(html: string, options: any): string {
  return html
    .replace(
      selectorRegExpFactory('preboot'),
      ((options.preboot === false) ? '' : prebootScript)
    )
    .replace(
      selectorRegExpFactory('angular'),
      ((options.angular === false) ? '' : angularScript)
    )
    .replace(
      selectorRegExpFactory('bootstrap'),
      ((options.bootstrap === false) ? (
        bootstrapButton +
        bootstrapFunction(options.componentUrl)
      ) : (
        (
          (options.client === undefined || options.server === undefined) ?
          '' : (options.client === false) ? '' : bootstrapButton
        ) +
        bootstrapFunction(options.componentUrl) +
        ((options.client === false) ? '' : bootstrapApp)
      ))
    );
}

export function expressEngine(filePath: string, options: engineOptions, done: Function) {
  // defaults
  options = options || <engineOptions>{};
  options.providers = options.providers || undefined;
  options.preboot   = options.preboot   || undefined;

  if ('App' in options) {
    throw new Error('Please provide an `directives` property with your Angular 2 application rather than `App`');
  }

  if (!('directives' in options)) {
    throw new Error('Please provide an `directives` property with your Angular 2 application');
  }

  // read file on disk
  try {
    fs.readFile(filePath, (err, content) => {

      if (err) { return done(err); }

      // convert to string
      const clientHtml: string = content.toString();

      // TODO: better build scripts abstraction
      if (options.server === false && options.client === false) {
        return done(null, clientHtml);
      }
      if (options.server === false && options.client !== false) {
        return done(null, buildClientScripts(clientHtml, options));
      }

      // bootstrap and render component to string
      var bootloader = options.bootloader;
      if (!options.bootloader) {
        options.bootloader = {
          document: parseDocument(clientHtml),
          providers: options.providers,
          componentProviders: options.componentProviders,
          platformProviders: options.platformProviders,
          directives: options.directives,
          preboot: options.preboot
        };
      }
      bootloader = Bootloader.create(options.bootloader);

      bootloader.serializeApplication()
        .then(html => done(null, buildClientScripts(html, options)))
        .catch(e => {
          console.log(e.stack);
          // if server fail then return client html
          done(null, buildClientScripts(clientHtml, options));
        });
    });
  } catch (e) {
    done(e);
  }
};

export function ng2engine(...args) {
  console.warn('DEPRECATION WARNING: `ng2engine` is no longer supported and will be removed in next release. use `expressEngine`');
  return expressEngine(...args);
};

export function ng2Engine(...args) {
  console.warn('DEPRECATION WARNING: `ng2Engine` is no longer supported and will be removed in next release. use `expressEngine`');
  return expressEngine(...args);
};
export function ng2ExpressEngine(...args) {
  console.warn('DEPRECATION WARNING: `ng2ExpressEngine` is no longer supported and will be removed in next release. use `expressEngine`');
  return expressEngine(...args);
};

export function simpleReplace(filePath: string, options: engineOptions, done: Function) {
  // defaults
  options = options || <engineOptions>{};

  // read file on disk
  try {
    fs.readFile(filePath, (err, content) => {

      if (err) { return done(err); }

      // convert to string
      var clientHtml: string = content.toString();

      // TODO: better build scripts abstraction
      if (options.server === false && options.client === false) {
        return done(null, clientHtml);
      }
      if (options.server === false && options.client !== false) {
        return done(null, buildClientScripts(clientHtml, options));
      }
      // selector replacer explained here
      // https://gist.github.com/gdi2290/c74afd9898d2279fef9f
      // replace our component with serialized version

      let rendered: string = clientHtml.replace(
        // <selector></selector>
        selectorRegExpFactory(options.selector),
        // <selector>{{ serializedCmp }}</selector>
        options.serializedCmp
      );

      done(null, buildClientScripts(rendered, options));
    });
  } catch (e) {
    done(e);
  }
}
