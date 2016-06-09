const fs = require('graceful-fs');

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

export var EXPRESS_ANGULAR_APP = {
  template: null,
  directives: null,
  providers: null
};

export function disposeExpressPlatform() {
  if (EXPRESS_PLATFORM && EXPRESS_PLATFORM.dispose) {
    EXPRESS_PLATFORM.dispose();
  }
  EXPRESS_PLATFORM = null;
}

export function disposeExpressAngularApp() {
  EXPRESS_ANGULAR_APP = {
    template: null,
    directives: null,
    providers: null
  };
}

// readfile workaround
export var cache = {};

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

  function readContent(content) {


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
    const _template = clientHtml || _options.template;
    const _providers = _options.providers;
    const _directives = _options.directives;

    if (!EXPRESS_PLATFORM) {
      const _Bootloader = Bootloader;
      let _bootloader = _options.bootloader;
      if (_options.bootloader) {
        _bootloader = _Bootloader.create(_options.bootloader);
      } else {
        _bootloader = _Bootloader.create(_options);
      }
      EXPRESS_PLATFORM = _bootloader;
    }

    EXPRESS_ANGULAR_APP.template = _template;
    EXPRESS_ANGULAR_APP.directives = _directives;
    EXPRESS_ANGULAR_APP.providers = _options.reuseProviders !== true ? _providers : EXPRESS_ANGULAR_APP.providers;

    return EXPRESS_PLATFORM.serializeApplication(EXPRESS_ANGULAR_APP)
      .then(html => {
        if (EXPRESS_PLATFORM.pendingDisposed) {
          disposeExpressPlatform();
        }
        done(null, buildClientScripts(html, options));
      })
      .catch(e => {

        disposeExpressPlatform();

        console.error(e.stack);
        // if server fail then return client html
        done(null, buildClientScripts(clientHtml, options));
      });
  }

  // read file on disk
  try {

    if (cache[filePath]) {
      return readContent(cache[filePath]);
    }
    fs.readFile(filePath, (err, content) => {
      if (err) {
        disposeExpressPlatform();
        return done(err);
      }
      cache[filePath] = content;
      return readContent(content);
    });

  } catch (e) {
    disposeExpressPlatform();
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
  <script src="${baseUrl}/zone.js/dist/zone.js"></script>
  <script src="${baseUrl}/reflect-metadata/Reflect.js"></script>
  <!-- SystemJS -->
  <script src="${baseUrl}/systemjs/dist/system.js"></script>
  <!-- Angular2: Bundle -->
  <script src="${baseUrl}/rxjs/bundles/Rx.umd.js"></script>
  <script src="${baseUrl}/@angular/core/core.umd.js"></script>
  <script src="${baseUrl}/@angular/common/common.umd.js"></script>
  <script src="${baseUrl}/@angular/compiler/compiler.umd.js"></script>
  <script src="${baseUrl}/@angular/platform-browser/platform-browser.umd.js"></script>
  <script src="${baseUrl}/@angular/platform-browser-dynamic/platform-browser-dynamic.umd.js"></script>
  <script src="${baseUrl}/@angular/router-deprecated/router-deprecated.umd.js"></script>
  <script src="${baseUrl}/@angular/http/http.umd.js"></script>
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
