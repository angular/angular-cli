/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect } from '@angular-devkit/architect';
import { browserBuild, createArchitect, host } from '../utils';


describe('Browser Builder subresource integrity', () => {
  const target = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('works', async () => {
    host.writeMultipleFiles({
      'src/my-js-file.js': `console.log(1); export const a = 2;`,
      'src/main.ts': `import { a } from './my-js-file'; console.log(a);`,
    });

    const overrides = { subresourceIntegrity: true };
    const { files } = await browserBuild(architect, host, target, overrides);
    expect(await files['index.html']).toMatch(/integrity="\w+-[A-Za-z0-9\/\+=]+"/);
  });
});
