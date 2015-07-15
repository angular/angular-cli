
// TODO: build from preboot config
// consider declarative config via <preboot minify="true"></preboot>
export var prebootScript = `
  <preboot>
    <link rel="stylesheet" type="text/css" href="/preboot/preboot.css">
    <script src="/preboot/preboot.js"></script>
    <script>preboot.start()</script>
  </preboot>
`;
// Inject Angular for the developer
export var angularScript = `
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

export function buildScripts(scripts) {
  // figure out what scripts to inject
  return (scripts === false ? '' : (
      (scripts.preboot === true ? prebootScript : '') +
      (scripts.angular === true ? angularScript : '')
    )
  );
}
