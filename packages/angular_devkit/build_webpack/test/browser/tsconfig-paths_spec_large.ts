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
import { TestProjectHost, browserWorkspaceTarget, makeWorkspace, workspaceRoot } from '../utils';


describe('Browser Builder tsconfig paths', () => {
  const host = new TestProjectHost(workspaceRoot);
  const architect = new Architect(normalize(workspaceRoot), host);

  beforeEach(done => host.initialize().subscribe(undefined, done.fail, done));
  afterEach(done => host.restore().subscribe(undefined, done.fail, done));

  it('works', (done) => {
    host.writeMultipleFiles({
      'src/meaning-too.ts': 'export var meaning = 42;',
      'src/app/shared/meaning.ts': 'export var meaning = 42;',
      'src/app/shared/index.ts': `export * from './meaning'`,
    });

    host.replaceInFile('src/app/app.module.ts', './app.component', '@root/app/app.component');
    host.replaceInFile('src/tsconfig.app.json', /"baseUrl": "[^"]*",/, `
      "baseUrl": "./",
      "paths": {
        "@root/*": [
          "./*"
        ]
      },
    `);

    architect.loadWorkspaceFromJson(makeWorkspace(browserWorkspaceTarget)).pipe(
      concatMap(() => architect.run(architect.getTarget())),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).subscribe(undefined, done.fail, done);
  }, 30000);

  it('works', (done) => {
    host.writeMultipleFiles({
      'src/meaning-too.ts': 'export var meaning = 42;',
      'src/app/shared/meaning.ts': 'export var meaning = 42;',
      'src/app/shared/index.ts': `export * from './meaning'`,
    });
    host.replaceInFile('src/tsconfig.app.json', /"baseUrl": "[^"]*",/, `
      "baseUrl": "./",
      "paths": {
        "@shared": [
          "app/shared"
        ],
        "@shared/*": [
          "app/shared/*"
        ],
        "*": [
          "*",
          "app/shared/*"
        ]
      },
    `);
    host.appendToFile('src/app/app.component.ts', `
      import { meaning } from 'app/shared/meaning';
      import { meaning as meaning2 } from '@shared';
      import { meaning as meaning3 } from '@shared/meaning';
      import { meaning as meaning4 } from 'meaning';
      import { meaning as meaning5 } from 'meaning-too';

      // need to use imports otherwise they are ignored and
      // no error is outputted, even if baseUrl/paths don't work
      console.log(meaning)
      console.log(meaning2)
      console.log(meaning3)
      console.log(meaning4)
      console.log(meaning5)
    `);

    architect.loadWorkspaceFromJson(makeWorkspace(browserWorkspaceTarget)).pipe(
      concatMap(() => architect.run(architect.getTarget())),
      tap((buildEvent) => expect(buildEvent.success).toBe(true)),
    ).subscribe(undefined, done.fail, done);
  }, 30000);
});
