import { normalize } from 'path';

import { updateJsonFile, updateTsConfig } from '../../utils/project';
import { expectFileToMatch, writeFile, replaceInFile, prependToFile } from '../../utils/fs';
import { ng, silentNpm, silentExec } from '../../utils/process';
import { getGlobalVariable } from '../../utils/env';

export default function () {
  // Skip this in Appveyor tests.
  if (getGlobalVariable('argv').appveyor) {
    return Promise.resolve();
  }

  // Skip this for ejected tests.
  if (getGlobalVariable('argv').eject) {
    return Promise.resolve();
  }

  return Promise.resolve()
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      const app = configJson['apps'][0];
      delete app['polyfills'];
      delete app['styles'];
      app['platform'] = 'server';
    }))
    .then(() => updateJsonFile('package.json', packageJson => {
      const dependencies = packageJson['dependencies'];
      dependencies['@angular/platform-server'] = '^4.0.0';
    }))
    .then(() => updateTsConfig(tsConfig => {
      tsConfig['angularCompilerOptions'] = {
        entryModule: 'app/app.module#AppModule'
      };
    }))
    .then(() => writeFile('./src/main.ts', 'export { AppModule } from \'./app/app.module\';'))
    .then(() => prependToFile('./src/app/app.module.ts',
      'import { ServerModule } from \'@angular/platform-server\';'))
    .then(() => replaceInFile('./src/app/app.module.ts', /\[\s*BrowserModule/g,
      `[BrowserModule.withServerTransition(\{ appId: 'app' \}), ServerModule`))
    .then(() => silentNpm('install'))
    .then(() => ng('build'))
    // files were created successfully
    .then(() => expectFileToMatch('dist/main.bundle.js',
      /__webpack_exports__, "AppModule"/))
    .then(() => writeFile('./index.js', `
      require('zone.js/dist/zone-node');
      require('reflect-metadata');
      const fs = require('fs');
      const \{ AppModule \} = require('./dist/main.bundle');
      const \{ renderModule \} = require('@angular/platform-server');

      renderModule(AppModule, \{
        url: '/',
        document: '<app-root></app-root>'
      \}).then(html => \{
        fs.writeFileSync('dist/index.html', html);
      \});
    `))
    .then(() => silentExec(normalize('node'), 'index.js'))
    .then(() => expectFileToMatch('dist/index.html',
      new RegExp('<h2 _ngcontent-c0="">Here are some links to help you start: </h2>')))
    .then(() => ng('build', '--aot'))
    // files were created successfully
    .then(() => expectFileToMatch('dist/main.bundle.js',
      /__webpack_exports__, "AppModuleNgFactory"/))
    .then(() => replaceInFile('./index.js', /AppModule/g, 'AppModuleNgFactory'))
    .then(() => replaceInFile('./index.js', /renderModule/g, 'renderModuleFactory'))
    .then(() => silentExec(normalize('node'), 'index.js'))
    .then(() => expectFileToMatch('dist/index.html',
      new RegExp('<h2 _ngcontent-c0="">Here are some links to help you start: </h2>')));
}
