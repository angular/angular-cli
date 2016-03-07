import universal = require('angular2-universal-preview');
import through = require('through2');
var gutil = require('gutil');

let PluginError = gutil.PluginError;

export interface IUniversalConfig {
  preboot: boolean;
  bootloader: any;
  componentProviders: any[];
  platformProviders: any[];
  directives: any[];
  providers: any[];
}

export class GulpAngular2Render {

  constructor(options: IUniversalConfig) {

    return through.obj((file: any, enc: string, cb: Function) => {

      if (file.isStream()) {
        return cb(new PluginError('angular2-gulp-prerender', 'Streaming is not supported'));
      }

      let clientHtml: string = file.contents.toString();

      // bootstrap and render component to string
      var bootloader = options.bootloader;
      if (!options.bootloader) {
        options.bootloader = {
          document: universal.parseDocument(clientHtml),
          providers: options.providers,
          componentProviders: options.componentProviders,
          platformProviders: options.platformProviders,
          directives: options.directives,
          preboot: options.preboot
        };
      }
      bootloader = universal.Bootloader.create(options.bootloader);

      return bootloader.serializeApplication().then(html => {
        file.contents = new Buffer(html);
        cb(null, file);
      });
    });
  }
}
