import { normalize } from 'path';

import { updateJsonFile, updateTsConfig } from '../../utils/project';
import {
  expectFileToMatch,
  writeFile,
  replaceInFile,
  prependToFile,
  appendToFile,
} from '../../utils/fs';
import { ng, silentNpm, exec } from '../../utils/process';
import { getGlobalVariable } from '../../utils/env';
import { readNgVersion } from '../../utils/version';
import { expectToFail } from '../../utils/utils';

export default function () {
  // Skip this for ejected tests.
  if (getGlobalVariable('argv').eject) {
    return Promise.resolve();
  }

  let platformServerVersion = readNgVersion();

  if (getGlobalVariable('argv').nightly) {
    platformServerVersion = 'github:angular/platform-server-builds';
  }

  // Skip this test in Angular 2/4.
  if (getGlobalVariable('argv').ng2 || getGlobalVariable('argv').ng4) {
    return Promise.resolve();
  }

  return Promise.resolve()
    .then(() => updateJsonFile('package.json', packageJson => {
      const dependencies = packageJson['dependencies'];
      dependencies['@angular/platform-server'] = platformServerVersion;
    }))
    .then(() => updateJsonFile('angular.json', workspaceJson => {
      const appArchitect = workspaceJson.projects['test-project'].architect;
      appArchitect['server'] = {
        builder: '@angular-devkit/build-angular:server',
        options: {
          outputPath: 'dist/test-project-server',
          main: 'projects/test-project/src/main.server.ts',
          tsConfig: 'projects/test-project/tsconfig.server.json'
        }
      };
    }))
    .then(() => writeFile('./projects/test-project/tsconfig.server.json', `
      {
        "extends": "../../tsconfig.json",
        "compilerOptions": {
          "outDir": "../dist-server",
          "baseUrl": "./",
          "module": "commonjs",
          "types": []
        },
        "exclude": [
          "test.ts",
          "**/*.spec.ts"
        ],
        "angularCompilerOptions": {
          "entryModule": "src/app/app.server.module#AppServerModule"
        }
      }
    `))
    .then(() => writeFile('./projects/test-project/src/main.server.ts', `
      import { enableProdMode } from '@angular/core';

      import { environment } from './environments/environment';

      if (environment.production) {
        enableProdMode();
      }

      export { AppServerModule } from './app/app.server.module';
    `))
    .then(() => writeFile('./projects/test-project/src/app/app.server.module.ts', `
      import { NgModule } from '@angular/core';
      import { BrowserModule } from '@angular/platform-browser';
      import { ServerModule } from '@angular/platform-server';

      import { AppModule } from './app.module';
      import { AppComponent } from './app.component';

      @NgModule({
        imports: [
          AppModule,
          BrowserModule.withServerTransition(\{ appId: 'app' \}),
          ServerModule,
        ],
        bootstrap: [AppComponent],
      })
      export class AppServerModule {}
    `))
    .then(() => silentNpm('install'))
    // This part of the test requires a non-aot build, which isn't available anymore.
    // .then(() => ng('run', 'test-project:server'))
    // // files were created successfully
    // .then(() => expectFileToMatch('dist/test-project-server/main.js',
    //   /exports.*AppServerModule/))
    // .then(() => writeFile('./index.js', `
    //   require('zone.js/dist/zone-node');
    //   require('reflect-metadata');
    //   const fs = require('fs');
    //   const \{ AppServerModule \} = require('./dist/test-project-server/main');
    //   const \{ renderModule \} = require('@angular/platform-server');

    //   renderModule(AppServerModule, \{
    //     url: '/',
    //     document: '<app-root></app-root>'
    //   \}).then(html => \{
    //     fs.writeFileSync('dist/test-project-server/index.html', html);
    //   \});
    // `))
    // .then(() => exec(normalize('node'), 'index.js'))
    // .then(() => expectFileToMatch('dist/test-project-server/index.html',
    //   new RegExp('<h2 _ngcontent-c0="">Here are some links to help you start: </h2>')))
    .then(() => ng('run', 'test-project:server'))
    // files were created successfully
    .then(() => expectFileToMatch('dist/test-project-server/main.js',
      /exports.*AppServerModuleNgFactory/))
    .then(() => writeFile('./index.js', `
      require('zone.js/dist/zone-node');
      require('reflect-metadata');
      const fs = require('fs');
      const \{ AppServerModuleNgFactory \} = require('./dist/test-project-server/main');
      const \{ renderModuleFactory \} = require('@angular/platform-server');

      renderModuleFactory(AppServerModuleNgFactory, \{
        url: '/',
        document: '<app-root></app-root>'
      \}).then(html => \{
        fs.writeFileSync('dist/test-project-server/index.html', html);
      \});
    `))
    .then(() => exec(normalize('node'), 'index.js'))
    .then(() => expectFileToMatch('dist/test-project-server/index.html',
      new RegExp('<h2 _ngcontent-c0="">Here are some links to help you start: </h2>')))
    .then(() => expectFileToMatch('./dist/test-project-server/main.js',
      /require\(["']@angular\/[^"']*["']\)/))

    // Check externals.
    .then(() => prependToFile('./projects/test-project/src/app/app.server.module.ts', `
      import 'zone.js/dist/zone-node';
      import 'reflect-metadata';
    `)
      .then(() => appendToFile('./projects/test-project/src/app/app.server.module.ts', `
      import * as fs from 'fs';
      import { renderModule } from '@angular/platform-server';

      renderModule(AppModule, \{
        url: '/',
        document: '<app-root></app-root>'
      \}).then(html => \{
        fs.writeFileSync('dist/test-project-server/index.html', html);
      \});
    `)))
    // This part of the test requires a non-aot build, which isn't available anymore.
    // .then(() => ng('run', 'test-project:server', '--bundle-dependencies=all'))
    // .then(() => expectToFail(() => expectFileToMatch('./dist/test-project-server/main.js',
    //   /require\(["']@angular\/[^"']*["']\)/)))
    // .then(() => exec(normalize('node'), 'dist/test-project-server/main.js'));
}
