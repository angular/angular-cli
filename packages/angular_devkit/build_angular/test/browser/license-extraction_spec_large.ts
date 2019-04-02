/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect } from '@angular-devkit/architect';
import { browserBuild, createArchitect, host } from '../utils';


describe('Browser Builder license extraction', () => {
  const target = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  // Ignored because license works when trying manually on a project, but doesn't work here.
  it('works', async () => {
    // TODO: make license extraction independent from optimization level.
    const overrides = { extractLicenses: true, optimization: true };

    const { files } = await browserBuild(architect, host, target, overrides);
    expect(await files['3rdpartylicenses.txt']).not.toBeUndefined();
  });
});
