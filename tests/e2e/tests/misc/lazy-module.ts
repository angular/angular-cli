import {readdirSync} from 'fs';
import {oneLine} from 'common-tags';

import {ng, npm} from '../../utils/process';
import {addImportToModule} from '../../utils/ast';
import {appendToFile, writeFile} from '../../utils/fs';


export default function() {
  let oldNumberOfFiles = 0;
  return Promise.resolve()
    .then(() => ng('build'))
    .then(() => oldNumberOfFiles = readdirSync('dist').length)
    .then(() => ng('generate', 'module', 'lazy', '--routing'))
    .then(() => ng('generate', 'module', 'too/lazy', '--routing'))
    .then(() => addImportToModule('src/app/app.module.ts', oneLine`
      RouterModule.forRoot([{ path: "lazy", loadChildren: "app/lazy/lazy.module#LazyModule" }]),
      RouterModule.forRoot([{ path: "lazy1", loadChildren: "./lazy/lazy.module#LazyModule" }]),
      RouterModule.forRoot([{ path: "lazy2", loadChildren: "./too/lazy/lazy.module#LazyModule" }])
      `, '@angular/router'))
    .then(() => ng('build', '--named-chunks'))
    .then(() => readdirSync('dist'))
    .then((distFiles) => {
      const currentNumberOfDistFiles = distFiles.length;
      if (oldNumberOfFiles >= currentNumberOfDistFiles) {
        throw new Error('A bundle for the lazy module was not created.');
      }
      oldNumberOfFiles = currentNumberOfDistFiles;

      if (!distFiles.includes('lazy.module.chunk.js')){
        throw new Error('The lazy module chunk did not have a name.');
      }
      if (!distFiles.includes('lazy.module.0.chunk.js')){
        throw new Error('The lazy module chunk did not use a unique name.');
      }
    })
    // verify System.import still works
    .then(() => writeFile('src/app/lazy-file.ts', ''))
    .then(() => appendToFile('src/app/app.component.ts', `
      // verify other System.import still work
      declare var System: any;
      const lazyFile = 'file';
      System.import('./lazy-' + lazyFile);
    `))
    .then(() => ng('build', '--named-chunks'))
    .then(() => readdirSync('dist'))
    .then((distFiles) => {
      const currentNumberOfDistFiles = distFiles.length;
      if (oldNumberOfFiles >= currentNumberOfDistFiles) {
        throw new Error('A bundle for the lazy file was not created.');
      }
      if (!distFiles.includes('lazy-file.chunk.js')) {
        throw new Error('The lazy file chunk did not have a name.');
      }
      oldNumberOfFiles = currentNumberOfDistFiles;
    })
    // verify 'import *' syntax doesn't break lazy modules
    .then(() => npm('install', 'moment'))
    .then(() => appendToFile('src/app/app.component.ts', `
      import * as moment from 'moment';
      console.log(moment);
    `))
    .then(() => ng('build'))
    .then(() => readdirSync('dist').length)
    .then(currentNumberOfDistFiles => {
      if (oldNumberOfFiles != currentNumberOfDistFiles) {
        throw new Error('Bundles were not created after adding \'import *\'.');
      }
    })
    .then(() => ng('build', '--no-named-chunks'))
    .then(() => readdirSync('dist'))
    .then((distFiles) => {
      if (distFiles.includes('lazy.module.chunk.js')
        || distFiles.includes('lazy.module.0.chunk.js')
        || distFiles.includes('lazy-file.chunk.js')
      ) {
        throw new Error('Lazy chunks shouldn\'t have a name but did.');
      }
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
