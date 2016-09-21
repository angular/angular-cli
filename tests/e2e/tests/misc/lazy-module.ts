import {readdirSync} from 'fs';
import {oneLine} from 'common-tags';

import {ng} from '../../utils/process';
import {addImportToModule} from '../../utils/ast';


export default function(argv: any) {
  /** This test is disabled when not on nightly. */
  if (!argv.nightly) {
    return Promise.resolve();
  }

  let oldNumberOfFiles = 0;
  let currentNumberOfDistFiles = 0;

  return Promise.resolve()
    .then(() => ng('build'))
    .then(() => oldNumberOfFiles = readdirSync('dist').length)
    .then(() => ng('generate', 'module', 'lazy', '--routing'))
    .then(() => addImportToModule('src/app/app.module.ts', oneLine`
      RouterModule.forRoot([{ path: "lazy", loadChildren: "app/lazy/lazy.module#LazyModule" }])
      `, '@angular/router'))
    .then(() => ng('build'))
    .then(() => currentNumberOfDistFiles = readdirSync('dist').length)
    .then(() => {
      if (oldNumberOfFiles >= currentNumberOfDistFiles) {
        throw new Error('A bundle for the lazy module was not created.');
      }
    });
}
