/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-big-function
import { Architect } from '@angular-devkit/architect';
import { TestLogger } from '@angular-devkit/architect/testing';
import { join, logging, normalize, virtualFs } from '@angular-devkit/core';
import { debounceTime, take, takeWhile, tap } from 'rxjs/operators';
import {
  createArchitect,
  host,
  lazyModuleFiles,
  lazyModuleFnImport,
  outputPath,
  veEnabled,
} from '../utils';

describe('Browser Builder rebuilds', () => {
  const target = { project: 'app', target: 'build' };
  // Rebuild tests are especially sensitive to time between writes due to file watcher
  // behaviour. Give them a while.
  const rebuildDebounceTime = 3000;
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('rebuilds on TS file changes', async () => {
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

    let phase = 1;
    const run = await architect.scheduleTarget(target, overrides);
    await run.output
      .pipe(
        debounceTime(rebuildDebounceTime),
        tap(result => {
          expect(result.success).toBe(true, 'build should succeed');
          const hasLazyChunk = host.scopedSync().exists(normalize('dist/lazy-lazy-module.js'));
          switch (phase) {
            case 1:
              // No lazy chunk should exist.
              if (!hasLazyChunk) {
                phase = 2;
                host.writeMultipleFiles({ ...lazyModuleFiles, ...lazyModuleFnImport });
              }
              break;

            case 2:
              // A lazy chunk should have been with the filename.
              if (hasLazyChunk) {
                phase = 3;
                host.writeMultipleFiles(goldenValueFiles);
              }
              break;

            case 3:
              // The golden values should be present and in the right order.
              const re = new RegExp(
                /\$\$_E2E_GOLDEN_VALUE_1(.|\n|\r)*/.source +
                  /\$\$_E2E_GOLDEN_VALUE_2(.|\n|\r)*/.source +
                  /\$\$_E2E_GOLDEN_VALUE_3/.source,
              );
              const fileName = './dist/main.js';
              const content = virtualFs.fileBufferToString(
                host.scopedSync().read(normalize(fileName)),
              );

              if (re.test(content)) {
                phase = 4;
              }
              break;
          }
        }),
        takeWhile(() => phase < 4),
      )
      .toPromise();
    await run.stop();
  });

  it('rebuilds on CSS changes', async () => {
    const overrides = { watch: true };

    const run = await architect.scheduleTarget(target, overrides);
    await run.output
      .pipe(
        debounceTime(rebuildDebounceTime),
        tap(buildEvent => expect(buildEvent.success).toBe(true)),
        tap(() => host.appendToFile('src/app/app.component.css', ':host { color: blue; }')),
        take(2),
      )
      .toPromise();
    await run.stop();
  });

  it('type checks on rebuilds', async () => {
    host.writeMultipleFiles({
      'src/funky2.ts': `export const funky2 = (value: string) => value + 'hello';`,
      'src/funky.ts': `export * from './funky2';`,
    });
    host.appendToFile(
      'src/main.ts',
      `
      import { funky2 } from './funky';
      console.log(funky2('town'));
    `,
    );

    const overrides = { watch: true, forkTypeChecker: false };
    const logger = new TestLogger('rebuild-type-errors');
    const typeError = `is not assignable to parameter of type 'number'`;
    let buildNumber = 0;

    const run = await architect.scheduleTarget(target, overrides, { logger });
    await run.output
      .pipe(
        debounceTime(rebuildDebounceTime),
        tap(buildEvent => {
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
      )
      .toPromise();
    await run.stop();
  });

  it('rebuilds on type changes', async () => {
    host.writeMultipleFiles({ 'src/type.ts': `export type MyType = number;` });
    host.appendToFile('src/main.ts', `import { MyType } from './type';`);

    const overrides = { watch: true };
    const run = await architect.scheduleTarget(target, overrides);
    await run.output
      .pipe(
        debounceTime(rebuildDebounceTime),
        tap(buildEvent => expect(buildEvent.success).toBe(true)),
        tap(() => host.writeMultipleFiles({ 'src/type.ts': `export type MyType = string;` })),
        take(2),
      )
      .toPromise();
  });

  it('rebuilds on transitive type-only file changes', async () => {
    if (veEnabled) {
      // TODO: https://github.com/angular/angular-cli/issues/15056
      pending('Only supported in Ivy.');

      return;
    }
    host.writeMultipleFiles({
      'src/interface1.ts': `
        import { Interface2 } from './interface2';
        export interface Interface1 extends Interface2 { }
      `,
      'src/interface2.ts': `
        import { Interface3 } from './interface3';
        export interface Interface2 extends Interface3 { }
      `,
      'src/interface3.ts': `export interface Interface3 { nbr: number; }`,
    });
    host.appendToFile('src/main.ts', `
      import { Interface1 } from './interface1';
      const something: Interface1 = { nbr: 43 };
    `);

    const overrides = { watch: true };
    const run = await architect.scheduleTarget(target, overrides);
    let buildNumber = 0;
    await run.output
      .pipe(
        debounceTime(rebuildDebounceTime),
        tap(buildEvent => expect(buildEvent.success).toBe(true)),
        tap(() => {
          // NOTE: this only works for transitive type deps after the first build, and only if the
          // typedep file was there on the previous build.
          // Make sure the first rebuild is triggered on a direct dep (typedep or not).
          buildNumber++;
          if (buildNumber < 4) {
            host.appendToFile(`src/interface${buildNumber}.ts`, `export type MyType = string;`);
          } else {
            host.appendToFile(`src/typings.d.ts`, `export type MyType = string;`);
          }
        }),
        take(5),
      )
      .toPromise();
  });

  it('rebuilds on transitive non node package DTS file changes', async () => {
    host.writeMultipleFiles({
      'src/interface1.d.ts': `
        import { Interface2 } from './interface2';
        export interface Interface1 extends Interface2 { }
      `,
      'src/interface2.d.ts': `
        import { Interface3 } from './interface3';
        export interface Interface2 extends Interface3 { }
      `,
      'src/interface3.d.ts': `export interface Interface3 { nbr: number; }`,
    });
    host.appendToFile('src/main.ts', `
      import { Interface1 } from './interface1';
      const something: Interface1 = { nbr: 43 };
    `);

    const overrides = { watch: true };
    const run = await architect.scheduleTarget(target, overrides);
    let buildNumber = 0;
    await run.output
      .pipe(
        debounceTime(rebuildDebounceTime),
        tap(buildEvent => expect(buildEvent.success).toBe(true)),
        tap(() => {
          buildNumber++;
          if (buildNumber === 1) {
            host.appendToFile('src/interface3.d.ts', 'export declare type MyType = string;');
          }
        }),
        take(2),
      )
      .toPromise();
  });

  it('rebuilds after errors in JIT', async () => {
    const origContent = virtualFs.fileBufferToString(
      host.scopedSync().read(normalize('src/app/app.component.ts')),
    );
    host.appendToFile('./src/app/app.component.ts', `console.logg('error')`);

    const overrides = { watch: true, aot: false };
    let buildNumber = 0;
    const logger = new logging.Logger('');
    let logs: string[] = [];
    logger.subscribe(e => logs.push(e.message));

    const run = await architect.scheduleTarget(target, overrides, { logger });
    await run.output
      .pipe(
        debounceTime(rebuildDebounceTime),
        tap(buildEvent => {
          buildNumber++;
          switch (buildNumber) {
            case 1:
              // The first build should error out with an error.
              expect(buildEvent.success).toBe(false);
              expect(logs.join()).toContain(`Property 'logg' does not exist on type 'Console'`);
              logs = [];
              // Fix the error.
              host.writeMultipleFiles({
                'src/app/app.component.ts': `
              ${origContent}
              console.errorr('error');
            `,
              });
              break;

            case 2:
              // The second build should have everything fixed.
              expect(buildEvent.success).toBe(true);
              expect(logs.join()).not.toContain('Module build failed');
              break;
          }
        }),
        take(2),
      )
      .toPromise();
    await run.stop();
  });

  it('rebuilds after errors in AOT', async () => {
    // Save the original contents of `./src/app/app.component.ts`.
    const origContent = virtualFs.fileBufferToString(
      host.scopedSync().read(normalize('src/app/app.component.ts')),
    );
    // Add a major static analysis error on a non-main file to the initial build.
    host.replaceInFile('./src/app/app.component.ts', `'app-root'`, `(() => 'app-root')()`);

    // `selector must be a string` errors on VE are part of the emit result, but on Ivy they only
    // show up in getNgSemanticDiagnostics. Since getNgSemanticDiagnostics is only called on the
    // type checker, we must disable it to get a failing fourth build with Ivy.
    const overrides = { watch: true, aot: true, forkTypeChecker: veEnabled };
    const logger = new TestLogger('rebuild-aot-errors');
    const staticAnalysisError = !veEnabled
      ? 'selector must be a string'
      : 'Function expressions are not supported in decorators';
    const syntaxError = 'Declaration or statement expected.';
    let buildNumber = 0;

    const run = await architect.scheduleTarget(target, overrides, { logger });
    await run.output
      .pipe(
        debounceTime(rebuildDebounceTime),
        tap(buildEvent => {
          buildNumber += 1;
          switch (buildNumber) {
            case 1:
              // The first build should error out with a static analysis error.
              expect(buildEvent.success).toBe(false, 'First build should not succeed.');
              expect(logger.includes(staticAnalysisError)).toBe(true,
                'First build should have static analysis error.');
              logger.clear();
              // Fix the static analysis error.
              host.writeMultipleFiles({ 'src/app/app.component.ts': origContent });
              break;

            case 2:
              expect(buildEvent.success).toBe(true, 'Second build should succeed.');
              expect(logger.includes(staticAnalysisError)).toBe(false,
                'Second build should not have static analysis error.');
              logger.clear();
              // Add an syntax error to a non-main file.
              host.appendToFile('src/app/app.component.ts', `]]]`);
              break;

            case 3:
              // The third build should have TS syntax error.
              expect(buildEvent.success).toBe(false, 'Third build should not succeed.');
              expect(logger.includes(syntaxError)).toBe(true,
                'Third build should have syntax analysis error.');
              expect(logger.includes(staticAnalysisError)).toBe(false,
                'Third build should not have static analysis error.');
              logger.clear();
              // Fix the syntax error, but add the static analysis error again.
              host.writeMultipleFiles({
                'src/app/app.component.ts': origContent.replace(
                  `'app-root'`,
                  `(() => 'app-root')()`,
                ),
              });
              break;

            case 4:
              expect(buildEvent.success).toBe(false, 'Fourth build should not succeed.');
              expect(logger.includes(syntaxError)).toBe(false,
                'Fourth build should not have syntax analysis error.');
              expect(logger.includes(staticAnalysisError)).toBe(true,
                'Fourth build should have static analysis error.');
              logger.clear();
              // Restore the file to a error-less state.
              host.writeMultipleFiles({ 'src/app/app.component.ts': origContent });
              break;

            case 5:
              // The fifth build should have everything fixed..
              expect(buildEvent.success).toBe(true, 'Fifth build should succeed.');
              expect(logger.includes(syntaxError)).toBe(false,
                'Fifth build should not have syntax analysis error.');
              expect(logger.includes(staticAnalysisError)).toBe(false,
                'Fifth build should not have static analysis error.');
              break;
          }
        }),
        take(5),
      )
      .toPromise();
    await run.stop();
  });

  it('rebuilds AOT factories', async () => {
    host.writeMultipleFiles({
      'src/app/app.component.css': `
        @import './imported-styles.css';
        body {background-color: #00f;}
      `,
      'src/app/imported-styles.css': 'p {color: #f00;}',
    });

    const overrides = { watch: true, aot: true };
    let buildNumber = 0;

    const run = await architect.scheduleTarget(target, overrides);
    await run.output
      .pipe(
        debounceTime(rebuildDebounceTime),
        tap(buildEvent => {
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
              content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
              expect(content).toContain('HTML_REBUILD_STRING');
              // Change the component css.
              host.appendToFile('src/app/app.component.css', 'CSS_REBUILD_STRING {color: #f00;}');
              break;

            case 5:
              // Check if css changes are added to factories.
              expect(buildEvent.success).toBe(true);
              content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
              expect(content).toContain('CSS_REBUILD_STRING');
              // Change the component css import.
              host.appendToFile(
                'src/app/imported-styles.css',
                'CSS_DEP_REBUILD_STRING {color: #f00;}',
              );
              break;

            case 6:
              // Check if css import changes are added to factories.
              expect(buildEvent.success).toBe(true);
              content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
              expect(content).toContain('CSS_DEP_REBUILD_STRING');
              // Change the component itself.
              host.replaceInFile(
                'src/app/app.component.ts',
                'app-root',
                'app-root-FACTORY_REBUILD_STRING',
              );
              break;

            case 7:
              // Check if component changes are added to factories.
              expect(buildEvent.success).toBe(true);
              content = virtualFs.fileBufferToString(host.scopedSync().read(normalize(fileName)));
              expect(content).toContain('FACTORY_REBUILD_STRING');
              break;
          }
        }),
        take(7),
      )
      .toPromise();
    await run.stop();
  });

  it('rebuilds on changes in barrel file dependency', async () => {
    host.writeMultipleFiles({
      'src/index.ts': `export * from './interface'`,
      'src/interface.ts': `export interface Foo { bar: boolean };`,
    });
    host.appendToFile(
      'src/main.ts',
      `
      import { Foo } from './index';
      const x: Foo = { bar: true };
    `,
    );

    const overrides = { watch: true, aot: false };
    let buildNumber = 0;
    const run = await architect.scheduleTarget(target, overrides);
    await run.output
      .pipe(
        debounceTime(rebuildDebounceTime),
        tap(buildEvent => {
          buildNumber += 1;
          switch (buildNumber) {
            case 1:
              expect(buildEvent.success).toBe(true);
              host.writeMultipleFiles({
                'src/interface.ts': `export interface Foo {
                bar: boolean;
                baz?: string;
               };`,
              });
              break;

            case 2:
              expect(buildEvent.success).toBe(true);
              break;
          }
        }),
        take(2),
      )
      .toPromise();
    await run.stop();
  });

  it('rebuilds AOT on CSS changes', async () => {
    const overrides = { watch: true, aot: true };

    let buildCount = 1;
    const run = await architect.scheduleTarget(target, overrides);
    await run.output.pipe(
      debounceTime(rebuildDebounceTime),
      tap(() => {
        const content = virtualFs.fileBufferToString(
          host.scopedSync().read(join(outputPath, 'main.js')),
        );

        switch (buildCount) {
          case 1:
              expect(content).not.toContain('color: green');
              host.appendToFile('src/app/app.component.css', 'h1 { color: green; }');
              break;
          case 2:
              expect(content).toContain('color: green');
              break;
        }

        buildCount++;
      }),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      take(2),
    ).toPromise();
    await run.stop();
  });

  it('rebuilds AOT on HTML changes', async () => {
    const overrides = { watch: true, aot: true };

    let buildCount = 1;
    const run = await architect.scheduleTarget(target, overrides);
    await run.output.pipe(
      debounceTime(rebuildDebounceTime),
      tap(() => {
        const content = virtualFs.fileBufferToString(
          host.scopedSync().read(join(outputPath, 'main.js')),
        );

        switch (buildCount) {
          case 1:
              expect(content).not.toContain('New Updated Content');
              host.appendToFile('src/app/app.component.html', 'New Updated Content');
              break;
          case 2:
              expect(content).toContain('New Updated Content');
              break;
        }

        buildCount++;
      }),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      take(2),
    ).toPromise();
    await run.stop();
  });
});
