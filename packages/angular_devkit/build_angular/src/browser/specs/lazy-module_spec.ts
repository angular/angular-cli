/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { TestProjectHost } from '@angular-devkit/architect/testing';
import { logging } from '@angular-devkit/core';
import { debounceTime, take, tap } from 'rxjs/operators';
import {
  browserBuild,
  createArchitect,
  host,
  lazyModuleFiles,
  lazyModuleFnImport,
} from '../../test-utils';

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

  function hasMissingModuleError(logs: string): boolean {
    // TS type error when using import().
    return logs.includes('Cannot find module') ||
      // Webpack error when using import() on a rebuild.
      // There is no TS error because the type checker is forked on rebuilds.
      logs.includes('Module not found');
  }

  describe(`Load children syntax`, () => {
    it('supports lazy bundle for lazy routes with JIT', async () => {
      host.writeMultipleFiles(lazyModuleFiles);
      host.writeMultipleFiles(lazyModuleFnImport);

      const { files } = await browserBuild(architect, host, target);
      expect('lazy-lazy-module.js' in files).toBe(true);
    });

    it('supports lazy bundle for lazy routes with AOT', async () => {
      host.writeMultipleFiles(lazyModuleFiles);
      host.writeMultipleFiles(lazyModuleFnImport);
      addLazyLoadedModulesInTsConfig(host, lazyModuleFiles);

      const { files } = await browserBuild(architect, host, target, { aot: true });
      const data = await files['lazy-lazy-module.js'];
      expect(data).not.toBeUndefined('Lazy module output bundle does not exist');
      expect(data).toContain('LazyModule.ɵmod');
    });
  });

  // Errors for missing lazy routes are only supported with function syntax.
  // `ngProgram.listLazyRoutes` will ignore invalid lazy routes in the route map.
  describe(`Load children errors with function syntax`, () => {
    it('should show error when lazy route is invalid', async () => {
      host.writeMultipleFiles(lazyModuleFiles);
      host.writeMultipleFiles(lazyModuleFnImport);
      host.replaceInFile('src/app/app.module.ts', 'lazy.module', 'invalid.module');

      const logger = new logging.Logger('');
      const logs: string[] = [];
      logger.subscribe(e => logs.push(e.message));

      const run = await architect.scheduleTarget(target, {}, { logger });
      const output = await run.result;
      expect(output.success).toBe(false);
      expect(hasMissingModuleError(logs.join())).toBe(true, 'Should show missing module error');
    });

    it('should show error when lazy route is invalid on watch mode AOT', async () => {
      host.writeMultipleFiles(lazyModuleFiles);
      host.writeMultipleFiles(lazyModuleFnImport);

      let buildNumber = 0;

      const overrides = { watch: true, aot: true };
      const run = await architect.scheduleTarget(target, overrides);
      await run.output
        .pipe(
          debounceTime(3000),
          tap(buildEvent => {
            buildNumber++;
            switch (buildNumber) {
              case 1:
                expect(buildEvent.success).toBe(true);
                host.replaceInFile('src/app/app.module.ts', 'lazy.module', 'invalid.module');
                break;
              case 2:
                expect(buildEvent.success).toBe(false);
                break;
            }
          }),
          take(2),
        )
        .toPromise();
      await run.stop();
    });
  });

  it(`supports lazy bundle for import() calls`, async () => {
    host.writeMultipleFiles({
      'src/lazy-module.ts': 'export const value = 42;',
      'src/main.ts': `import('./lazy-module');`,
    });

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
});
