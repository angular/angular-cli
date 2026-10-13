/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { execute } from '../../index';
import {
  BASE_OPTIONS,
  describeBuilder,
  UNIT_TEST_BUILDER_INFO,
  setupApplicationTarget,
} from '../setup';

describeBuilder(execute, UNIT_TEST_BUILDER_INFO, (harness) => {
  describe('Option: "include"', () => {
    beforeEach(async () => {
      setupApplicationTarget(harness);
    });

    it(`should fail when includes doesn't match any files`, async () => {
      harness.useTarget('test', {
        ...BASE_OPTIONS,
        include: ['abc.spec.ts', 'def.spec.ts'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeFalse();
    });

    [
      {
        test: 'relative path from workspace to spec',
        input: ['src/app/app.component.spec.ts'],
      },
      {
        test: 'relative path from project root to spec',
        input: ['app/services/test.service.spec.ts'],
      },
      {
        test: 'relative path from workspace to directory',
        input: ['src/app/services'],
      },
      {
        test: 'relative path from project root to directory',
        input: ['app/services'],
      },
      {
        test: 'glob with spec suffix',
        input: ['**/*.pipe.spec.ts', '**/*.pipe.spec.ts', '**/*test.service.spec.ts'],
      },
    ].forEach((options, index) => {
      it(`should work with ${options.test} (${index})`, async () => {
        await harness.writeFiles({
          'src/app/services/test.service.spec.ts': `
            describe('TestService', () => {
              it('should succeed', () => {
                expect(true).toBe(true);
              });
            });`,
          'src/app/failing.service.spec.ts': `
            describe('FailingService', () => {
              it('should be ignored', () => {
                expect(true).toBe(false);
              });
            });`,
          'src/app/property.pipe.spec.ts': `
            describe('PropertyPipe', () => {
              it('should succeed', () => {
                expect(true).toBe(true);
              });
            });`,
        });

        harness.useTarget('test', {
          ...BASE_OPTIONS,
          include: options.input,
        });

        const { result } = await harness.executeOnce();
        expect(result?.success).toBeTrue();
      });
    });

    it('should ignore TypeScript compilation errors in non-included test files', async () => {
      await harness.writeFiles({
        'src/app/services/test.service.spec.ts': `
          describe('TestService', () => {
            it('should succeed', () => {
              expect(true).toBe(true);
            });
          });`,
        'src/app/broken.service.spec.ts': `
          // This test has a TypeScript type error that would fail compilation if compiled
          const invalidNumber: number = 'not a number';
          describe('BrokenService', () => {
            it('should fail compilation', () => {
              expect(invalidNumber).toBe(1);
            });
          });`,
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        include: ['src/app/services/test.service.spec.ts'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it('should not compile unimported application files when testing standalone code', async () => {
      await harness.writeFiles({
        'src/tsconfig.spec.json': JSON.stringify({
          extends: '../tsconfig.json',
          compilerOptions: {
            outDir: '../out-tsc/spec',
            types: ['jasmine', '@angular/localize'],
          },
          files: ['polyfills.ts'],
          include: ['**/*.ts', '**/*.d.ts'],
        }),
        'src/app/services/test.service.spec.ts': `
          describe('TestService', () => {
            it('should succeed', () => {
              expect(true).toBe(true);
            });
          });`,
        'src/app/unused-broken.ts': `
          // This unimported file has a TypeScript error and should not be compiled for standalone tests
          export const invalidNumber: number = 'not a number';
        `,
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        include: ['src/app/services/test.service.spec.ts'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it('should resolve NgModule scope when testing a non-standalone component without importing the NgModule', async () => {
      await harness.writeFiles({
        'src/tsconfig.spec.json': JSON.stringify({
          extends: '../tsconfig.json',
          compilerOptions: {
            outDir: '../out-tsc/spec',
            types: ['jasmine', '@angular/localize'],
          },
          files: ['polyfills.ts'],
          include: ['**/*.ts', '**/*.d.ts'],
        }),
        'src/app/app.ts': `
          import { Component } from '@angular/core';

          @Component({
            selector: 'app-root',
            template: '<h1>Hello, {{ title }}</h1><router-outlet />',
            standalone: false,
          })
          export class App {
            title = 'test';
          }
        `,
        'src/app/app-module.ts': `
          import { NgModule } from '@angular/core';
          import { BrowserModule } from '@angular/platform-browser';
          import { RouterModule } from '@angular/router';
          import { App } from './app';

          @NgModule({
            declarations: [App],
            imports: [BrowserModule, RouterModule.forRoot([])],
            bootstrap: [App],
          })
          export class AppModule {}
        `,
        'src/app/app.spec.ts': `
          import { TestBed } from '@angular/core/testing';
          import { RouterModule } from '@angular/router';
          import { App } from './app';

          describe('App', () => {
            beforeEach(async () => {
              await TestBed.configureTestingModule({
                imports: [RouterModule.forRoot([])],
                declarations: [App],
              }).compileComponents();
            });

            it('should create the app', () => {
              const fixture = TestBed.createComponent(App);
              expect(fixture.componentInstance).toBeTruthy();
            });
          });
        `,
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        include: ['src/app/app.spec.ts'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });

    it('should not compile unimported files when a non-standalone component NgModule is imported by the test', async () => {
      await harness.writeFiles({
        'src/tsconfig.spec.json': JSON.stringify({
          extends: '../tsconfig.json',
          compilerOptions: {
            outDir: '../out-tsc/spec',
            types: ['jasmine', '@angular/localize'],
          },
          files: ['polyfills.ts'],
          include: ['**/*.ts', '**/*.d.ts'],
        }),
        'src/app/app.ts': `
          import { Component } from '@angular/core';

          @Component({
            selector: 'app-root',
            template: '<h1>Hello, {{ title }}</h1><router-outlet />',
            standalone: false,
          })
          export class App {
            title = 'test';
          }
        `,
        'src/app/app-module.ts': `
          import { NgModule } from '@angular/core';
          import { BrowserModule } from '@angular/platform-browser';
          import { RouterModule } from '@angular/router';
          import { App } from './app';

          @NgModule({
            declarations: [App],
            imports: [BrowserModule, RouterModule.forRoot([])],
            bootstrap: [App],
          })
          export class AppModule {}
        `,
        'src/app/app.spec.ts': `
          import { TestBed } from '@angular/core/testing';
          import { App } from './app';
          import { AppModule } from './app-module';

          describe('App', () => {
            beforeEach(async () => {
              await TestBed.configureTestingModule({
                imports: [AppModule],
              }).compileComponents();
            });

            it('should create the app', () => {
              const fixture = TestBed.createComponent(App);
              expect(fixture.componentInstance).toBeTruthy();
            });
          });
        `,
        'src/app/unused-broken.ts': `
          // This unimported file has a TypeScript error and should not be compiled when AppModule is already imported
          export const invalidNumber: number = 'not a number';
        `,
      });

      harness.useTarget('test', {
        ...BASE_OPTIONS,
        include: ['src/app/app.spec.ts'],
      });

      const { result } = await harness.executeOnce();
      expect(result?.success).toBeTrue();
    });
  });
});
