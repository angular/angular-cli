/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { runTargetSpec } from '@angular-devkit/architect/testing';
import { tap } from 'rxjs/operators';
import { host, karmaTargetSpec } from '../utils';


describe('Karma Builder assets', () => {
  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('works', (done) => {
    const assets: { [path: string]: string } = {
      './src/string-file-asset.txt': 'string-file-asset.txt',
      './src/string-folder-asset/file.txt': 'string-folder-asset.txt',
      './src/glob-asset.txt': 'glob-asset.txt',
      './src/folder/folder-asset.txt': 'folder-asset.txt',
      './src/output-asset.txt': 'output-asset.txt',
    };
    host.writeMultipleFiles(assets);
    host.writeMultipleFiles({
      'src/app/app.module.ts': `
        import { BrowserModule } from '@angular/platform-browser';
        import { NgModule } from '@angular/core';
        import { HttpModule } from '@angular/http';
        import { AppComponent } from './app.component';

        @NgModule({
          declarations: [
            AppComponent
          ],
          imports: [
            BrowserModule,
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

        @Component({
          selector: 'app-root',
          template: '<p *ngFor="let asset of assets">{{asset.content }}</p>'
        })
        export class AppComponent {
          public assets = [
            { path: './string-file-asset.txt', content: '' },
            { path: './string-folder-asset/file.txt', content: '' },
            { path: './glob-asset.txt', content: '' },
            { path: './folder/folder-asset.txt', content: '' },
            { path: './output-folder/output-asset.txt', content: '' },
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
    });

    const overrides = {
      assets: [
        'src/string-file-asset.txt',
        'src/string-folder-asset',
        { glob: 'glob-asset.txt', input: 'src/', output: '/' },
        { glob: 'output-asset.txt', input: 'src/', output: '/output-folder' },
        { glob: '**/*', input: 'src/folder', output: '/folder' },
      ],
    };

    runTargetSpec(host, karmaTargetSpec, overrides).pipe(
      tap(buildEvent => expect(buildEvent.success).toBe(true)),
    ).toPromise().then(done, done.fail);
  }, 45000);
});
