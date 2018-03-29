import { ng, npm } from '../../utils/process';
import { expectFileToMatch, writeFile } from '../../utils/fs';
import { getGlobalVariable } from '../../utils/env';
import { expectToFail } from '../../utils/utils';
import { updateJsonFile } from '../../utils/project';
import { readNgVersion } from '../../utils/version';
import { stripIndent } from 'common-tags';


export default function () {
  // Skip this in ejected tests.
  if (getGlobalVariable('argv').eject) {
    return Promise.resolve();
  }

  // Skip this test in Angular 2/4.
  if (getGlobalVariable('argv').ng2 || getGlobalVariable('argv').ng4) {
    return Promise.resolve();
  }

  let platformServerVersion = readNgVersion();

  if (getGlobalVariable('argv').nightly) {
    platformServerVersion = 'github:angular/platform-server-builds';
  }

  return Promise.resolve()
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
      appArchitect['app-shell'] = {
        builder: '@angular-devkit/build-angular:app-shell',
        options: {
          browserTarget: 'test-project:build:production',
          serverTarget: 'test-project:server',
          route: '/shell'
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
    .then(() => writeFile('projects/test-project/src/app/app.component.html', stripIndent`
      Hello World
      <router-outlet></router-outlet>
    `))
    .then(() => writeFile('projects/test-project/src/app/app.module.ts', stripIndent`
      import { BrowserModule } from '@angular/platform-browser';
      import { NgModule } from '@angular/core';
      import { RouterModule } from '@angular/router';

      import { AppComponent } from './app.component';

      @NgModule({
        imports: [
          BrowserModule.withServerTransition({ appId: 'appshell-play' }),
          RouterModule
        ],
        declarations: [AppComponent],
        bootstrap: [AppComponent]
      })
      export class AppModule { }
    `))
    .then(() => writeFile('projects/test-project/src/app/app.server.module.ts', stripIndent`
      import {NgModule} from '@angular/core';
      import {ServerModule} from '@angular/platform-server';
      import { Routes, RouterModule } from '@angular/router';

      import { AppModule } from './app.module';
      import { AppComponent } from './app.component';
      import { ShellComponent } from './shell.component';

      const routes: Routes = [
        { path: 'shell', component: ShellComponent }
      ];

      @NgModule({
        imports: [
          // The AppServerModule should import your AppModule followed
          // by the ServerModule from @angular/platform-server.
          AppModule,
          ServerModule,
          RouterModule.forRoot(routes),
        ],
        // Since the bootstrapped component is not inherited from your
        // imported AppModule, it needs to be repeated here.
        bootstrap: [AppComponent],
        declarations: [ShellComponent],
      })
      export class AppServerModule {}
    `))
    .then(() => writeFile('projects/test-project/src/app/shell.component.ts', stripIndent`
      import { Component } from '@angular/core';
      @Component({
        selector: 'app-shell',
        template: '<p>shell Works!</p>',
        styles: []
      })
      export class ShellComponent {}
    `))
    .then(() => updateJsonFile('package.json', packageJson => {
      const dependencies = packageJson['dependencies'];
      dependencies['@angular/platform-server'] = platformServerVersion;
    })
    .then(() => npm('install')))
    .then(() => ng('run', 'test-project:app-shell'))
    .then(() => expectFileToMatch('dist/test-project/index.html', /shell Works!/));
}
