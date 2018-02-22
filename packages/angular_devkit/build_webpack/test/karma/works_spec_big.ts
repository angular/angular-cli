/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { normalize } from '@angular-devkit/core';
import { concatMap, tap } from 'rxjs/operators';
import { TestProjectHost, karmaWorkspaceTarget, makeWorkspace, workspaceRoot } from '../utils';


describe('Karma Builder', () => {
  const host = new TestProjectHost(workspaceRoot);
  const architect = new Architect(normalize(workspaceRoot), host);

  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  it('runs', (done) => {
    architect.loadWorkspaceFromJson(makeWorkspace(karmaWorkspaceTarget)).pipe(
      concatMap(() => architect.run(architect.getTarget())),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('fails with broken compilation', (done) => {
    host.writeMultipleFiles({
      'src/app/app.component.spec.ts': '<p> definitely not typescript </p>',
    });
    architect.loadWorkspaceFromJson(makeWorkspace(karmaWorkspaceTarget)).pipe(
      concatMap(() => architect.run(architect.getTarget())),
      tap((buildEvent) => expect(buildEvent.success).toBe(false)),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('supports ES2015 target', (done) => {
    host.replaceInFile('tsconfig.json', '"target": "es5"', '"target": "es2015"');
    architect.loadWorkspaceFromJson(makeWorkspace(karmaWorkspaceTarget)).pipe(
      concatMap(() => architect.run(architect.getTarget())),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).subscribe(undefined, done.fail, done);
  }, 30000);
});
