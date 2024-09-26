/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { execute } from '../../index';
import { BASE_OPTIONS, KARMA_BUILDER_INFO, describeKarmaBuilder } from '../setup';

describeKarmaBuilder(execute, KARMA_BUILDER_INFO, (harness, setupTarget) => {
  describe('Option: "styles"', () => {
    beforeEach(async () => {
      await setupTarget(harness);
    });

    it(`processes 'styles.css' styles`, async () => {
      await harness.writeFiles({
        'src/styles.css': 'p {display: none}',
        'src/app/app.component.ts': `
          import { Component } from '@angular/core';

          @Component({
            selector: 'app-root',
            template: '<p>Hello World</p>'
          })
          export class AppComponent {
          }
         `,
        'src/app/app.component.spec.ts': `
          import { TestBed } from '@angular/core/testing';
          import { AppComponent } from './app.component';

          describe('AppComponent', () => {
            beforeEach(() => TestBed.configureTestingModule({
              declarations: [AppComponent]
            }));

            it('should not contain text that is hidden via css', () => {
              const fixture = TestBed.createComponent(AppComponent);
              expect(fixture.nativeElement.innerText).not.toContain('Hello World');
            });
          });`,
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        styles: ['src/styles.css'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it('processes style with bundleName', async () => {
      await harness.writeFiles({
        'src/dark-theme.css': '',
        'src/app/app.module.ts': `
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
        'src/app/app.component.ts': `
        import { Component } from '@angular/core';
        import { HttpClient } from '@angular/common/http';
        @Component({
          selector: 'app-root',
          template: '<p *ngFor="let asset of css">{{ asset.content }}</p>'
        })
        export class AppComponent {
          public assets = [
            { path: './dark-theme.css', content: '' },
          ];
          constructor(private http: HttpClient) {
            this.assets.forEach(asset => http.get(asset.path, { responseType: 'text' })
              .subscribe(res => asset.content = res));
          }
        }`,
        'src/app/app.component.spec.ts': `
        import { TestBed } from '@angular/core/testing';
        import { HttpClientModule } from '@angular/common/http';
        import { AppComponent } from './app.component';
        describe('AppComponent', () => {
          beforeEach(() => TestBed.configureTestingModule({
            imports: [HttpClientModule],
            declarations: [AppComponent]
          }));
          it('should create the app', () => {
            const fixture = TestBed.createComponent(AppComponent);
            const app = fixture.debugElement.componentInstance;
            expect(app).toBeTruthy();
          });
        });`,
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        styles: [
          {
            inject: false,
            input: 'src/dark-theme.css',
            bundleName: 'dark-theme',
          },
        ],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it('fails and shows an error if style does not exist', async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        styles: ['src/test-style-a.css'],
      });

      const { result, logs } = await harness.executeOnce({ outputLogsOnFailure: false });

      expect(result?.success).toBeFalse();
      expect(logs).toContain(
        jasmine.objectContaining({
          level: 'error',
          message: jasmine.stringMatching(
            /(Can't|Could not) resolve ['"]src\/test-style-a.css['"]/,
          ),
        }),
      );
    });
  });
});
