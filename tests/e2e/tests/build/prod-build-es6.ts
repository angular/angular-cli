import { appendToFile } from '../../utils/fs';
import { ng } from '../../utils/process';


export default function () {
  // Try to import a known es6 module and build with prod.
  // This works with uglify-es(UglifyJSPlugin@^1.0.0-beta.2), but not with uglify-js.
  return appendToFile('src/main.ts', `
    import * as es6module from '@angular/core/@angular/core';
    console.log(es6module);
  `)
    .then(() => ng('build', '--prod'));
}
