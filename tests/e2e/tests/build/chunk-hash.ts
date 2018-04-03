import * as fs from 'fs';

import {ng} from '../../utils/process';
import {writeFile, prependToFile, replaceInFile} from '../../utils/fs';

const OUTPUT_RE = /(main|polyfills|vendor|inline|styles|\d+)\.[a-z0-9]+\.(chunk|bundle)\.(js|css)$/;

function generateFileHashMap(): Map<string, string> {
  const hashes = new Map<string, string>();

  fs.readdirSync('./dist')
    .forEach(name => {
      if (!name.match(OUTPUT_RE)) {
        return;
      }

      const [module, hash] = name.split('.');
      hashes.set(module, hash);
    });

  return hashes;
}

function validateHashes(
  oldHashes: Map<string, string>,
  newHashes: Map<string, string>,
  shouldChange: Array<string>): void {

  console.log('  Validating hashes...');
  console.log(`  Old hashes: ${JSON.stringify([...oldHashes])}`);
  console.log(`  New hashes: ${JSON.stringify([...newHashes])}`);

  oldHashes.forEach((hash, module) => {
      if (hash == newHashes.get(module)) {
        if (shouldChange.includes(module)) {
          throw new Error(`Module "${module}" did not change hash (${hash})...`);
        }
      } else if (!shouldChange.includes(module)) {
        throw new Error(`Module "${module}" changed hash (${hash})...`);
      }
    });
}

export default function() {
  // TODO(architect): Delete this test. It is now in devkit/build-angular.
  return;

  let oldHashes: Map<string, string>;
  let newHashes: Map<string, string>;
  // First, collect the hashes.
  return Promise.resolve()
    .then(() => ng('generate', 'module', 'lazy', '--routing'))
    .then(() => prependToFile('src/app/app.module.ts', `
      import { RouterModule } from '@angular/router';
      import { ReactiveFormsModule } from '@angular/forms';
    `))
    .then(() => replaceInFile('src/app/app.module.ts', 'imports: [', `imports: [
      RouterModule.forRoot([{ path: "lazy", loadChildren: "./lazy/lazy.module#LazyModule" }]),
      ReactiveFormsModule,
    `))
    .then(() => ng('build', '--output-hashing=all'))
    .then(() => {
      oldHashes = generateFileHashMap();
    })
    .then(() => ng('build', '--output-hashing=all'))
    .then(() => {
      newHashes = generateFileHashMap();
    })
    .then(() => {
      validateHashes(oldHashes, newHashes, []);
      oldHashes = newHashes;
    })
    .then(() => writeFile('src/styles.css', 'body { background: blue; }'))
    .then(() => ng('build', '--output-hashing=all'))
    .then(() => {
      newHashes = generateFileHashMap();
    })
    .then(() => {
      validateHashes(oldHashes, newHashes, ['styles']);
      oldHashes = newHashes;
    })
    .then(() => writeFile('src/app/app.component.css', 'h1 { margin: 10px; }'))
    .then(() => ng('build', '--output-hashing=all'))
    .then(() => {
      newHashes = generateFileHashMap();
    })
    .then(() => {
      validateHashes(oldHashes, newHashes, ['main']);
      oldHashes = newHashes;
    })
    .then(() => prependToFile('src/app/lazy/lazy.module.ts', `
      import { ReactiveFormsModule } from '@angular/forms';
    `))
    .then(() => replaceInFile('src/app/lazy/lazy.module.ts', 'imports: [', `
      imports: [
         ReactiveFormsModule,
    `))
    .then(() => ng('build', '--output-hashing=all'))
    .then(() => {
      newHashes = generateFileHashMap();
    })
    .then(() => {
      validateHashes(oldHashes, newHashes, ['inline', '0']);
    });
}
