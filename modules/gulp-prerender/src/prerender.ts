import universal = require('angular2-universal-preview');
import through = require('through2');
var gutil = require('gutil');

let PluginError = gutil.PluginError;

export interface IUniversalConfig {
  preboot: boolean;
  App: any;
  providers: any[];
}

export class GulpAngular2Render {

  constructor(config: IUniversalConfig) {

    return through.obj((file: any, enc: string, cb: Function) => {

      if (file.isStream()) {
        return cb(new PluginError('angular2-gulp-prerender', 'Streaming is not supported'));
      }
      let str: string = file.contents.toString();

      let renderPromise = universal.renderToString;
      let args = [config.App, config.providers];

      if (config.preboot) {
        renderPromise = universal.renderToStringWithPreboot;
        args.push(config.preboot);
      }

      renderPromise.apply(null, args)
        .then((serializedApp) => {
          let html = str.replace(
            // <selector></selector>
            universal.selectorRegExpFactory(universal.selectorResolver(config.App)),
            // <selector>{{ serializedCmp }}</selector>
            serializedApp
          );

          file.contents = new Buffer(html);

          cb(null, file)
        });
    });
  }
}
