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
import {
  TestLogger,
  TestProjectHost,
  browserWorkspaceTarget,
  makeWorkspace,
  workspaceRoot,
} from '../utils';


describe('Browser Builder errors', () => {
  const host = new TestProjectHost(workspaceRoot);
  const architect = new Architect(normalize(workspaceRoot), host);

  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  it('shows error when files are not part of the compilation', (done) => {
    host.replaceInFile('src/tsconfig.app.json', '"compilerOptions": {', `
      "files": ["main.ts"],
      "compilerOptions": {
    `);
    const logger = new TestLogger('errors-compilation');

    architect.loadWorkspaceFromJson(makeWorkspace(browserWorkspaceTarget)).pipe(
      concatMap(() => architect.run(architect.getTarget(), { logger })),
      tap((buildEvent) => {
        expect(buildEvent.success).toBe(false);
        expect(logger.includes('polyfills.ts is missing from the TypeScript')).toBe(true);
      }),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('shows TS syntax errors', (done) => {
    host.appendToFile('src/app/app.component.ts', ']]]');
    const logger = new TestLogger('errors-syntax');

    architect.loadWorkspaceFromJson(makeWorkspace(browserWorkspaceTarget)).pipe(
      concatMap(() => architect.run(architect.getTarget(), { logger })),
      tap((buildEvent) => {
        expect(buildEvent.success).toBe(false);
        expect(logger.includes('Declaration or statement expected.')).toBe(true);
      }),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('shows static analysis errors', (done) => {
    host.replaceInFile('src/app/app.component.ts', `'app-root'`, `(() => 'app-root')()`);
    const logger = new TestLogger('errors-static');

    architect.loadWorkspaceFromJson(makeWorkspace(browserWorkspaceTarget)).pipe(
      concatMap(() => architect.run(architect.getTarget({ overrides: { aot: true } }), { logger })),
      tap((buildEvent) => {
        expect(buildEvent.success).toBe(false);
        expect(logger.includes('Function expressions are not supported in')).toBe(true);
      }),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

});
