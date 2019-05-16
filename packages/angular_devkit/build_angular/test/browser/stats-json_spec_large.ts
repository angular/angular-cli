/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Architect } from '@angular-devkit/architect';
import { browserBuild, createArchitect, host } from '../utils';


describe('Browser Builder stats json', () => {
  const target = { project: 'app', target: 'build' };
  let architect: Architect;

  beforeEach(async () => {
    await host.initialize().toPromise();
    architect = (await createArchitect(host.root())).architect;
  });
  afterEach(async () => host.restore().toPromise());

  it('works', async () => {
    const { files } = await browserBuild(architect, host, target, { statsJson: true });
    expect('stats.json' in files).toBe(true);
  });

  it('works with profile flag', async () => {
    const { files } = await browserBuild(architect, host, target, { statsJson: true });
    expect('stats.json' in files).toBe(true);
    const stats = JSON.parse(await files['stats.json']);
    expect(stats.chunks[0].modules[0].profile.building).toBeDefined();
  });
});
