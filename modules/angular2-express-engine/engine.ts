import '../universal/server/src/server_patch';
import * as fs from 'fs';
import {selectorRegExpFactory} from '../universal/server/src/helper';


import {
  renderToString,
  renderToStringWithPreboot,
  selectorResolver
} from '../universal/server/src/render';

export interface engineOptions {
  App: Function;
  providers?: Array<any>;
  preboot?: Object | any;
  selector?: string;
  serializedCmp?: string;
  server?: boolean;
  client?: boolean;
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

export function ng2engine(filePath: string, options: engineOptions, done: Function) {
  // defaults
  options = options || <engineOptions>{};
  options.providers = options.providers || null;

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

      // bootstrap and render component to string
      var renderPromise: any = renderToString;
      var args = [options.App, options.providers];
      if (options.preboot) {
        renderPromise = renderToStringWithPreboot;
        args.push(options.preboot);
      }

      renderPromise(...args)
        .then(serializedCmp => {

          let selector: string = selectorResolver(options.App);

          // selector replacer explained here
          // https://gist.github.com/gdi2290/c74afd9898d2279fef9f
          // replace our component with serialized version
          let rendered: string = clientHtml.replace(
            // <selector></selector>
            selectorRegExpFactory(selector),
            // <selector>{{ serializedCmp }}</selector>
            serializedCmp
            // TODO: serializedData
          );

          done(null, buildClientScripts(rendered, options));
        })
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

export const ng2engineWithPreboot = ng2engine;

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
