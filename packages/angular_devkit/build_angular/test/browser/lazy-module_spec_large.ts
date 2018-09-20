/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { DefaultTimeout, runTargetSpec } from '@angular-devkit/architect/testing';
import { join, normalize } from '@angular-devkit/core';
import { tap } from 'rxjs/operators';
import { BrowserBuilderSchema } from '../../src';
import { browserTargetSpec, host } from '../utils';


export const lazyModuleFiles: { [path: string]: string } = {
  'src/app/lazy/lazy-routing.module.ts': `
    import { NgModule } from '@angular/core';
    import { Routes, RouterModule } from '@angular/router';

    const routes: Routes = [];

    @NgModule({
      imports: [RouterModule.forChild(routes)],
      exports: [RouterModule]
    })
    export class LazyRoutingModule { }
  `,
  'src/app/lazy/lazy.module.ts': `
    import { NgModule } from '@angular/core';
    import { CommonModule } from '@angular/common';

    import { LazyRoutingModule } from './lazy-routing.module';

    @NgModule({
      imports: [
        CommonModule,
        LazyRoutingModule
      ],
      declarations: []
    })
    export class LazyModule { }
  `,
};

export const lazyModuleImport: { [path: string]: string } = {
  'src/app/app.module.ts': `
    import { BrowserModule } from '@angular/platform-browser';
    import { NgModule } from '@angular/core';
    import { HttpModule } from '@angular/http';

    import { AppComponent } from './app.component';
    import { RouterModule } from '@angular/router';

    @NgModule({
      declarations: [
        AppComponent
      ],
      imports: [
        BrowserModule,
        HttpModule,
        RouterModule.forRoot([
          { path: 'lazy', loadChildren: './lazy/lazy.module#LazyModule' }
        ])
      ],
      providers: [],
      bootstrap: [AppComponent]
    })
    export class AppModule { }
  `,
};

describe('Browser Builder lazy modules', () => {

  const outputPath = normalize('dist');

  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('supports lazy bundle for lazy routes with JIT', (done) => {
    host.writeMultipleFiles(lazyModuleFiles);
    host.writeMultipleFiles(lazyModuleImport);

    runTargetSpec(host, browserTargetSpec).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        expect(host.scopedSync().exists(join(outputPath, 'lazy-lazy-module.js'))).toBe(true);
      }),
    ).toPromise().then(done, done.fail);
  });

  it('supports lazy bundle for lazy routes with AOT', (done) => {
    host.writeMultipleFiles(lazyModuleFiles);
    host.writeMultipleFiles(lazyModuleImport);

    runTargetSpec(host, browserTargetSpec, { aot: true }).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        expect(host.scopedSync()
          .exists(join(outputPath, 'lazy-lazy-module-ngfactory.js'))).toBe(true);
      }),
    ).toPromise().then(done, done.fail);
  });

  it(`supports lazy bundle for import() calls`, (done) => {
    host.writeMultipleFiles({
      'src/lazy-module.ts': 'export const value = 42;',
      'src/main.ts': `import('./lazy-module');`,
    });
    // Using `import()` in TS require targetting `esnext` modules.
    host.replaceInFile('src/tsconfig.app.json', `"module": "es2015"`, `"module": "esnext"`);

    runTargetSpec(host, browserTargetSpec).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => expect(host.scopedSync().exists(join(outputPath, '0.js'))).toBe(true)),
    ).toPromise().then(done, done.fail);
  });

  it(`supports lazy bundle for dynamic import() calls`, (done) => {
    host.writeMultipleFiles({
      'src/lazy-module.ts': 'export const value = 42;',
      'src/main.ts': `
        const lazyFileName = 'module';
        import(/*webpackChunkName: '[request]'*/'./lazy-' + lazyFileName);
      `,
    });
    host.replaceInFile('src/tsconfig.app.json', `"module": "es2015"`, `"module": "esnext"`);

    runTargetSpec(host, browserTargetSpec).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => expect(host.scopedSync().exists(join(outputPath, 'lazy-module.js'))).toBe(true)),
    ).toPromise().then(done, done.fail);
  });

  it(`supports lazy bundle for System.import() calls`, (done) => {
    host.writeMultipleFiles({
      'src/lazy-module.ts': 'export const value = 42;',
      'src/main.ts': `declare var System: any; System.import('./lazy-module');`,
    });

    runTargetSpec(host, browserTargetSpec).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => expect(host.scopedSync().exists(join(outputPath, '0.js'))).toBe(true)),
    ).toPromise().then(done, done.fail);
  });

  it(`supports hiding lazy bundle module name`, (done) => {
    host.writeMultipleFiles({
      'src/lazy-module.ts': 'export const value = 42;',
      'src/main.ts': `const lazyFileName = 'module'; import('./lazy-' + lazyFileName);`,
    });
    host.replaceInFile('src/tsconfig.app.json', `"module": "es2015"`, `"module": "esnext"`);

    const overrides: Partial<BrowserBuilderSchema> = { namedChunks: false };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => expect(host.scopedSync().exists(join(outputPath, '0.js'))).toBe(true)),
    ).toPromise().then(done, done.fail);
  });

  it(`supports making a common bundle for shared lazy modules`, (done) => {
    host.writeMultipleFiles({
      'src/one.ts': `import * as http from '@angular/http'; console.log(http);`,
      'src/two.ts': `import * as http from '@angular/http'; console.log(http);`,
      'src/main.ts': `import('./one'); import('./two');`,
    });
    host.replaceInFile('src/tsconfig.app.json', `"module": "es2015"`, `"module": "esnext"`);

    runTargetSpec(host, browserTargetSpec).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => expect(host.scopedSync().exists(join(outputPath, '0.js'))).toBe(true)),
      tap(() => expect(host.scopedSync().exists(join(outputPath, '1.js'))).toBe(true)),
      // TODO: the chunk with common modules used to be called `common`, see why that changed.
      tap(() => expect(host.scopedSync().exists(join(outputPath, '2.js'))).toBe(true)),
    ).toPromise().then(done, done.fail);
  });

  it(`supports disabling the common bundle`, (done) => {
    host.writeMultipleFiles({
      'src/one.ts': `import * as http from '@angular/http'; console.log(http);`,
      'src/two.ts': `import * as http from '@angular/http'; console.log(http);`,
      'src/main.ts': `import('./one'); import('./two');`,
    });
    host.replaceInFile('src/tsconfig.app.json', `"module": "es2015"`, `"module": "esnext"`);

    const overrides: Partial<BrowserBuilderSchema> = { commonChunk: false };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => expect(host.scopedSync().exists(join(outputPath, '0.js'))).toBe(true)),
      tap(() => expect(host.scopedSync().exists(join(outputPath, '1.js'))).toBe(true)),
      tap(() => expect(host.scopedSync().exists(join(outputPath, '2.js'))).toBe(false)),
    ).toPromise().then(done, done.fail);
  });

  it(`supports extra lazy modules array in JIT`, (done) => {
    host.writeMultipleFiles(lazyModuleFiles);
    host.writeMultipleFiles({
      'src/app/app.component.ts': `
        import { Component, SystemJsNgModuleLoader } from '@angular/core';

        @Component({
          selector: 'app-root',
          templateUrl: './app.component.html',
          styleUrls: ['./app.component.css'],
        })
        export class AppComponent {
          title = 'app';
          constructor(loader: SystemJsNgModuleLoader) {
            // Module will be split at build time and loaded when requested below
            loader.load('src/app/lazy/lazy.module#LazyModule')
              .then((factory) => { /* Use factory here */ });
          }
        }`,
    });
    host.replaceInFile('src/tsconfig.app.json', `"module": "es2015"`, `"module": "esnext"`);

    const overrides: Partial<BrowserBuilderSchema> = { lazyModules: ['src/app/lazy/lazy.module'] };

    runTargetSpec(host, browserTargetSpec, overrides).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => expect(host.scopedSync().exists(join(outputPath, 'src-app-lazy-lazy-module.js')))
        .toBe(true)),
    ).toPromise().then(done, done.fail);
  });

  it(`supports extra lazy modules array in AOT`, (done) => {
    host.writeMultipleFiles(lazyModuleFiles);
    host.writeMultipleFiles({
      'src/app/app.component.ts': `
        import { Component, SystemJsNgModuleLoader } from '@angular/core';

        @Component({
          selector: 'app-root',
          templateUrl: './app.component.html',
          styleUrls: ['./app.component.css'],
        })
        export class AppComponent {
          title = 'app';
          constructor(loader: SystemJsNgModuleLoader) {
            // Module will be split at build time and loaded when requested below
            loader.load('src/app/lazy/lazy.module#LazyModule')
              .then((factory) => { /* Use factory here */ });
          }
        }`,
    });
    host.replaceInFile('src/tsconfig.app.json', `"module": "es2015"`, `"module": "esnext"`);

    const overrides: Partial<BrowserBuilderSchema> = {
      lazyModules: ['src/app/lazy/lazy.module'],
      aot: true,
      optimization: true,
    };

    runTargetSpec(host, browserTargetSpec, overrides, DefaultTimeout * 2).pipe(
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => expect(host.scopedSync()
        .exists(join(outputPath, 'src-app-lazy-lazy-module-ngfactory.js')))
        .toBe(true)),
    ).toPromise().then(done, done.fail);
  });
});
