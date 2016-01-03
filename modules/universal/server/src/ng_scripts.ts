import {selectorRegExpFactory} from './helper';

// TODO: hard coded for now
// TODO: build from preboot config
// consider declarative config via directive <preboot minify="true"></preboot>
export const prebootScript: string = `
  <preboot>
    <link rel="stylesheet" type="text/css" href="/preboot/preboot.css">
    <script src="/preboot/preboot.js"></script>
    <script>preboot.start()</script>
  </preboot>
`;
// Inject Angular for the developer
export const angularScript: string = `
  <!-- Browser polyfills -->
  <script src="/node_modules/es6-shim/es6-shim.min.js"></script>
  <script src="/node_modules/angular2/bundle/angular2-polyfills.min.js"></script>
  <!-- SystemJS -->
  <script src="/bower_components/system.js/dist/system.js"></script>
  <!-- Angular2: Bundle -->
  <script src="/node_modules/angular2/bundle/angular2.dev.js"></script>
  <script src="/node_modules/angular2/bundle/router.dev.js"></script>
  <script src="/node_modules/angular2/bundle/http.dev.js"></script>
  <script type="text/javascript">
    System.config({
      "baseURL": "/",
      "defaultJSExtensions": true,
      "map": {
        "*": "*.js",
        "angular2": "node_modules/angular2"
      }
    });
  </script>
`;

export const bootstrapButton: string = `
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

export function bootstrapFunction(appUrl: string): string {
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

export var bootstrapApp = `
  <script>
    setTimeout(function() {
      bootstrap();
    });
  </script>
`;

export function buildScripts(scripts: any, appUrl?: string): string {
  // figure out what scripts to inject
  return (scripts === false ? '' : (
      (scripts.preboot === true ? prebootScript : '') +
      (scripts.angular === true ? angularScript : '') +
      (scripts.bootstrapButton === true ? angularScript : '') +
      (scripts.bootstrapFunction === true ? bootstrapFunction(appUrl || '') : '') +
      (scripts.bootstrapApp === true ? angularScript : '')
    )
  );
}

// TODO: find better ways to configure the App initial state
// to pay off this technical debt
// currently checking for explicit values
export function buildClientScripts(html: string, options: any): string {
  return html
    .replace(
      selectorRegExpFactory('preboot'),
      ((options.preboot === false) ? '' : prebootScript)
    )
    .replace(
      selectorRegExpFactory('angular'),
      ((options.angular === false) ? '' : '$1' + angularScript + '$3')
    )
    .replace(
      selectorRegExpFactory('bootstrap'),
      '$1' +
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
      )) +
      '$3'
    );
}
