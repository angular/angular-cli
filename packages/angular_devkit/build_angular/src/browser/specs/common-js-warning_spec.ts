/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect } from '@angular-devkit/architect';
import { logging } from '@angular-devkit/core';
import { createArchitect, host } from '../../test-utils';

describe('Browser Builder commonjs warning', () => {
  const targetSpec = { project: 'app', target: 'build' };

  let architect: Architect;
  let logger: logging.Logger;
  let logs: string[];

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;

    // Create logger
    logger = new logging.Logger('');
    logs = [];
    logger.subscribe(e => logs.push(e.message));
  });

  afterEach(async () => host.restore().toPromise());

  for (const aot of [true, false]) {
    it(`should not show warning for styles import in ${aot ? 'AOT' : 'JIT'} Mode`, async () => {
      // Add a Common JS dependency
      host.appendToFile('src/app/app.component.ts', `
        import '../../test.css';
      `);

      host.writeMultipleFiles({
        './test.css': `
          body {
            color: red;
          };
        `,
      });

      const run = await architect.scheduleTarget(targetSpec, { aot }, { logger });
      const output = await run.result;
      expect(output.success).toBe(true);
      expect(logs.join()).not.toContain('Warning');
      await run.stop();
    });

    it(`should show warning when depending on a Common JS bundle in ${aot ? 'AOT' : 'JIT'} Mode`, async () => {
      // Add a Common JS dependency
      host.appendToFile('src/app/app.component.ts', `
        import 'bootstrap';
      `);

      const run = await architect.scheduleTarget(targetSpec, { aot }, { logger });
      const output = await run.result;
      expect(output.success).toBe(true);
      const logMsg = logs.join();
      expect(logMsg).toMatch(/Warning: .+app\.component\.ts depends on 'bootstrap'\. CommonJS or AMD dependencies/);
      expect(logMsg).not.toContain('jquery', 'Should not warn on transitive CommonJS packages which parent is also CommonJS.');
      await run.stop();
    });
  }

  it('should not show warning when depending on a Common JS bundle which is allowed', async () => {
    // Add a Common JS dependency
    host.appendToFile('src/app/app.component.ts', `
      import 'bootstrap';
      import 'zone.js/dist/zone-error';
    `);

    const overrides = {
      allowedCommonJsDependencies: [
        'bootstrap',
        'zone.js',
      ],
    };

    const run = await architect.scheduleTarget(targetSpec, overrides, { logger });
    const output = await run.result;
    expect(output.success).toBe(true);
    expect(logs.join()).not.toContain('Warning');
    await run.stop();
  });

  it(`should not show warning when importing non global local data '@angular/common/locale/fr'`, async () => {
    // Add a Common JS dependency
    host.appendToFile('src/app/app.component.ts', `
      import '@angular/common/locales/fr';
    `);

    const run = await architect.scheduleTarget(targetSpec, undefined, { logger });
    const output = await run.result;
    expect(output.success).toBe(true);

    expect(logs.join()).not.toContain('Warning');
    await run.stop();
  });

  it('should not show warning in JIT for templateUrl and styleUrl when using paths', async () => {
    host.replaceInFile('tsconfig.json', /"baseUrl": ".\/",/, `
      "baseUrl": "./",
      "paths": {
        "@app/*": [
          "src/app/*"
        ]
      },
    `);

    host.replaceInFile('src/app/app.module.ts', './app.component', '@app/app.component');

    const run = await architect.scheduleTarget(targetSpec, { aot: false }, { logger });
    const output = await run.result;
    expect(output.success).toBe(true);

    expect(logs.join()).not.toContain('WARNING');
    await run.stop();
  });
});
