/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Architect } from '@angular-devkit/architect';
import { browserBuild, createArchitect, host } from '../utils';


describe('Browser Builder tsconfig paths', () => {
  const target = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('works', async () => {
    host.replaceInFile('src/app/app.module.ts', './app.component', '@root/app/app.component');
    host.replaceInFile('tsconfig.json', /"baseUrl": ".\/",/, `
      "baseUrl": "./",
      "paths": {
        "@root/*": [
          "./src/*"
        ]
      },
    `);

    await browserBuild(architect, host, target);
  });

  it('works', async () => {
    host.writeMultipleFiles({
      'src/meaning-too.ts': 'export var meaning = 42;',
      'src/app/shared/meaning.ts': 'export var meaning = 42;',
      'src/app/shared/index.ts': `export * from './meaning'`,
    });
    host.replaceInFile('tsconfig.json', /"baseUrl": ".\/",/, `
      "baseUrl": "./",
      "paths": {
        "@shared": [
          "src/app/shared"
        ],
        "@shared/*": [
          "src/app/shared/*"
        ],
        "*": [
          "*",
          "src/app/shared/*"
        ]
      },
    `);
    host.appendToFile('src/app/app.component.ts', `
      import { meaning } from 'src/app/shared/meaning';
      import { meaning as meaning2 } from '@shared';
      import { meaning as meaning3 } from '@shared/meaning';
      import { meaning as meaning4 } from 'meaning';
      import { meaning as meaning5 } from 'src/meaning-too';

      // need to use imports otherwise they are ignored and
      // no error is outputted, even if baseUrl/paths don't work
      console.log(meaning)
      console.log(meaning2)
      console.log(meaning3)
      console.log(meaning4)
      console.log(meaning5)
    `);

    await browserBuild(architect, host, target);
  });
});
