/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { createDir, writeFile } from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';

export default async function () {
  await ng('generate', 'library', 'mylib');
  await createLibraryEntryPoint('secondary', 'SecondaryModule', 'index.ts');
  await createLibraryEntryPoint('another', 'AnotherModule', 'index.ts');

  // Scenario #1 where we use wildcard path mappings for secondary entry-points.
  await updateJsonFile('tsconfig.json', (json) => {
    json.compilerOptions.paths = { 'mylib': ['dist/mylib'], 'mylib/*': ['dist/mylib/*'] };
  });

  await writeFile(
    'src/app/app.module.ts',
    `
      import {NgModule} from '@angular/core';
      import {BrowserModule} from '@angular/platform-browser';
      import {SecondaryModule} from 'mylib/secondary';
      import {AnotherModule} from 'mylib/another';

      import {AppComponent} from './app.component';

      @NgModule({
        declarations: [
          AppComponent
        ],
        imports: [
          SecondaryModule,
          AnotherModule,
          BrowserModule
        ],
        providers: [],
        bootstrap: [AppComponent]
      })
      export class AppModule { }
    `,
  );

  await ng('build', 'mylib');
  await ng('build');

  // Scenario #2 where we don't use wildcard path mappings.
  await updateJsonFile('tsconfig.json', (json) => {
    json.compilerOptions.paths = {
      'mylib': ['dist/mylib'],
      'mylib/secondary': ['dist/mylib/secondary'],
      'mylib/another': ['dist/mylib/another'],
    };
  });

  await ng('build');
}

async function createLibraryEntryPoint(name: string, moduleName: string, entryFileName: string) {
  await createDir(`projects/mylib/${name}`);
  await writeFile(
    `projects/mylib/${name}/${entryFileName}`,
    `
      import {NgModule} from '@angular/core';

      @NgModule({})
      export class ${moduleName} {}
    `,
  );

  await writeFile(
    `projects/mylib/${name}/ng-package.json`,
    JSON.stringify({
      lib: {
        entryFile: entryFileName,
      },
    }),
  );
}
