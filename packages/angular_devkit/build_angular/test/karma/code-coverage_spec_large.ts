/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect } from '@angular-devkit/architect';
import { normalize, virtualFs } from '@angular-devkit/core';
import { createArchitect, host, karmaTargetSpec } from '../utils';

describe('Karma Builder code coverage', () => {
  const coverageFilePath = normalize('coverage/lcov.info');
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });

  afterEach(() => host.restore().toPromise());

  it('supports code coverage option', async () => {
    const run = await architect.scheduleTarget(karmaTargetSpec, { codeCoverage: true });

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    await run.stop();

    const exists = host.scopedSync().exists(coverageFilePath);
    expect(exists).toBe(true);

    if (exists) {
      const content = virtualFs.fileBufferToString(host.scopedSync().read(coverageFilePath));
      expect(content).toContain('polyfills.ts');
      expect(content).toContain('test.ts');
    }
  }, 120000);

  it('supports code coverage exclude option', async () => {
    const overrides = {
      codeCoverage: true,
      codeCoverageExclude: [
        'src/polyfills.ts',
        '**/test.ts',
      ],
    };

    const run = await architect.scheduleTarget(karmaTargetSpec, overrides);

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    await run.stop();

    const exists = host.scopedSync().exists(coverageFilePath);
    expect(exists).toBe(true);

    if (exists) {
      const content = virtualFs.fileBufferToString(host.scopedSync().read(coverageFilePath));
      expect(content).not.toContain('polyfills.ts');
      expect(content).not.toContain('test.ts');
    }
  }, 120000);

  it(`should collect coverage from paths in 'sourceRoot'`, async () => {
    const files: { [path: string]: string } = {
      './dist/my-lib/index.d.ts': `
        export declare const title = 'app';
      `,
      './dist/my-lib/index.js': `
        export const title = 'app';
      `,
      './src/app/app.component.ts': `
        import { Component } from '@angular/core';
        import { title } from 'my-lib';

        @Component({
          selector: 'app-root',
          templateUrl: './app.component.html',
          styleUrls: ['./app.component.css']
        })
        export class AppComponent {
          title = title;
        }
      `,
    };

    host.writeMultipleFiles(files);

    host.replaceInFile('tsconfig.json', /"baseUrl": ".\/",/, `
      "baseUrl": "./",
      "paths": {
        "my-lib": [
          "./dist/my-lib"
        ]
      },
    `);

    const run = await architect.scheduleTarget(karmaTargetSpec, { codeCoverage: true });

    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: true }));

    await run.stop();

    const exists = host.scopedSync().exists(coverageFilePath);
    expect(exists).toBe(true);

    if (exists) {
      const content = virtualFs.fileBufferToString(host.scopedSync().read(coverageFilePath));
      expect(content).not.toContain('my-lib');
    }
  }, 120000);

  it(`should fail when coverage is below threhold and 'emitWarning' is false`, async () => {
    host.replaceInFile('karma.conf.js', 'fixWebpackSourcePaths: true',
      `
      fixWebpackSourcePaths: true,
      thresholds: {
        emitWarning: false,
        global: {
          statements: 200
        }
      }`,
    );

    const run = await architect.scheduleTarget(karmaTargetSpec, { codeCoverage: true });
    await expectAsync(run.result).toBeResolvedTo(jasmine.objectContaining({ success: false }));
    await run.stop();
  }, 120000);
});
