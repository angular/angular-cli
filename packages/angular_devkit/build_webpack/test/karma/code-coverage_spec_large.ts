/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { normalize, virtualFs } from '@angular-devkit/core';
import { concatMap, debounceTime, tap } from 'rxjs/operators';
import { KarmaBuilderOptions } from '../../src';
import { TestProjectHost, karmaWorkspaceTarget, makeWorkspace, workspaceRoot } from '../utils';


describe('Karma Builder code coverage', () => {
  const host = new TestProjectHost(workspaceRoot);
  const architect = new Architect(normalize(workspaceRoot), host);
  const coverageFilePath = normalize('coverage/lcov.info');

  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  it('works', (done) => {
    const overrides: Partial<KarmaBuilderOptions> = { codeCoverage: true };

    architect.loadWorkspaceFromJson(makeWorkspace(karmaWorkspaceTarget)).pipe(
      concatMap(() => architect.run(architect.getTarget({ overrides }))),
      // It seems like the coverage files take a while being written to disk, so we wait 500ms here.
      debounceTime(500),
      tap(buildEvent => {
        expect(buildEvent.success).toBe(true);
        expect(host.asSync().exists(coverageFilePath)).toBe(true);
        const content = virtualFs.fileBufferToString(host.asSync().read(coverageFilePath));
        expect(content).toContain('polyfills.ts');
        expect(content).toContain('test.ts');
      }),
    ).subscribe(undefined, done.fail, done);
  }, 120000);

  it('supports exclude', (done) => {
    const overrides: Partial<KarmaBuilderOptions> = {
      codeCoverage: true,
      codeCoverageExclude: [
        'polyfills.ts',
        '**/test.ts',
      ],
    };

    architect.loadWorkspaceFromJson(makeWorkspace(karmaWorkspaceTarget)).pipe(
      concatMap(() => architect.run(architect.getTarget({ overrides }))),
      // It seems like the coverage files take a while being written to disk, so we wait 500ms here.
      debounceTime(500),
      tap(buildEvent => {
        expect(buildEvent.success).toBe(true);
        expect(host.asSync().exists(coverageFilePath)).toBe(true);
        const content = virtualFs.fileBufferToString(host.asSync().read(coverageFilePath));
        expect(content).not.toContain('polyfills.ts');
        expect(content).not.toContain('test.ts');
      }),
    ).subscribe(undefined, done.fail, done);
  }, 120000);
});
