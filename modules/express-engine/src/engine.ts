import * as fs from 'fs';
import {DOCUMENT} from 'angular2/platform/common_dom';

import {selectorRegExpFactory, Bootloader, BootloaderConfig} from 'angular2-universal';


export interface ExpressEngineExtraOptions {
  server?: boolean;
  client?: boolean;
  selector?: string;
  serializedCmp?: string;
  bootloader?: any;
  reuseProviders?: boolean;
}

export type ExpressEngineConfig = BootloaderConfig & ExpressEngineExtraOptions;

export var EXPRESS_PLATFORM = null;

export function disposeExpressPlatform() {
  EXPRESS_PLATFORM = null;
}

export function expressEngine(filePath: string, options?: ExpressEngineConfig, done?: Function) {
  // defaults
  options = options || <ExpressEngineConfig>{};
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
      const _options = options;
      if (!EXPRESS_PLATFORM) {
        const _template = clientHtml;
        const _Bootloader = Bootloader;
        let bootloader = _options.bootloader;
        if (_options.bootloader) {
          bootloader = _Bootloader.create(_options.bootloader);
        } else {
          let doc = _Bootloader.parseDocument(_template);
          _options.document = doc;
          _options.template = _options.template || _template;
          bootloader = _Bootloader.create(_options);
        }
        EXPRESS_PLATFORM = bootloader;
      }

      EXPRESS_PLATFORM.serializeApplication(null, _options.reuseProviders === false ? null : _options.providers)
        .then(html => done(null, buildClientScripts(html, options)))
        .catch(e => {
          console.error(e.stack);
          // if server fail then return client html
          done(null, buildClientScripts(clientHtml, options));
        });
    });
  } catch (e) {
    done(e);
  }
};

export function ng2engine(filePath: string, options: ExpressEngineConfig, done: Function) {
  console.warn('DEPRECATION WARNING: `ng2engine` is no longer supported and will be removed in next release. use `expressEngine`');
  return expressEngine(filePath, options, done);
};

export function ng2Engine(filePath: string, options: ExpressEngineConfig, done: Function) {
  console.warn('DEPRECATION WARNING: `ng2Engine` is no longer supported and will be removed in next release. use `expressEngine`');
  return expressEngine(filePath, options, done);
};
export function ng2ExpressEngine(filePath: string, options: ExpressEngineConfig, done: Function) {
  console.warn('DEPRECATION WARNING: `ng2ExpressEngine` is no longer supported and will be removed in next release. use `expressEngine`');
  return expressEngine(filePath, options, done);
};

export function simpleReplace(filePath: string, options: ExpressEngineConfig, done: Function) {
  // defaults
  options = options || <ExpressEngineConfig>{};

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


function prebootScript(config): string {
  let baseUrl = (config && config.preboot && config.preboot.baseUrl) || '/preboot';
  return `
  <preboot>
    <link rel="stylesheet" type="text/css" href="${baseUrl}/preboot.css">
    <script src="${baseUrl}/preboot.js"></script>
    <script>preboot.start()</script>
  </preboot>
  `;
}

function angularScript(config): string {
  let systemConfig = (config && config.systemjs) || {};
  let baseUrl = systemConfig.nodeModules || '/node_modules';
  let newConfig = (<any>Object).assign({}, {
      baseURL: '/',
      defaultJSExtensions: true
    }, systemConfig);
  return `
  <!-- Browser polyfills -->
  <script src="${baseUrl}/es6-shim/es6-shim.min.js"></script>
  <script src="${baseUrl}/systemjs/dist/system-polyfills.js"></script>
  <script src="${baseUrl}/angular2/bundles/angular2-polyfills.min.js"></script>
  <!-- SystemJS -->
  <script src="${baseUrl}/systemjs/dist/system.js"></script>
  <!-- Angular2: Bundle -->
  <script src="${baseUrl}/rxjs/bundles/Rx.js"></script>
  <script src="${baseUrl}/angular2/bundles/angular2.dev.js"></script>
  <script src="${baseUrl}/angular2/bundles/router.dev.js"></script>
  <script src="${baseUrl}/angular2/bundles/http.dev.js"></script>
  <script type="text/javascript">
  System.config(${ JSON.stringify(newConfig) });
  </script>
  `;
};

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

function bootstrapFunction(config: any): string {
  let systemConfig = (config && config.systemjs) || {};
  let url = systemConfig.componentUrl;
  return `
  <script>
    function bootstrap() {
      if (this.bootstraped) return;
      this.bootstraped = true;
      System.import("${ url }")
        .then(function(module) {
          return module.main();
        })
        .then(function() {
          if ('preboot' in window) { preboot.complete(); }
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
  if (!options || !options.buildClientScripts) { return html; }
  return html
    .replace(
      selectorRegExpFactory('preboot'),
      ((options.preboot === false) ? '' : prebootScript(options))
    )
    .replace(
      selectorRegExpFactory('angular'),
      ((options.angular === false) ? '' : angularScript(options))
    )
    .replace(
      selectorRegExpFactory('bootstrap'),
      ((options.bootstrap === false) ? (
        bootstrapButton +
        bootstrapFunction(options)
      ) : (
        (
          (options.client === undefined || options.server === undefined) ?
          '' : (options.client === false) ? '' : bootstrapButton
        ) +
        bootstrapFunction(options) +
        ((options.client === false) ? '' : bootstrapApp)
      ))
    );
}
