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


describe('Browser Builder base href', () => {
  const host = new TestProjectHost(workspaceRoot);
  const architect = new Architect(normalize(workspaceRoot), host);
  const outputPath = normalize('dist');

  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  it('works', (done) => {
    host.writeMultipleFiles({
      'src/my-js-file.js': `console.log(1); export const a = 2;`,
      'src/main.ts': `import { a } from './my-js-file'; console.log(a);`,
    });

    const overrides = { baseHref: '/myUrl' };

    architect.loadWorkspaceFromJson(makeWorkspace(browserWorkspaceTarget)).pipe(
      concatMap(() => architect.run(architect.getTarget({ overrides }))),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
      tap(() => {
        const fileName = join(outputPath, 'index.html');
        const content = virtualFs.fileBufferToString(host.asSync().read(fileName));
        expect(content).toMatch(/<base href="\/myUrl">/);
      }),
    ).subscribe(undefined, done.fail, done);
  }, 30000);
});
