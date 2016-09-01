
import * as through from 'through2';
var gutil = require('gutil');

let PluginError = gutil.PluginError;

export function prerender(options) {
  function transform(file: any, enc: string, cb: Function) {

    return '';
  }
  return through.obj(transform);
}
