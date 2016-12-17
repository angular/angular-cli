import {oneLine} from 'common-tags';
import * as fs from 'fs';

import {ng} from '../../utils/process';
import {writeFile} from '../../utils/fs';
import {addImportToModule} from '../../utils/ast';


export default function() {
  const oldHashes: {[module: string]: string} = {};
  const newHashes: {[module: string]: string} = {};
  // First, collect the hashes.
  return Promise.resolve()
    .then(() => ng('generate', 'module', 'lazy', '--routing'))
    .then(() => addImportToModule('src/app/app.module.ts', oneLine`
      RouterModule.forRoot([{ path: "lazy", loadChildren: "./lazy/lazy.module#LazyModule" }])
    `, '@angular/router'))
    .then(() => ng('build', '--prod'))
    .then(() => {
      fs.readdirSync('./dist')
        .forEach(name => {
          if (!name.match(/(main|inline|styles|\d+)\.[a-z0-9]+\.bundle\.(js|css)/)) {
            return;
          }

          const [module, hash] = name.split('.');
          oldHashes[module] = hash;
        });
    })
    .then(() => writeFile('src/app/app.component.css', 'h1 { margin: 5px; }'))
    .then(() => writeFile('src/styles.css', 'body { background: red; }'))
    .then(() => ng('build', '--prod'))
    .then(() => {
      fs.readdirSync('./dist')
        .forEach(name => {
          if (!name.match(/(main|inline|styles|\d+)\.[a-z0-9]+\.bundle\.(js|css)/)) {
            return;
          }

          const [module, hash] = name.split('.');
          newHashes[module] = hash;
        });
    })
    .then(() => {
      console.log('  Validating hashes...');
      console.log(`  Old hashes: ${JSON.stringify(oldHashes)}`);
      console.log(`  New hashes: ${JSON.stringify(newHashes)}`);

      Object.keys(oldHashes)
        .forEach(module => {
          if (oldHashes[module] == newHashes[module]) {
            throw new Error(`Module "${module}" did not change hash (${oldHashes[module]})...`);
          }
        });
    });
}
