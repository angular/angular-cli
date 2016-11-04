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
  return Promise.resolve()
    .then(() => ng('build'))
    .then(() => oldNumberOfFiles = readdirSync('dist').length)
    .then(() => ng('generate', 'module', 'lazy', '--routing'))
    // Add 2 lazy routes but they point to the same module so we should have only 1 more module.
    .then(() => addImportToModule('src/app/app.module.ts', oneLine`
      RouterModule.forRoot([
        { path: "lazy1", loadChildren: "app/lazy/lazy.module#LazyModule" },
        { path: "lazy2", loadChildren: "./lazy/lazy.module#LazyModule" }
      ])
      `, '@angular/router'))
    .then(() => ng('build'))
    .then(() => readdirSync('dist').length)
    .then(currentNumberOfDistFiles => {
      if (oldNumberOfFiles >= currentNumberOfDistFiles) {
        throw new Error('A bundle for the lazy module was not created.');
      }
    })
    // Check for AoT and lazy routes.
    .then(() => ng('build', '--aot'))
    .then(() => readdirSync('dist').length)
    .then(currentNumberOfDistFiles => {
      if (oldNumberOfFiles >= currentNumberOfDistFiles) {
        throw new Error('A bundle for the lazy module was not created.');
      }
    });
}
