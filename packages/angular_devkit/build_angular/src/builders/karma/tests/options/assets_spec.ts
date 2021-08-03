/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { execute } from '../../index';
import { BASE_OPTIONS, KARMA_BUILDER_INFO, describeBuilder } from '../setup';

describeBuilder(execute, KARMA_BUILDER_INFO, (harness) => {
  describe('Option: "assets"', () => {
    it('includes assets', async () => {
      await harness.writeFiles({
        './src/string-file-asset.txt': 'string-file-asset.txt',
        './src/string-folder-asset/file.txt': 'string-folder-asset.txt',
        './src/glob-asset.txt': 'glob-asset.txt',
        './src/folder/folder-asset.txt': 'folder-asset.txt',
        './src/output-asset.txt': 'output-asset.txt',
        './src/app/app.module.ts': `
            import { BrowserModule } from '@angular/platform-browser';
            import { NgModule } from '@angular/core';
            import { HttpClientModule } from '@angular/common/http';
            import { AppComponent } from './app.component';
    
            @NgModule({
              declarations: [
                AppComponent
              ],
              imports: [
                BrowserModule,
                HttpClientModule
              ],
              providers: [],
              bootstrap: [AppComponent]
            })
            export class AppModule { }
          `,
        './src/app/app.component.ts': `
            import { Component } from '@angular/core';
            import { HttpClient } from '@angular/common/http';
    
            @Component({
              selector: 'app-root',
              template: '<p *ngFor="let asset of assets">{{ asset.content }}</p>'
            })
            export class AppComponent {
              public assets = [
                { path: './string-file-asset.txt', content: '' },
                { path: './string-folder-asset/file.txt', content: '' },
                { path: './glob-asset.txt', content: '' },
                { path: './folder/folder-asset.txt', content: '' },
                { path: './output-folder/output-asset.txt', content: '' },
              ];
              constructor(private http: HttpClient) {
                this.assets.forEach(asset => http.get(asset.path, { responseType: 'text' })
                  .subscribe(res => asset.content = res));
              }
            }`,
        './src/app/app.component.spec.ts': `
            import { TestBed } from '@angular/core/testing';
            import { HttpClientModule } from '@angular/common/http';
            import { AppComponent } from './app.component';
    
            describe('AppComponent', () => {
              beforeEach(async () => {
                await TestBed.configureTestingModule({
                  imports: [
                    HttpClientModule
                  ],
                  declarations: [
                    AppComponent
                  ]
                }).compileComponents();
              });
    
              it('should create the app', () => {
                const fixture = TestBed.createComponent(AppComponent);
                const app = fixture.debugElement.componentInstance;
                expect(app).toBeTruthy();
              });
            });`,
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        assets: [
          'src/string-file-asset.txt',
          'src/string-folder-asset',
          { glob: 'glob-asset.txt', input: 'src/', output: '/' },
          { glob: 'output-asset.txt', input: 'src/', output: '/output-folder' },
          { glob: '**/*', input: 'src/folder', output: '/folder' },
        ],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });
  });
});
