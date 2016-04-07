import {Bootloader, BootloaderConfig} from 'angular2-universal';
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
    const _options = options;
    const _template = template;
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
