import {readdirSync} from 'fs';
import {oneLine} from 'common-tags';

import {ng, npm} from '../../utils/process';
import {addImportToModule} from '../../utils/ast';
import {appendToFile} from '../../utils/fs';


export default function() {
  let oldNumberOfFiles = 0;
  return Promise.resolve()
    .then(() => ng('build'))
    .then(() => oldNumberOfFiles = readdirSync('dist').length)
    .then(() => ng('generate', 'module', 'lazyA', '--routing'))
    .then(() => ng('generate', 'module', 'lazyB', '--routing'))
    .then(() => addImportToModule('src/app/app.module.ts', oneLine`
      RouterModule.forRoot([{ path: "lazyA", loadChildren: "./lazy-a/lazy-a.module#LazyAModule" }]),
      RouterModule.forRoot([{ path: "lazyB", loadChildren: "./lazy-b/lazy-b.module#LazyBModule" }])
      `, '@angular/router'))
    .then(() => ng('build'))
    .then(() => readdirSync('dist').length)
    .then(currentNumberOfDistFiles => {
      if (oldNumberOfFiles >= currentNumberOfDistFiles) {
        throw new Error('A bundle for the lazy module was not created.');
      }
      oldNumberOfFiles = currentNumberOfDistFiles;
    })
    .then(() => npm('install', 'moment'))
    .then(() => appendToFile('src/app/lazy-a/lazy-a.module.ts', `
      import * as moment from 'moment';
      console.log(moment);
    `))
    .then(() => ng('build'))
    .then(() => readdirSync('dist').length)
    .then(currentNumberOfDistFiles => {
      if (oldNumberOfFiles != currentNumberOfDistFiles) {
        throw new Error('The build contains a different number of files.');
      }
    })
    .then(() => appendToFile('src/app/lazy-b/lazy-b.module.ts', `
      import * as moment from 'moment';
      console.log(moment);
    `))
    .then(() => ng('build'))
    .then(() => readdirSync('dist').length)
    .then(currentNumberOfDistFiles => {
      if (oldNumberOfFiles >= currentNumberOfDistFiles) {
        throw new Error('A bundle for the common async module was not created.');
      }
      oldNumberOfFiles = currentNumberOfDistFiles;
    })
    // Check for AoT and lazy routes.
    .then(() => ng('build', '--aot'))
    .then(() => readdirSync('dist').length)
    .then(currentNumberOfDistFiles => {
      if (oldNumberOfFiles != currentNumberOfDistFiles) {
        throw new Error('AoT build contains a different number of files.');
      }
    });
}
