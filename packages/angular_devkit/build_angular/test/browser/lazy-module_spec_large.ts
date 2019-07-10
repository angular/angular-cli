/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { TestLogger, TestProjectHost } from '@angular-devkit/architect/testing';
import { take, tap, timeout } from 'rxjs/operators';
import {
  browserBuild,
  createArchitect,
  host,
  ivyEnabled,
  lazyModuleFiles,
  lazyModuleFnImport,
  lazyModuleStringImport,
} from '../utils';

// tslint:disable-next-line:no-big-function
describe('Browser Builder lazy modules', () => {
  const target = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  function addLazyLoadedModulesInTsConfig(host: TestProjectHost, lazyModuleFiles: Record<string, string>) {
    const files = [
      ...Object.keys(lazyModuleFiles),
      'main.ts',
    ]
    .map(f => '"' + f.replace('src/', '') + '"')
    .join(', ');

    host.replaceInFile(
      'src/tsconfig.app.json',
      '"main.ts"',
      `${files}`,
    );
  }

  const cases: [string, Record<string, string>][] = [
    ['string', lazyModuleStringImport],
    ['function', lazyModuleFnImport],
  ];
  for (const [name, imports] of cases) {
    describe(`Load children ${name} syntax`, () => {
      it('supports lazy bundle for lazy routes with JIT', async () => {
        host.writeMultipleFiles(lazyModuleFiles);
        host.writeMultipleFiles(imports);

        if (name === 'string') {
          addLazyLoadedModulesInTsConfig(host, lazyModuleFiles);
        }

        const { files } = await browserBuild(architect, host, target);
        expect('lazy-lazy-module.js' in files).toBe(true);
      });

      it('should show error when lazy route is invalid on watch mode AOT', async () => {
        if (ivyEnabled && name === 'string') {
          pending('Does not apply to Ivy.');

          return;
        }

        // DISABLED_FOR_IVY - These should pass but are currently not supported
        if (ivyEnabled) {
          pending('Broken in Ivy');

          return;
        }

        host.writeMultipleFiles(lazyModuleFiles);
        host.writeMultipleFiles(imports);
        host.replaceInFile('src/app/app.module.ts', 'lazy.module', 'invalid.module');

        const logger = new TestLogger('rebuild-lazy-errors');
        const overrides = { watch: true, aot: true };
        const run = await architect.scheduleTarget(target, overrides, { logger });
        await run.output
          .pipe(
            timeout(15000),
            tap(buildEvent => expect(buildEvent.success).toBe(false)),
            tap(() => {
              // Webpack error when using loadchildren string syntax.
              const hasMissingModuleError =
                logger.includes('Could not resolve module') ||
                // TS type error when using import().
                logger.includes('Cannot find module') ||
                // Webpack error when using import() on a rebuild.
                // There is no TS error because the type checker is forked on rebuilds.
                logger.includes('Module not found');
              expect(hasMissingModuleError).toBe(true, 'Should show missing module error');
              logger.clear();
              host.appendToFile('src/main.ts', ' ');
            }),
            take(2),
          )
          .toPromise();
        await run.stop();
      });

      it('supports lazy bundle for lazy routes with AOT', async () => {
        host.writeMultipleFiles(lazyModuleFiles);
        host.writeMultipleFiles(imports);
        addLazyLoadedModulesInTsConfig(host, lazyModuleFiles);

        const { files } = await browserBuild(architect, host, target, { aot: true });
        if (ivyEnabled) {
          const data = await files['lazy-lazy-module.js'];
          expect(data).not.toBeUndefined('Lazy module output bundle does not exist');
          expect(data).toContain('LazyModule.ngModuleDef');
        } else {
          expect(files['lazy-lazy-module-ngfactory.js']).not.toBeUndefined();
        }
      });
    });
  }

  it(`supports lazy bundle for import() calls`, async () => {
    host.writeMultipleFiles({
      'src/lazy-module.ts': 'export const value = 42;',
      'src/main.ts': `import('./lazy-module');`,
    });
    // Using `import()` in TS require targetting `esnext` modules.
    host.replaceInFile('src/tsconfig.app.json', `"module": "es2015"`, `"module": "esnext"`);

    const { files } = await browserBuild(architect, host, target);
    expect(files['lazy-module.js']).not.toBeUndefined();
  });

  it(`supports lazy bundle for dynamic import() calls`, async () => {
    host.writeMultipleFiles({
      'src/lazy-module.ts': 'export const value = 42;',
      'src/main.ts': `
        const lazyFileName = 'module';
        import(/*webpackChunkName: '[request]'*/'./lazy-' + lazyFileName);
      `,
    });
    host.replaceInFile('src/tsconfig.app.json', `"module": "es2015"`, `"module": "esnext"`);

    const { files } = await browserBuild(architect, host, target);
    expect(files['lazy-module.js']).not.toBeUndefined();
  });

  it(`supports lazy bundle for System.import() calls`, async () => {
    const lazyfiles = {
      'src/lazy-module.ts': 'export const value = 42;',
      'src/main.ts': `declare var System: any; System.import('./lazy-module');`,
    };

    host.writeMultipleFiles(lazyfiles);
    addLazyLoadedModulesInTsConfig(host, lazyfiles);

    const { files } = await browserBuild(architect, host, target);
    expect(files['lazy-module.js']).not.toBeUndefined();
  });

  it(`supports hiding lazy bundle module name`, async () => {
    host.writeMultipleFiles({
      'src/lazy-module.ts': 'export const value = 42;',
      'src/main.ts': `const lazyFileName = 'module'; import('./lazy-' + lazyFileName);`,
    });
    host.replaceInFile('src/tsconfig.app.json', `"module": "es2015"`, `"module": "esnext"`);

    const { files } = await browserBuild(architect, host, target, { namedChunks: false });
    expect(files['0.js']).not.toBeUndefined();
  });

  it(`supports making a common bundle for shared lazy modules`, async () => {
    host.writeMultipleFiles({
      'src/one.ts': `import * as http from '@angular/common/http'; console.log(http);`,
      'src/two.ts': `import * as http from '@angular/common/http'; console.log(http);`,
      'src/main.ts': `import('./one'); import('./two');`,
    });

    const { files } = await browserBuild(architect, host, target);
    expect(files['one.js']).not.toBeUndefined();
    expect(files['two.js']).not.toBeUndefined();
    // TODO: the chunk with common modules used to be called `common`, see why that changed.
    expect(files['default~one~two.js']).not.toBeUndefined();
  });

  it(`supports disabling the common bundle`, async () => {
    host.writeMultipleFiles({
      'src/one.ts': `import * as http from '@angular/common/http'; console.log(http);`,
      'src/two.ts': `import * as http from '@angular/common/http'; console.log(http);`,
      'src/main.ts': `import('./one'); import('./two');`,
    });

    const { files } = await browserBuild(architect, host, target, { commonChunk: false });
    expect(files['one.js']).not.toBeUndefined();
    expect(files['two.js']).not.toBeUndefined();
    expect(files['common.js']).toBeUndefined();
  });

  it(`supports extra lazy modules array in JIT`, async () => {
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
    addLazyLoadedModulesInTsConfig(host, lazyModuleFiles);

    const { files } = await browserBuild(architect, host, target, {
      lazyModules: ['src/app/lazy/lazy.module'],
    });
    expect(files['src-app-lazy-lazy-module.js']).not.toBeUndefined();
  });

  it(`supports extra lazy modules array in AOT`, async () => {
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
    addLazyLoadedModulesInTsConfig(host, lazyModuleFiles);
    const { files } = await browserBuild(architect, host, target, {
      lazyModules: ['src/app/lazy/lazy.module'],
      aot: true,
    });

    if (ivyEnabled) {
      const data = await files['src-app-lazy-lazy-module.js'];
      expect(data).not.toBeUndefined('Lazy module output bundle does not exist');
      expect(data).toContain('LazyModule.ngModuleDef');
    } else {
      expect(files['src-app-lazy-lazy-module-ngfactory.js']).not.toBeUndefined();
    }
  });
});
