/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { join, normalize, virtualFs } from '@angular-devkit/core';
import { concatMap, tap } from 'rxjs/operators';
import { TestProjectHost, browserWorkspaceTarget, makeWorkspace, workspaceRoot } from '../utils';


describe('Browser Builder deploy url', () => {
  const host = new TestProjectHost(workspaceRoot);
  const architect = new Architect(normalize(workspaceRoot), host);
  const outputPath = normalize('dist');

  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  it('uses deploy url for bundles urls', (done) => {
    architect.loadWorkspaceFromJson(makeWorkspace(browserWorkspaceTarget)).pipe(
      concatMap(() => architect.run(architect.getTarget({
        overrides: { deployUrl: 'deployUrl/' },
      }))),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = join(outputPath, 'index.html');
        const content = virtualFs.fileBufferToString(host.asSync().read(normalize(fileName)));
        expect(content).toContain('deployUrl/main.js');
      }),
      concatMap(() => architect.run(architect.getTarget({
        overrides: { deployUrl: 'http://example.com/some/path/' },
      }))),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = join(outputPath, 'index.html');
        const content = virtualFs.fileBufferToString(host.asSync().read(normalize(fileName)));
        expect(content).toContain('http://example.com/some/path/main.js');
      }),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('uses deploy url for in webpack runtime', (done) => {
    architect.loadWorkspaceFromJson(makeWorkspace(browserWorkspaceTarget)).pipe(
      concatMap(() => architect.run(architect.getTarget({
        overrides: { deployUrl: 'deployUrl/' },
      }))),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = join(outputPath, 'runtime.js');
        const content = virtualFs.fileBufferToString(host.asSync().read(normalize(fileName)));
        expect(content).toContain('deployUrl/');
      }),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

});
