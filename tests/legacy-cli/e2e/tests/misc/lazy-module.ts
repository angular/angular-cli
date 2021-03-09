import {readdirSync} from 'fs';
import { installPackage } from '../../utils/packages';
import {ng} from '../../utils/process';
import {appendToFile, writeFile, prependToFile, replaceInFile} from '../../utils/fs';


export default function() {
  let oldNumberOfFiles = 0;
  return Promise.resolve()
    .then(() => ng('build', '--configuration=development'))
    .then(() => oldNumberOfFiles = readdirSync('dist').length)
    .then(() => ng('generate', 'module', 'lazy', '--routing'))
    .then(() => ng('generate', 'module', 'too/lazy', '--routing'))
    .then(() => prependToFile('src/app/app.module.ts', `
      import { RouterModule } from '@angular/router';
    `))
    .then(() => replaceInFile('src/app/app.module.ts', 'imports: [', `imports: [
      RouterModule.forRoot([{ path: "lazy", loadChildren: () => import('src/app/lazy/lazy.module').then(m => m.LazyModule) }]),
      RouterModule.forRoot([{ path: "lazy1", loadChildren: () => import('./lazy/lazy.module').then(m => m.LazyModule) }]),
      RouterModule.forRoot([{ path: "lazy2", loadChildren: () => import('./too/lazy/lazy.module').then(m => m.LazyModule) }]),
    `))
    .then(() => ng('build', '--named-chunks', '--configuration=development'))
    .then(() => readdirSync('dist/test-project'))
    .then((distFiles) => {
      const currentNumberOfDistFiles = distFiles.length;
      if (oldNumberOfFiles >= currentNumberOfDistFiles) {
        throw new Error('A bundle for the lazy module was not created.');
      }
      oldNumberOfFiles = currentNumberOfDistFiles;

      if (!distFiles.includes('too-lazy-lazy-module.js')) {
        throw new Error('The lazy module chunk did not use a unique name.');
      }
    })
    // verify System.import still works
    .then(() => writeFile('src/app/lazy-file.ts', ''))
    .then(() => appendToFile('src/app/app.component.ts', `
      // verify other System.import still work
      declare var System: any;
      const lazyFile = 'file';
      System.import(/*webpackChunkName: '[request]'*/'./lazy-' + lazyFile);
    `))
    .then(() => ng('build', '--named-chunks', '--configuration=development'))
    .then(() => readdirSync('dist/test-project'))
    .then((distFiles) => {
      const currentNumberOfDistFiles = distFiles.length;
      if (oldNumberOfFiles >= currentNumberOfDistFiles) {
        throw new Error('A bundle for the lazy file was not created.');
      }
      if (!distFiles.includes('lazy-file.js')) {
        throw new Error('The lazy file chunk did not have a name.');
      }
      oldNumberOfFiles = currentNumberOfDistFiles;
    })
    // verify 'import *' syntax doesn't break lazy modules
    .then(() => installPackage('moment'))
    .then(() => appendToFile('src/app/app.component.ts', `
      import * as moment from 'moment';
      console.log(moment);
    `))
    .then(() => ng('build', '--configuration=development'))
    .then(() => readdirSync('dist/test-project').length)
    .then(currentNumberOfDistFiles => {
      if (oldNumberOfFiles != currentNumberOfDistFiles) {
        throw new Error('Bundles were not created after adding \'import *\'.');
      }
    })
    .then(() => ng('build', '--no-named-chunks', '--configuration=development'))
    .then(() => readdirSync('dist/test-project'))
    .then((distFiles) => {
      if (distFiles.includes('lazy-lazy-module.js') || distFiles.includes('too-lazy-lazy-module.js')) {
        throw new Error('Lazy chunks shouldn\'t have a name but did.');
      }
    })
    // Check for AoT and lazy routes.
    .then(() => ng('build', '--aot', '--configuration=development'))
    .then(() => readdirSync('dist/test-project').length)
    .then(currentNumberOfDistFiles => {
      if (oldNumberOfFiles != currentNumberOfDistFiles) {
        throw new Error('AoT build contains a different number of files.');
      }
    });
}
