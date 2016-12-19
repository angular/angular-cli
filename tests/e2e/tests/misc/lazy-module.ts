import { readdirSync } from 'fs';
import { oneLine } from 'common-tags';

import { ng } from '../../utils/process';
import { addImportToModule } from '../../utils/ast';
import { isUniversalTest } from '../../utils/utils';


export default function() {
  let oldNumberOfFiles = 0;
  if (isUniversalTest()) {
    return Promise.resolve()
      .then(() => ng('build'))
      .then(() => oldNumberOfFiles = readdirSync('dist/client').length)
      .then(() => ng('generate', 'module', 'lazy', '--routing'))
      .then(() => addImportToModule('src/app/app.browser.module.ts', oneLine`
      RouterModule.forRoot([{ path: "lazy", loadChildren: "app/lazy/lazy.module#LazyModule" }]),
      RouterModule.forRoot([{ path: "lazy1", loadChildren: "./lazy/lazy.module#LazyModule" }])
      `, '@angular/router'))
      .then(() => ng('build'))
      .then(() => readdirSync('dist/client').length)
      .then(currentNumberOfDistFiles => {
        if (oldNumberOfFiles >= currentNumberOfDistFiles) {
          throw new Error('A bundle for the lazy module was not created.');
        }
      });
  } else {
    return Promise.resolve()
      .then(() => ng('build'))
      .then(() => oldNumberOfFiles = readdirSync('dist').length)
      .then(() => ng('generate', 'module', 'lazy', '--routing'))
      .then(() => addImportToModule('src/app/app.module.ts', oneLine`
      RouterModule.forRoot([{ path: "lazy", loadChildren: "app/lazy/lazy.module#LazyModule" }]),
      RouterModule.forRoot([{ path: "lazy1", loadChildren: "./lazy/lazy.module#LazyModule" }])
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
}
