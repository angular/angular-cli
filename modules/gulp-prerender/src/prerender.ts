import universal = require('angular2-universal-preview');
import through = require('through2');
var gutil = require('gutil');

let PluginError = gutil.PluginError;

export interface GulpUniversalConfig {
  document?: Object;
  template?: string;
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

export function prerender(options: GulpUniversalConfig | any) {
  function transform(file: any, enc: string, cb: Function) {

    if (file.isStream()) {
      return cb(new PluginError('angular2-gulp-prerender', 'Streaming is not supported'));
    }

    let template: string = file.contents.toString();

    // bootstrap and render component to string
    var bootloader = options.bootloader;
    if (!options.bootloader) {
      let doc = universal.parseDocument(template);
      options.document = doc;
      options.template = options.template || template;
      options.bootloader = options;
    }
    bootloader = universal.Bootloader.create(options.bootloader);

    return bootloader.serializeApplication()
      .then(html => {
        file.contents = new Buffer(html);
        cb(null, file);
      });
  }
  return through.obj(transform);
}

export function GulpAngular2Render(options: GulpUniversalConfig) {
  console.warn('DEPRECATION WARNING: `GulpAngular2Render` is no longer supported and will be removed in next release. use `prerender`');
  return prerender(options);
}
export function Prerender(options: GulpUniversalConfig) {
  console.warn('DEPRECATION WARNING: `Prerender` is no longer supported and will be removed in next release. use `prerender`');
  return prerender(options);
}
