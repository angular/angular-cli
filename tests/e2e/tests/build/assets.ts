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


export default function () {
  // Disable parts of it in webpack tests.
  const ejected = getGlobalVariable('argv').eject;

  return Promise.resolve()
    .then(_ => createDir('./src/folder'))
    .then(_ => createDir('./node_modules/some-package/'))
    // Write assets.
    .then(_ => writeMultipleFiles({
      './src/folder/.gitkeep': '',
      './src/folder/folder-asset.txt': 'folder-asset.txt',
      './src/string-asset.txt': 'string-asset.txt',
      './src/glob-asset.txt': 'glob-asset.txt',
      './src/output-asset.txt': 'output-asset.txt',
      './node_modules/some-package/node_modules-asset.txt': 'node_modules-asset.txt',
    }))
    // Add asset config in .angular-cli.json.
    .then(() => updateJsonFile('.angular-cli.json', configJson => {
      const app = configJson['apps'][0];
      app['assets'] = [
        'folder',
        'string-asset.txt',
        { 'glob': 'glob-asset.txt' },
        { 'glob': 'output-asset.txt', 'output': 'output-folder' },
        { 'glob': '**/*', 'input': '../node_modules/some-package/', 'output': 'package-folder' }
      ];
    }))
    // Test files are present on build output.
    .then(() => ng('build'))
    .then(() => expectFileToMatch('./dist/folder/folder-asset.txt', 'folder-asset.txt'))
    .then(() => expectFileToMatch('./dist/string-asset.txt', 'string-asset.txt'))
    .then(() => expectFileToMatch('./dist/glob-asset.txt', 'glob-asset.txt'))
    .then(() => expectFileToMatch('./dist/output-folder/output-asset.txt', 'output-asset.txt'))
    .then(() => expectFileToMatch('./dist/package-folder/node_modules-asset.txt',
      'node_modules-asset.txt'))
    // .gitkeep shouldn't be copied.
    .then(() => expectToFail(() => expectFileToExist('dist/assets/.gitkeep')))
    // Update app to test assets are present.
    .then(_ => !ejected && writeMultipleFiles({
      'src/app/app.module.ts': `
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
      'src/app/app.component.ts': `
        import { Component } from '@angular/core';
        import { Http, Response } from '@angular/http';
        import 'rxjs/add/operator/map';

        @Component({
          selector: 'app-root',
          template: '<p *ngFor="let asset of assets">{{asset.content }}</p>'
        })
        export class AppComponent {
          public assets = [
            { path: './folder/folder-asset.txt', content: '' },
            { path: './string-asset.txt', content: '' },
            { path: './glob-asset.txt', content: '' },
            { path: './output-folder/output-asset.txt', content: '' },
            { path: './package-folder/node_modules-asset.txt', content: '' },
          ];
          constructor(private http: Http) {
            this.assets.forEach(asset => http.get(asset.path)
              .subscribe(res => asset.content = res['_body']));
          }
        }`,
      'src/app/app.component.spec.ts': `
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
              expect(assets.length).toBe(5);
              expect(assets[0].getText()).toBe('folder-asset.txt');
              expect(assets[1].getText()).toBe('string-asset.txt');
              expect(assets[2].getText()).toBe('glob-asset.txt');
              expect(assets[3].getText()).toBe('output-asset.txt');
              expect(assets[4].getText()).toBe('node_modules-asset.txt');
            });
          });
        });`,
    }))
    .then(() => !ejected && ng('test', '--single-run'))
    .then(() => !ejected && ng('e2e'));
}
