/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Architect } from '@angular-devkit/architect';
import { TestProjectHost } from '@angular-devkit/architect/testing';
import { logging } from '@angular-devkit/core';
import { debounceTime, take, tap } from 'rxjs';
import {
  browserBuild,
  createArchitect,
  host,
  lazyModuleFiles,
  lazyModuleFnImport,
} from '../../../testing/test-utils';

describe('Browser Builder lazy modules', () => {
  const target = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  function addLazyLoadedModulesInTsConfig(
    host: TestProjectHost,
    lazyModuleFiles: Record<string, string>,
  ) {
    const files = [...Object.keys(lazyModuleFiles), 'main.ts']
      .map((f) => '"' + f.replace('src/', '') + '"')
      .join(', ');

    host.replaceInFile('src/tsconfig.app.json', '"main.ts"', `${files}`);
  }

  function hasMissingModuleError(logs: string): boolean {
    // TS type error when using import().
    return (
      logs.includes('Cannot find module') ||
      // Webpack error when using import() on a rebuild.
      // There is no TS error because the type checker is forked on rebuilds.
      logs.includes('Module not found')
    );
  }

  describe(`Load children syntax`, () => {
    it('supports lazy bundle for lazy routes with JIT', async () => {
      host.writeMultipleFiles(lazyModuleFiles);
      host.writeMultipleFiles(lazyModuleFnImport);

      const { files } = await browserBuild(architect, host, target);
      expect('src_app_lazy_lazy_module_ts.js' in files).toBe(true);
    });

    it('supports lazy bundle for lazy routes with AOT', async () => {
      host.writeMultipleFiles(lazyModuleFiles);
      host.writeMultipleFiles(lazyModuleFnImport);
      addLazyLoadedModulesInTsConfig(host, lazyModuleFiles);

      const { files } = await browserBuild(architect, host, target, { aot: true });
      const data = await files['src_app_lazy_lazy_module_ts.js'];
      expect(data).toContain('static ɵmod');
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
      logger.subscribe((e) => logs.push(e.message));

      const run = await architect.scheduleTarget(target, {}, { logger });
      const output = await run.result;
      expect(output.success).toBe(false);
      expect(hasMissingModuleError(logs.join())).toBeTrue();
      await run.stop();
    });

    it('should show error when lazy route is invalid on watch mode AOT', async () => {
      host.writeMultipleFiles(lazyModuleFiles);
      host.writeMultipleFiles(lazyModuleFnImport);

      let buildNumber = 0;

      const overrides = { watch: true, aot: true };
      const run = await architect.scheduleTarget(target, overrides);
      await run.output
        .pipe(
          debounceTime(1500),
          tap((buildEvent) => {
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
    expect(files['src_lazy-module_ts.js']).toBeDefined();
  });

  it(`supports lazy bundle for dynamic import() calls`, async () => {
    host.writeMultipleFiles({
      'src/lazy-module.ts': 'export const value = 42;',
      'src/main.ts': `
        const lazyFileName = 'module';
        import('./lazy-' + lazyFileName);
      `,
    });
    host.replaceInFile('src/tsconfig.app.json', '"main.ts"', `"main.ts","lazy-module.ts"`);

    const { files } = await browserBuild(architect, host, target);
    expect(files['src_lazy-module_ts.js']).toBeDefined();
  });

  it(`supports making a common bundle for shared lazy modules`, async () => {
    host.writeMultipleFiles({
      'src/one.ts': `import * as http from '@angular/common/http'; console.log(http);`,
      'src/two.ts': `import * as http from '@angular/common/http'; console.log(http);`,
      'src/main.ts': `import('./one'); import('./two');`,
    });

    const { files } = await browserBuild(architect, host, target);
    expect(files['src_one_ts.js']).toBeDefined();
    expect(files['src_two_ts.js']).toBeDefined();
    expect(files['default-node_modules_angular_common_fesm2022_http_mjs.js']).toBeDefined();
  });

  it(`supports disabling the common bundle`, async () => {
    host.writeMultipleFiles({
      'src/one.ts': `import * as http from '@angular/common/http'; console.log(http);`,
      'src/two.ts': `import * as http from '@angular/common/http'; console.log(http);`,
      'src/main.ts': `import('./one'); import('./two');`,
    });

    const { files } = await browserBuild(architect, host, target, { commonChunk: false });
    expect(files['src_one_ts.js']).toBeDefined();
    expect(files['src_two_ts.js']).toBeDefined();
    expect(files['default-node_modules_angular_common_fesm2022_http_mjs.js']).toBeUndefined();
  });
});
