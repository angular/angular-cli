/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { runTargetSpec } from '@angular-devkit/architect/testing';
import { normalize, virtualFs } from '@angular-devkit/core';
import { debounceTime, tap } from 'rxjs/operators';
import { NormalizedKarmaBuilderSchema } from '../../src';
import { host, karmaTargetSpec } from '../utils';


describe('Karma Builder code coverage', () => {
  const coverageFilePath = normalize('coverage/lcov.info');

  beforeEach(done => host.initialize().toPromise().then(done, done.fail));
  afterEach(done => host.restore().toPromise().then(done, done.fail));

  it('works', (done) => {
    const overrides: Partial<NormalizedKarmaBuilderSchema> = { codeCoverage: true };

    runTargetSpec(host, karmaTargetSpec, overrides).pipe(
      // It seems like the coverage files take a while being written to disk, so we wait 500ms here.
      debounceTime(500),
      tap(buildEvent => {
        expect(buildEvent.success).toBe(true);
        expect(host.scopedSync().exists(coverageFilePath)).toBe(true);
        const content = virtualFs.fileBufferToString(host.scopedSync().read(coverageFilePath));
        expect(content).toContain('polyfills.ts');
        expect(content).toContain('test.ts');
      }),
    ).toPromise().then(done, done.fail);
  }, 120000);

  it('supports exclude', (done) => {
    const overrides: Partial<NormalizedKarmaBuilderSchema> = {
      codeCoverage: true,
      codeCoverageExclude: [
        'src/polyfills.ts',
        '**/test.ts',
      ],
    };

    runTargetSpec(host, karmaTargetSpec, overrides).pipe(
      // It seems like the coverage files take a while being written to disk, so we wait 500ms here.
      debounceTime(500),
      tap(buildEvent => {
        expect(buildEvent.success).toBe(true);
        expect(host.scopedSync().exists(coverageFilePath)).toBe(true);
        const content = virtualFs.fileBufferToString(host.scopedSync().read(coverageFilePath));
        expect(content).not.toContain('polyfills.ts');
        expect(content).not.toContain('test.ts');
      }),
    ).toPromise().then(done, done.fail);
  }, 120000);

  it(`should collect coverage from paths in 'sourceRoot'`, (done) => {
    const overrides: Partial<NormalizedKarmaBuilderSchema> = { codeCoverage: true };

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

    runTargetSpec(host, karmaTargetSpec, overrides).pipe(
      // It seems like the coverage files take a while being written to disk, so we wait 500ms here.
      debounceTime(500),
      tap(buildEvent => {
        expect(buildEvent.success).toBe(true);
        expect(host.scopedSync().exists(coverageFilePath)).toBe(true);
        const content = virtualFs.fileBufferToString(host.scopedSync().read(coverageFilePath));
        expect(content).not.toContain('my-lib');
      }),
    ).toPromise().then(done, done.fail);
  }, 120000);
});
