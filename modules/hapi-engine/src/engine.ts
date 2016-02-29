var fs = require('fs');
var Hoek = require('hoek');

import {
  renderToString,
  selectorResolver,
  selectorRegExpFactory,
  renderToStringWithPreboot
} from 'angular2-universal-preview';

export interface engineOptions {
  App: Function;
  providers?: Array<any>;
  preboot?: Object | any;
  selector?: string;
  serializedCmp?: string;
  server?: boolean;
  client?: boolean;
}


class Runtime {
  private renderPromise: any;

  private prebootScript: string = `
    <preboot>
      <link rel="stylesheet" type="text/css" href="/preboot/preboot.css">
      <script src="/preboot/preboot.js"></script>
      <script>preboot.start()</script>
    </preboot>
  `;

  private angularScript: string = `
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

  private bootstrapButton: string = `
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

  private bootstrapApp: string = `
    <script>
      setTimeout(function() {
        bootstrap();
      });
    </script>
  `;

  constructor(private options: engineOptions) {
    this.renderPromise = renderToString;
  }
  render(template: string, context, done: Function) {
    context = Hoek.applyToDefaults(context, this.options);
    let args = [context.App, context.providers];

    if (context.preboot) {
      this.renderPromise = renderToStringWithPreboot;
      args.push(context.preboot);
    }

    return this.renderPromise(...args)
      .then(serializedCmp => {

        const selector: string = selectorResolver(context.App);

        // selector replacer explained here
        // https://gist.github.com/gdi2290/c74afd9898d2279fef9f
        // replace our component with serialized version
        const rendered: string = template.replace(
          // <selector></selector>
          selectorRegExpFactory(selector),
          // <selector>{{ serializedCmp }}</selector>
          serializedCmp
          // TODO: serializedData
        );

        done(null, this.buildClientScripts(rendered, context));
      })
      .catch(e => {
        console.error(e.stack);
        // if server fail then return client html
        done(null, this.buildClientScripts(template, context));
      });
  }

  private bootstrapFunction(appUrl: string): string {
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
  }


  // TODO: find better ways to configure the App initial state
  // to pay off this technical debt
  // currently checking for explicit values
  private buildClientScripts(html: string, options: any): string {
    return html
      .replace(
        selectorRegExpFactory('preboot'),
        ((options.preboot === false) ? '' : this.prebootScript)
      )
      .replace(
        selectorRegExpFactory('angular'),
        ((options.angular === false) ? '' : this.angularScript)
      )
      .replace(
        selectorRegExpFactory('bootstrap'),
        ((options.bootstrap === false) ? (
          this.bootstrapButton +
          this.bootstrapFunction(options.componentUrl)
        ) : (
          (
            (options.client === undefined || options.server === undefined) ?
            '' : (options.client === false) ? '' : this.bootstrapButton
          ) +
          this.bootstrapFunction(options.componentUrl) +
          ((options.client === false) ? '' : this.bootstrapApp)
        ))
      );
  }

}


export class hapiEngine {

  helpers: any;
  partials: any;

  constructor() {
    this.helpers = {};
    this.partials = {};
  }

  registerHelper(name, helper) {
    this.helpers[name] = helper;
  }

  registerPartial(name, partial) {
    this.partials[name] = partial;
  }

  compile(template, options, next) {
    var runtime = new Runtime(options);
    return next(null, (context, options, callback) => {
      return runtime.render(template, context, (_, html) => {
        return callback(_, html);
      });
    });
  }
}
