import * as through from 'through2';

export function prerender(_options) {
  function transform(_file: any, _enc: string, _cb: Function) {

    return '';
  }
  return through.obj(transform);
}
