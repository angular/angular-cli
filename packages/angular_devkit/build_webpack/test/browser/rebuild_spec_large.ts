/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { join, normalize, virtualFs } from '@angular-devkit/core';
import { concatMap, debounceTime, take, tap } from 'rxjs/operators';
import {
  TestLogger,
  TestProjectHost,
  browserWorkspaceTarget,
  makeWorkspace,
  workspaceRoot,
} from '../utils';
import { lazyModuleFiles, lazyModuleImport } from './lazy-module_spec_large';


describe('Browser Builder', () => {
  const host = new TestProjectHost(workspaceRoot);
  const architect = new Architect(normalize(workspaceRoot), host);
  const outputPath = normalize('dist');

  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));


  it('rebuilds on TS file changes', (done) => {
    if (process.env['APPVEYOR']) {
      // TODO: This test fails on Windows CI, figure out why.
      done();

      return;
    }
    const goldenValueFiles: { [path: string]: string } = {
      'src/app/app.module.ts': `
        import { BrowserModule } from '@angular/platform-browser';
        import { NgModule } from '@angular/core';

        import { AppComponent } from './app.component';

        @NgModule({
          declarations: [
            AppComponent
          ],
          imports: [
            BrowserModule
          ],
          providers: [],
          bootstrap: [AppComponent]
        })
        export class AppModule { }

        console.log('$$_E2E_GOLDEN_VALUE_1');
        export let X = '$$_E2E_GOLDEN_VALUE_2';
      `,
      'src/main.ts': `
        import { enableProdMode } from '@angular/core';
        import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

        import { AppModule } from './app/app.module';
        import { environment } from './environments/environment';

        if (environment.production) {
          enableProdMode();
        }

        platformBrowserDynamic().bootstrapModule(AppModule);

        import * as m from './app/app.module';
        console.log(m.X);
        console.log('$$_E2E_GOLDEN_VALUE_3');
      `,
    };

    const overrides = { watch: true };

    let buildNumber = 0;

    architect.loadWorkspaceFromJson(makeWorkspace(browserWorkspaceTarget)).pipe(
      concatMap(() => architect.run(architect.getTarget({ overrides }))),
      // We must debounce on watch mode because file watchers are not very accurate.
      // Changes from just before a process runs can be picked up and cause rebuilds.
      // In this case, cleanup from the test right before this one causes a few rebuilds.
      debounceTime(500),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        buildNumber += 1;
        switch (buildNumber) {
          case 1:
            // No lazy chunk should exist.
            expect(host.asSync().exists(join(outputPath, 'lazy-module.js'))).toBe(false);
            // Write the lazy chunk files. Order matters when writing these, because of imports.
            host.writeMultipleFiles(lazyModuleFiles);
            host.writeMultipleFiles(lazyModuleImport);
            break;

          case 2:
            // A lazy chunk should have been with the filename.
            expect(host.asSync().exists(join(outputPath, 'lazy-lazy-module.js'))).toBe(true);
            host.writeMultipleFiles(goldenValueFiles);
            break;

          case 3:
            // The golden values should be present and in the right order.
            const re = new RegExp(
              /\$\$_E2E_GOLDEN_VALUE_1(.|\n|\r)*/.source
              + /\$\$_E2E_GOLDEN_VALUE_2(.|\n|\r)*/.source
              + /\$\$_E2E_GOLDEN_VALUE_3/.source,
            );
            const fileName = './dist/main.js';
            const content = virtualFs.fileBufferToString(host.asSync().read(normalize(fileName)));
            expect(content).toMatch(re);
            break;

          default:
            break;
        }
      }),
      take(3),
    ).subscribe(undefined, done.fail, done);
  }, 60000);

  it('rebuilds on CSS changes', (done) => {
    const overrides = { watch: true };

    architect.loadWorkspaceFromJson(makeWorkspace(browserWorkspaceTarget)).pipe(
      concatMap(() => architect.run(architect.getTarget({ overrides }))),
      debounceTime(500),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => host.appendToFile('src/app/app.component.css', ':host { color: blue; }')),
      take(2),
    ).subscribe(undefined, done.fail, done);
  }, 60000);

  it('type checks on rebuilds', (done) => {
    host.writeMultipleFiles({
      'src/funky2.ts': `export const funky2 = (value: string) => value + 'hello';`,
      'src/funky.ts': `export * from './funky2';`,
    });
    host.appendToFile('src/main.ts', `
      import { funky2 } from './funky';
      console.log(funky2('town'));
    `);

    const overrides = { watch: true, forkTypeChecker: false };
    const logger = new TestLogger('rebuild-type-errors');
    const typeError = `is not assignable to parameter of type 'number'`;
    let buildNumber = 0;

    architect.loadWorkspaceFromJson(makeWorkspace(browserWorkspaceTarget)).pipe(
      concatMap(() => architect.run(architect.getTarget({ overrides }), { logger })),
      debounceTime(500),
      tap((buildEvent) => {
        buildNumber += 1;
        switch (buildNumber) {
          case 1:
            expect(buildEvent.success).toBe(true);
            // Make an invalid version of the file.
            // Should trigger a rebuild, this time an error is expected.
            host.writeMultipleFiles({
              'src/funky2.ts': `export const funky2 = (value: number) => value + 1;`,
            });
            break;

          case 2:
            // The second build should error out with a type error on the type of an argument.
            expect(buildEvent.success).toBe(false);
            expect(logger.includes(typeError)).toBe(true);
            logger.clear();
            // Change an UNRELATED file and the error should still happen.
            // Should trigger a rebuild, this time an error is also expected.
            host.appendToFile('src/app/app.module.ts', `console.log(1);`);
            break;

          case 3:
            // The third build should have the same error as the first.
            expect(buildEvent.success).toBe(false);
            expect(logger.includes(typeError)).toBe(true);
            logger.clear();
            // Fix the error.
            host.writeMultipleFiles({
              'src/funky2.ts': `export const funky2 = (value: string) => value + 'hello';`,
            });
            break;

          default:
            expect(buildEvent.success).toBe(true);
            break;
        }
      }),
      take(4),
    ).subscribe(undefined, done.fail, done);
  }, 120000);

  it('rebuilds on type changes', (done) => {
    host.writeMultipleFiles({ 'src/type.ts': `export type MyType = number;` });
    host.appendToFile('src/main.ts', `import { MyType } from './type';`);

    const overrides = { watch: true };

    architect.loadWorkspaceFromJson(makeWorkspace(browserWorkspaceTarget)).pipe(
      concatMap(() => architect.run(architect.getTarget({ overrides }))),
      debounceTime(500),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => host.writeMultipleFiles({ 'src/type.ts': `export type MyType = string;` })),
      take(2),
    ).subscribe(undefined, done.fail, done);
  }, 30000);


  // TODO: writing back the original content in build 4 doesn't seem to trigger a rebuild
  // on windows. Figure it out when there is time.
  xit('rebuilds after errors in AOT', (done) => {
    // Save the original contents of `./src/app/app.component.ts`.
    const origContent = virtualFs.fileBufferToString(
      host.asSync().read(normalize('src/app/app.component.ts')));
    // Add a major static analysis error on a non-main file to the initial build.
    host.replaceInFile('./src/app/app.component.ts', `'app-root'`, `(() => 'app-root')()`);

    const overrides = { watch: true, aot: true, forkTypeChecker: false };
    const logger = new TestLogger('rebuild-aot-errors');
    const staticAnalysisError = 'Function expressions are not supported in decorators';
    const syntaxError = 'Declaration or statement expected.';
    let buildNumber = 0;

    architect.loadWorkspaceFromJson(makeWorkspace(browserWorkspaceTarget)).pipe(
      concatMap(() => architect.run(architect.getTarget({ overrides }), { logger })),
      debounceTime(1000),
      tap((buildEvent) => {
        buildNumber += 1;
        switch (buildNumber) {
          case 1:
            // The first build should error out with a static analysis error.
            expect(buildEvent.success).toBe(false);
            expect(logger.includes(staticAnalysisError)).toBe(true);
            logger.clear();
            // Fix the static analysis error.
            host.writeMultipleFiles({ 'src/app/app.component.ts': origContent });
            break;

          case 2:
            expect(buildEvent.success).toBe(true);
            // Add an syntax error to a non-main file.
            host.appendToFile('src/app/app.component.ts', `]]]`);
            break;

          case 3:
            // The third build should have TS syntax error.
            expect(buildEvent.success).toBe(false);
            expect(logger.includes(syntaxError)).toBe(true);
            logger.clear();
            // Fix the syntax error, but add the static analysis error again.
            host.writeMultipleFiles({
              'src/app/app.component.ts': origContent.replace(`'app-root'`, `(() => 'app-root')()`),
            });
            break;

          case 4:
            expect(buildEvent.success).toBe(false);
            // Restore the file to a error-less state.
            host.writeMultipleFiles({ 'src/app/app.component.ts': origContent });
            break;

          case 5:
            // The fifth build should have everything fixed..
            expect(buildEvent.success).toBe(true);
            expect(logger.includes(staticAnalysisError)).toBe(true);
            break;
        }
      }),
      take(5),
    ).subscribe(undefined, done.fail, done);
  }, 60000);


  xit('rebuilds AOT factories', (done) => {
    if (process.env['APPVEYOR']) {
      // TODO: appending to main.ts doesn't seem to be triggering rebuilds on windows.
      // Figure it out when there is time.
      done();

      return;
    }

    host.writeMultipleFiles({
      'src/app/app.component.css': `
        @import './imported-styles.css';
        body {background-color: #00f;}
      `,
      'src/app/imported-styles.css': 'p {color: #f00;}',
    });

    const overrides = { watch: true, aot: true, forkTypeChecker: false };
    let buildNumber = 0;

    architect.loadWorkspaceFromJson(makeWorkspace(browserWorkspaceTarget)).pipe(
      concatMap(() => architect.run(architect.getTarget({ overrides }))),
      debounceTime(1000),
      tap((buildEvent) => {
        buildNumber += 1;
        const fileName = './dist/main.js';
        let content;
        switch (buildNumber) {
          case 1:
            // Trigger a few rebuilds first.
            // The AOT compiler is still optimizing rebuilds on the first rebuilds.
            expect(buildEvent.success).toBe(true);
            host.appendToFile('src/main.ts', 'console.log(1);');
            break;

          case 2:
            expect(buildEvent.success).toBe(true);
            host.appendToFile('src/main.ts', 'console.log(1);');
            break;

          case 3:
            // Change the component html.
            expect(buildEvent.success).toBe(true);
            host.appendToFile('src/app/app.component.html', '<p>HTML_REBUILD_STRING<p>');
            break;

          case 4:
            // Check if html changes are added to factories.
            expect(buildEvent.success).toBe(true);
            content = virtualFs.fileBufferToString(host.asSync().read(normalize(fileName)));
            expect(content).toContain('HTML_REBUILD_STRING');
            // Change the component css.
            host.appendToFile('src/app/app.component.css', 'CSS_REBUILD_STRING {color: #f00;}');
            break;

          case 5:
            // Check if css changes are added to factories.
            expect(buildEvent.success).toBe(true);
            content = virtualFs.fileBufferToString(host.asSync().read(normalize(fileName)));
            expect(content).toContain('CSS_REBUILD_STRING');
            // Change the component css import.
            host.appendToFile('src/app/app.component.css', 'CSS_DEP_REBUILD_STRING {color: #f00;}');
            break;

          case 6:
            // Check if css import changes are added to factories.
            expect(buildEvent.success).toBe(true);
            content = virtualFs.fileBufferToString(host.asSync().read(normalize(fileName)));
            expect(content).toContain('CSS_DEP_REBUILD_STRING');
            // Change the component itself.
            host.replaceInFile('src/app/app.component.ts', 'app-root',
              'app-root-FACTORY_REBUILD_STRING');
            break;

          case 7:
            // Check if component changes are added to factories.
            expect(buildEvent.success).toBe(true);
            content = virtualFs.fileBufferToString(host.asSync().read(normalize(fileName)));
            expect(content).toContain('FACTORY_REBUILD_STRING');
            break;
        }
      }),
      take(7),
    ).subscribe(undefined, done.fail, done);
  }, 60000);
});
