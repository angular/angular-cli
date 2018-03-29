// import * as path from 'path';
import {
  writeMultipleFiles,
  createDir,
  expectFileToMatch,
  expectFileToExist
} from '../../utils/fs';
import { ng } from '../../utils/process';
import { updateJsonFile } from '../../utils/project';
import { expectToFail } from '../../utils/utils';
import {getGlobalVariable} from '../../utils/env';


// const temp = require('temp');
// const tempDir = path.join(temp.mkdirSync('angular-cli-e2e-assets-'), 'out');

// tslint:disable:max-line-length
export default function () {
  // Disable parts of it in webpack tests.
  const ejected = getGlobalVariable('argv').eject;

  // TODO: update test
  return;

  return Promise.resolve()
    .then(_ => createDir('./src/folder'))
    .then(_ => createDir('./node_modules/some-package/'))
    // Write assets.
    .then(_ => writeMultipleFiles({
      './src/folder/.gitkeep': '',
      './src/folder/folder-asset.txt': 'folder-asset.txt',
      './src/glob-asset.txt': 'glob-asset.txt',
      './src/output-asset.txt': 'output-asset.txt',
      './node_modules/some-package/node_modules-asset.txt': 'node_modules-asset.txt',
    }))
    // TODO(architect): Review allowOutsideOutDir logic inside build-angular.
    // // Add invalid asset config in angular.json.
    // .then(() => updateJsonFile('angular.json', configJson => {
    //   const app = configJson['apps'][0];
    //   app['assets'] = [
    //     { 'glob': '**/*', 'input': '../node_modules/some-package/', 'output': '../temp' }
    //   ];
    // }))
    // .then(() => expectToFail(() => ng('build')))

    // // Set an exception for the invalid asset config in angular.json.
    // .then(() => updateJsonFile('angular.json', configJson => {
    //   const app = configJson['apps'][0];
    //   app['assets'] = [
    //     { 'glob': '**/*', 'input': '../node_modules/some-package/', 'output': '../temp',
    //       'allowOutsideOutDir': true }
    //   ];
    // }))
    // .then(() => ng('build'))

    // // This asset should fail even with the exception above.
    // .then(() => updateJsonFile('angular.json', configJson => {
    //   const app = configJson['apps'][0];
    //   app['assets'] = [
    //     { 'glob': '**/*', 'input': '../node_modules/some-package/', 'output': '../../temp',
    //       'allowOutsideOutDir': true }
    //   ];
    // }))
    // .then(() => expectToFail(() => ng('build')))

    // // This asset will not fail with the exception above.
    // .then(() => updateJsonFile('angular.json', configJson => {
    //   const app = configJson['apps'][0];
    //   app['outDir'] = tempDir;
    //   app['assets'] = [
    //     { 'glob': '**/*', 'input': '../node_modules/some-package/', 'output': tempDir,
    //       'allowOutsideOutDir': true }
    //   ];
    // }))
    // .then(() => ng('build'))
    // .then(() => updateJsonFile('angular.json', configJson => {
    //   const app = configJson['apps'][0];
    //   app['outDir'] = 'dist';
    // })

    // // This asset should also fail from reading from outside the project.
    // .then(() => updateJsonFile('angular.json', configJson => {
    //   const app = configJson['apps'][0];
    //   app['assets'] = [
    //     { 'glob': '**/*', 'input': '/temp-folder/outside/of/project', 'output': 'temp' }
    //   ];
    // }))
    // .then(() => expectToFail(() => ng('build')))

    // Add asset config in angular.json.
    .then(() => updateJsonFile('angular.json', workspaceJson => {
      const assets = [
        { 'glob': '**/*', 'input': 'projects/test-project/src/folder', 'output': 'folder' },
        { 'glob': 'glob-asset.txt' },
        { 'glob': 'output-asset.txt', 'output': 'output-folder' },
        { 'glob': '**/*', 'input': 'node_modules/some-package/', 'output': 'package-folder' }
      ];
      const appArchitect = workspaceJson.projects['test-project'].architect;
      appArchitect.build.options.assets = assets;
      appArchitect.test.options.assets = assets;
    }))
    // Test files are present on build output.
    .then(() => ng('build'))
    .then(() => expectFileToMatch('./dist/test-project/folder/folder-asset.txt', 'folder-asset.txt'))

    .then(() => expectFileToMatch('./dist/test-project/glob-asset.txt', 'glob-asset.txt'))
    .then(() => expectFileToMatch('./dist/test-project/output-folder/output-asset.txt', 'output-asset.txt'))
    .then(() => expectFileToMatch('./dist/test-project/package-folder/node_modules-asset.txt',
      'node_modules-asset.txt'))
    // .gitkeep shouldn't be copied.
    .then(() => expectToFail(() => expectFileToExist('dist/assets/.gitkeep')))
    // Update app to test assets are present.
    .then(_ => !ejected && writeMultipleFiles({
      'projects/test-project/src/app/app.module.ts': `
        import { BrowserModule } from '@angular/platform-browser';
        import { NgModule } from '@angular/core';
        import { FormsModule } from '@angular/forms';
        import { HttpModule } from '@angular/http';
        import { AppComponent } from './app.component';

        @NgModule({
          declarations: [
            AppComponent
          ],
          imports: [
            BrowserModule,
            FormsModule,
            HttpModule
          ],
          providers: [],
          bootstrap: [AppComponent]
        })
        export class AppModule { }
      `,
      'projects/test-project/src/app/app.component.ts': `
        import { Component } from '@angular/core';
        import { Http, Response } from '@angular/http';

        @Component({
          selector: 'app-root',
          template: '<p *ngFor="let asset of assets">{{asset.content }}</p>'
        })
        export class AppComponent {
          public assets = [
            { path: './folder/folder-asset.txt', content: '' },
            { path: './glob-asset.txt', content: '' },
            { path: './output-folder/output-asset.txt', content: '' },
            { path: './package-folder/node_modules-asset.txt', content: '' },
          ];
          constructor(private http: Http) {
            this.assets.forEach(asset => http.get(asset.path)
              .subscribe(res => asset.content = res['_body']));
          }
        }`,
      'projects/test-project/src/app/app.component.spec.ts': `
        import { TestBed, async } from '@angular/core/testing';
        import { HttpModule } from '@angular/http';
        import { AppComponent } from './app.component';

        describe('AppComponent', () => {
          beforeEach(async(() => {
            TestBed.configureTestingModule({
              imports: [
                HttpModule
              ],
              declarations: [
                AppComponent
              ]
            }).compileComponents();
          }));

          it('should create the app', async(() => {
            const fixture = TestBed.createComponent(AppComponent);
            const app = fixture.debugElement.componentInstance;
            expect(app).toBeTruthy();
          }));
        });`,
      'e2e/app.e2e-spec.ts': `
        import { browser, element, by } from 'protractor';

        describe('master-project App', function () {
          it('should display asset contents', () => {
            browser.get('/');
            element.all(by.css('app-root p')).then(function (assets) {
              expect(assets.length).toBe(4);
              expect(assets[0].getText()).toBe('folder-asset.txt');
              expect(assets[1].getText()).toBe('glob-asset.txt');
              expect(assets[2].getText()).toBe('output-asset.txt');
              expect(assets[3].getText()).toBe('node_modules-asset.txt');
            });
          });
        });`,
    }))
    .then(() => !ejected && ng('test', '--watch=false'))
    .then(() => !ejected && ng('e2e', 'test-project-e2e'));
}
